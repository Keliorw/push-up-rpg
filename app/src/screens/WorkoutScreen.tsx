import React, {useCallback, useEffect, useState} from 'react';
import {
  LayoutChangeEvent,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  Camera,
  useCameraDevice,
  useCameraPermission,
  useFrameOutput,
  type Frame,
} from 'react-native-vision-camera';
import {useTensorflowModel} from 'react-native-fast-tflite';
import {runOnJS} from 'react-native-worklets';
import {useSharedValue} from 'react-native-reanimated';
import {Canvas, Circle, Line} from '@shopify/react-native-skia';
import {useWorkoutSession} from '../session/useWorkoutSession';
import {Keypoint, Pose} from '../pose/types';

const MODEL_PATH = require('../assets/models/movenet_lightning_int8.tflite');

/** MoveNet Lightning input: 192x192 RGB (uint8), see model.d.ts inspection in task-7-report.md. */
const MODEL_INPUT_SIZE = 192;
/** Only the upper-body keypoints (0..10) are meaningful for push-up counting. */
const UPPER_BODY_KEYPOINT_COUNT = 11;
/** Throttle inference — frame.toArrayBuffer()-equivalent (getPixelBuffer) is the expensive step. */
const TARGET_FPS = 15;
const FRAME_INTERVAL_MS = 1000 / TARGET_FPS;
/** Keypoints/edges below this confidence are not drawn and not trusted. */
const MIN_SCORE = 0.3;

/**
 * The front camera preview is mirrored (like a mirror) on most devices, but the
 * raw Frame pixel buffer we run the model on is NOT physically mirrored — it's
 * the sensor's native orientation. So the normalized (x,y) keypoints we compute
 * are in "unmirrored" space and must be flipped on X to line up with what the
 * user sees in the mirrored preview.
 * This is a starting assumption; exact behaviour depends on the device/OS
 * mirroring pipeline and must be confirmed on-device (see task-7-report.md).
 */
const MIRROR_OVERLAY_X = true;

/** Skeleton edges: shoulders, left arm, right arm, head→shoulders. */
const SKELETON_EDGES: ReadonlyArray<readonly [number, number]> = [
  [5, 6],
  [5, 7],
  [7, 9],
  [6, 8],
  [8, 10],
  [0, 5],
  [0, 6],
];

/**
 * Downsamples a camera Frame to a 192x192x3 (RGB, uint8) buffer via
 * nearest-neighbor sampling, ready to feed into the MoveNet model.
 *
 * Reads the frame's actual `pixelFormat` to pick the correct channel order and
 * bytes-per-pixel, and uses `bytesPerRow` (not `width * bytesPerPixel`) for the
 * row stride, since native camera buffers are commonly padded/aligned.
 */
function downsampleFrameToModelInput(frame: Frame): Uint8Array {
  'worklet';
  const {width, height, bytesPerRow, pixelFormat} = frame;
  const src = new Uint8Array(frame.getPixelBuffer());

  // TargetVideoPixelFormat 'rgb' resolves to a platform-defined concrete
  // VideoPixelFormat — commonly 4-byte BGRA or RGBA, but a tightly-packed
  // 3-byte RGB is also possible. Branch on the frame's actual pixelFormat so
  // this is correct regardless of platform.
  let bytesPerPixel = 3;
  let rOffset = 0;
  let gOffset = 1;
  let bOffset = 2;
  if (pixelFormat === 'rgb-bgra-8-bit') {
    bytesPerPixel = 4;
    rOffset = 2;
    gOffset = 1;
    bOffset = 0;
  } else if (pixelFormat === 'rgb-rgba-8-bit') {
    bytesPerPixel = 4;
    rOffset = 0;
    gOffset = 1;
    bOffset = 2;
  }

  const out = new Uint8Array(MODEL_INPUT_SIZE * MODEL_INPUT_SIZE * 3);
  for (let oy = 0; oy < MODEL_INPUT_SIZE; oy++) {
    const sy = Math.floor((oy * height) / MODEL_INPUT_SIZE);
    const rowStart = sy * bytesPerRow;
    for (let ox = 0; ox < MODEL_INPUT_SIZE; ox++) {
      const sx = Math.floor((ox * width) / MODEL_INPUT_SIZE);
      const si = rowStart + sx * bytesPerPixel;
      const di = (oy * MODEL_INPUT_SIZE + ox) * 3;
      out[di] = src[si + rOffset];
      out[di + 1] = src[si + gOffset];
      out[di + 2] = src[si + bOffset];
    }
  }
  return out;
}

/** MoveNet SinglePose output is 17 (y, x, score) triples, normalized 0..1. */
function moveNetOutputToPose(kp: Float32Array): Pose {
  'worklet';
  const pose: Pose = [];
  for (let i = 0; i < UPPER_BODY_KEYPOINT_COUNT; i++) {
    pose.push({
      y: kp[i * 3],
      x: kp[i * 3 + 1],
      score: kp[i * 3 + 2],
    });
  }
  return pose;
}

function toCanvasXY(
  point: Keypoint,
  size: {width: number; height: number},
): {x: number; y: number} {
  const x = MIRROR_OVERLAY_X ? (1 - point.x) * size.width : point.x * size.width;
  const y = point.y * size.height;
  return {x, y};
}

function ExitButton({onPress}: {onPress: () => void}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Выйти из тренировки"
      style={styles.exitButton}
      onPress={onPress}>
      <Text style={styles.exitText}>✕</Text>
    </Pressable>
  );
}

export function WorkoutScreen({onExit}: {onExit: () => void}) {
  const {hasPermission, requestPermission} = useCameraPermission();
  const device = useCameraDevice('front');
  const {reps, inPosition, onPose} = useWorkoutSession();
  const plugin = useTensorflowModel(MODEL_PATH, []);
  const model = plugin.state === 'loaded' ? plugin.model : undefined;

  const [overlayPose, setOverlayPose] = useState<Pose>([]);
  const [canvasSize, setCanvasSize] = useState({width: 0, height: 0});
  const lastInferenceAt = useSharedValue(0);

  useEffect(() => {
    if (!hasPermission) {
      requestPermission();
    }
  }, [hasPermission, requestPermission]);

  // Runs on the JS thread (hopped to via runOnJS from the frame processor):
  // feeds the rep counter and updates the Skia overlay's React state.
  const handlePoseFromWorklet = useCallback(
    (pose: Pose) => {
      onPose(pose);
      setOverlayPose(pose);
    },
    [onPose],
  );

  // Core v5 frame processor. NOT a Skia frame processor — plain pixel buffer
  // -> nearest-neighbor downsample -> tflite -> runOnJS to React state.
  const onFrame = useCallback(
    (frame: Frame) => {
      'worklet';
      try {
        if (model == null) {
          return;
        }
        const now = Date.now();
        if (now - lastInferenceAt.value < FRAME_INTERVAL_MS) {
          return;
        }
        lastInferenceAt.value = now;

        if (!frame.hasPixelBuffer) {
          return;
        }

        const input = downsampleFrameToModelInput(frame);
        // `Uint8Array#buffer` is typed as `ArrayBufferLike` (to also allow
        // SharedArrayBuffer), but a freshly-allocated `new Uint8Array(n)`
        // always backs onto a plain ArrayBuffer.
        const outputs = model.runSync([input.buffer as ArrayBuffer]);
        const kp = new Float32Array(outputs[0]);
        const pose = moveNetOutputToPose(kp);

        runOnJS(handlePoseFromWorklet)(pose);
      } finally {
        frame.dispose();
      }
    },
    [model, handlePoseFromWorklet, lastInferenceAt],
  );

  const frameOutput = useFrameOutput({
    pixelFormat: 'rgb',
    onFrame,
  });

  const handleOverlayLayout = useCallback((event: LayoutChangeEvent) => {
    const {width, height} = event.nativeEvent.layout;
    setCanvasSize({width, height});
  }, []);

  if (!hasPermission) {
    return (
      <View style={styles.root}>
        <Text style={styles.message}>
          Приложению нужен доступ к камере, чтобы считать отжимания.
        </Text>
        <Pressable
          accessibilityRole="button"
          style={styles.permissionButton}
          onPress={requestPermission}>
          <Text style={styles.permissionButtonText}>Разрешить</Text>
        </Pressable>
        <ExitButton onPress={onExit} />
      </View>
    );
  }

  if (device == null) {
    return (
      <View style={styles.root}>
        <Text style={styles.message}>Фронтальная камера не найдена</Text>
        <ExitButton onPress={onExit} />
      </View>
    );
  }

  if (plugin.state === 'error') {
    return (
      <View style={styles.root}>
        <Text style={styles.message}>
          Не удалось загрузить модель распознавания позы:{'\n'}
          {plugin.error.message}
        </Text>
        <ExitButton onPress={onExit} />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <Camera
        style={StyleSheet.absoluteFill}
        device={device}
        isActive={true}
        outputs={[frameOutput]}
      />

      <View
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
        onLayout={handleOverlayLayout}>
        <Canvas style={StyleSheet.absoluteFill}>
          {SKELETON_EDGES.map(([a, b]) => {
            const pa = overlayPose[a];
            const pb = overlayPose[b];
            if (pa == null || pb == null || pa.score < MIN_SCORE || pb.score < MIN_SCORE) {
              return null;
            }
            return (
              <Line
                key={`edge-${a}-${b}`}
                p1={toCanvasXY(pa, canvasSize)}
                p2={toCanvasXY(pb, canvasSize)}
                color="#FFFFFF"
                style="stroke"
                strokeWidth={canvasSize.width * 0.008}
                strokeCap="round"
              />
            );
          })}
          {overlayPose.map((point, index) => {
            if (point.score < MIN_SCORE) {
              return null;
            }
            const {x, y} = toCanvasXY(point, canvasSize);
            return (
              <Circle
                key={`point-${index}`}
                cx={x}
                cy={y}
                r={canvasSize.width * 0.012}
                color="#F5A623"
              />
            );
          })}
        </Canvas>
      </View>

      <View
        style={[StyleSheet.absoluteFill, styles.hudRoot]}
        pointerEvents="none">
        <Text style={styles.counter}>{reps}</Text>
        {!inPosition && (
          <View style={styles.hintBox}>
            <Text style={styles.hintText}>Займите упор лёжа</Text>
          </View>
        )}
      </View>

      <ExitButton onPress={onExit} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#101828',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
    padding: 24,
  },
  message: {
    color: '#FFFFFF',
    fontSize: 18,
    textAlign: 'center',
  },
  permissionButton: {
    backgroundColor: '#F5A623',
    paddingHorizontal: 48,
    paddingVertical: 16,
    borderRadius: 32,
  },
  permissionButtonText: {
    color: '#101828',
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: 1,
  },
  hudRoot: {
    alignItems: 'center',
    paddingTop: 64,
  },
  counter: {
    color: '#F5A623',
    fontSize: 96,
    fontWeight: '900',
    textShadowColor: 'rgba(0, 0, 0, 0.6)',
    textShadowOffset: {width: 0, height: 2},
    textShadowRadius: 8,
  },
  hintBox: {
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 16,
    backgroundColor: 'rgba(16, 24, 40, 0.72)',
  },
  hintText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  exitButton: {
    position: 'absolute',
    top: 24,
    right: 24,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(16, 24, 40, 0.72)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  exitText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
  },
});
