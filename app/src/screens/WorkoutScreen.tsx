import React, {useCallback, useEffect, useRef, useState} from 'react';
import {
  Image,
  Linking,
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
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {Canvas, Circle, Line} from '@shopify/react-native-skia';
import {RepDetector} from '../pose/RepDetector';
import {DEFAULT_CONFIG} from '../pose/config';
import {Keypoint, KP, Pose} from '../pose/types';
import {Progression, currentMonster} from '../game/progression';
import {
  WorkoutState,
  newWorkout,
  onRep,
  totalTarget,
} from '../game/workout';
import {cardImageSource} from '../assets/cardImages';
import {playHit} from '../sound';

const MODEL_PATH = require('../assets/models/movenet_lightning_int8.tflite');

/** MoveNet Lightning input: 192x192 RGB (uint8), see model.d.ts inspection in task-7-report.md. */
const MODEL_INPUT_SIZE = 192;
/**
 * All 17 MoveNet keypoints — the detector needs hips/knees (11..16) for the
 * "horizontal body" (plank) gate and the vertical-descent rep signal, not just
 * the upper body.
 */
const KEYPOINT_COUNT = 17;
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

/** Base (no-inset) offset for the fixed exit button; see `useSafeAreaInsets` usage below. */
const EXIT_BUTTON_TOP = 24;

/** Skeleton edges: arms, head→shoulders, torso, and legs. */
const SKELETON_EDGES: ReadonlyArray<readonly [number, number]> = [
  [KP.leftShoulder, KP.rightShoulder],
  [KP.leftShoulder, KP.leftElbow],
  [KP.leftElbow, KP.leftWrist],
  [KP.rightShoulder, KP.rightElbow],
  [KP.rightElbow, KP.rightWrist],
  [KP.nose, KP.leftShoulder],
  [KP.nose, KP.rightShoulder],
  // torso + legs (for the plank / horizontal-position check)
  [KP.leftShoulder, KP.leftHip],
  [KP.rightShoulder, KP.rightHip],
  [KP.leftHip, KP.rightHip],
  [KP.leftHip, KP.leftKnee],
  [KP.leftKnee, KP.leftAnkle],
  [KP.rightHip, KP.rightKnee],
  [KP.rightKnee, KP.rightAnkle],
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
  for (let i = 0; i < KEYPOINT_COUNT; i++) {
    pose.push({
      y: kp[i * 3],
      x: kp[i * 3 + 1],
      score: kp[i * 3 + 2],
    });
  }
  return pose;
}

/**
 * MoveNet is fed a squashed (non-square-aspect) 192x192 crop of the frame
 * (see `downsampleFrameToModelInput`), so its normalized x/y outputs live in
 * different real-world pixel scales: x is a fraction of `frame.width`, y is a
 * fraction of `frame.height`, and those two are usually not equal on a phone
 * sensor. `angleDeg` (used by RepDetector) assumes an isotropic (equal-scale)
 * coordinate space to compute a true geometric angle — fed the squashed
 * coords directly, it would compute aspect/device-dependent elbow angles,
 * and `elbowFlexedDeg`/`elbowExtendedDeg` thresholds tuned on one device's
 * aspect ratio wouldn't port to another.
 *
 * Rescale y into "fractions of frame.width" units (same units as x) via
 * `yIso = yNorm * (frame.height / frame.width)`:
 *   xNorm = px / W, yNorm = py / H  =>  yNorm * (H / W) = py / W
 * Both axes are now expressed as a fraction of W, i.e. equal scale, so
 * distances/angles derived from these coordinates are aspect-correct and
 * portable across devices. Since H/W > 0, this only rescales magnitudes —
 * it doesn't flip sign, so the "wrist below shoulder" (y-ordering) check in
 * RepDetector.meanElbowAngle is unaffected in direction.
 *
 * This isotropic pose is what gets passed to the rep detector (`onPose`);
 * the overlay keeps using the raw normalized pose from
 * `moveNetOutputToPose` so the on-screen skeleton isn't distorted. The exact
 * `elbowFlexedDeg`/`elbowExtendedDeg` values still need on-device tuning,
 * but this makes them meaningful across aspect ratios/devices.
 */
function toIsotropicPose(pose: Pose, frame: Frame): Pose {
  'worklet';
  const yScale = frame.height / frame.width;
  const isoPose: Pose = [];
  for (let i = 0; i < pose.length; i++) {
    const point = pose[i];
    isoPose.push({x: point.x, y: point.y * yScale, score: point.score});
  }
  return isoPose;
}

function toCanvasXY(
  point: Keypoint,
  size: {width: number; height: number},
): {x: number; y: number} {
  const x = MIRROR_OVERLAY_X ? (1 - point.x) * size.width : point.x * size.width;
  const y = point.y * size.height;
  return {x, y};
}

// Offsets by the top safe-area inset so the button clears a notch/status bar
// on every WorkoutScreen branch (camera view, permission/device/model errors).
function ExitButton({onPress}: {onPress: () => void}) {
  const insets = useSafeAreaInsets();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Выйти из тренировки"
      style={[styles.exitButton, {top: EXIT_BUTTON_TOP + insets.top}]}
      onPress={onPress}>
      <Text style={styles.exitText}>✕</Text>
    </Pressable>
  );
}

function fmtTime(ms: number): string {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export function WorkoutScreen({
  progression,
  onDefeated,
  onExit,
}: {
  progression: Progression;
  onDefeated: () => void;
  onExit: () => void;
}) {
  const {hasPermission, requestPermission, canRequestPermission} =
    useCameraPermission();
  const insets = useSafeAreaInsets();
  const device = useCameraDevice('front');
  const plugin = useTensorflowModel(MODEL_PATH, []);
  const model = plugin.state === 'loaded' ? plugin.model : undefined;

  const monster = currentMonster(progression);
  const wkRef = useRef<WorkoutState | null>(null);
  if (monster && wkRef.current === null) {
    wkRef.current = newWorkout(monster);
  }
  const detectorRef = useRef<RepDetector | null>(null);
  if (detectorRef.current === null) {
    detectorRef.current = new RepDetector(DEFAULT_CONFIG);
  }
  const [reps, setReps] = useState(0);
  const [setIndex, setSetIndex] = useState(0);
  const [hp, setHp] = useState(monster ? totalTarget(monster) : 0);
  const [elapsed, setElapsed] = useState(0);
  const startRef = useRef(Date.now());
  const doneRef = useRef(false);

  useEffect(() => {
    const id = setInterval(() => setElapsed(Date.now() - startRef.current), 250);
    return () => clearInterval(id);
  }, []);

  // Runs on the JS thread: feeds each counted rep into the game automaton
  // (sets/HP/defeat) instead of the plain rep counter this screen used
  // before it became the battle screen.
  const onPose = useCallback(
    (pose: Pose) => {
      if (!monster || doneRef.current || wkRef.current === null) {
        return;
      }
      const events = detectorRef.current!.process(pose, Date.now());
      for (const e of events) {
        if (e !== 'repCounted') {
          continue;
        }
        const res = onRep(wkRef.current!, monster);
        wkRef.current = res.state;
        setReps(res.state.repsInSet);
        setSetIndex(res.state.setIndex);
        setHp(Math.max(0, totalTarget(monster) - res.state.totalReps));
        playHit();
        if (res.event === 'monsterDefeated') {
          doneRef.current = true;
          onDefeated();
        }
      }
    },
    [monster, onDefeated],
  );

  const [overlayPose, setOverlayPose] = useState<Pose>([]);
  const [canvasSize, setCanvasSize] = useState({width: 0, height: 0});
  const lastInferenceAt = useSharedValue(0);

  useEffect(() => {
    // Only auto-prompt while the OS is still willing to show its native
    // dialog. Once the user has permanently denied it, `canRequestPermission`
    // is false and re-calling `requestPermission()` would be a silent no-op —
    // the permission-denied branch below guides the user to Settings instead.
    if (!hasPermission && canRequestPermission) {
      requestPermission();
    }
  }, [hasPermission, canRequestPermission, requestPermission]);

  // Runs on the JS thread (hopped to via runOnJS from the frame processor):
  // feeds the rep counter and updates the Skia overlay's React state.
  // `overlayPose` is the raw normalized pose (undistorted screen mapping);
  // `detectorPose` is the aspect-corrected (isotropic) pose — see
  // `toIsotropicPose` for why the two must differ.
  const handlePoseFromWorklet = useCallback(
    (overlayPose: Pose, detectorPose: Pose) => {
      onPose(detectorPose);
      setOverlayPose(overlayPose);
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
        const detectorPose = toIsotropicPose(pose, frame);

        runOnJS(handlePoseFromWorklet)(pose, detectorPose);
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
    // `canRequestPermission` is false once the OS considers the permission
    // permanently denied (e.g. user tapped "Don't ask again", or denied it
    // before on iOS) — at that point `requestPermission()` won't show a
    // dialog anymore, so we send the user to system Settings instead.
    return (
      <View style={styles.root}>
        {canRequestPermission ? (
          <>
            <Text style={styles.message}>
              Приложению нужен доступ к камере, чтобы считать отжимания.
            </Text>
            <Pressable
              accessibilityRole="button"
              style={styles.permissionButton}
              onPress={requestPermission}>
              <Text style={styles.permissionButtonText}>Разрешить</Text>
            </Pressable>
          </>
        ) : (
          <>
            <Text style={styles.message}>
              Доступ к камере отключён в настройках. Разрешите доступ к
              камере в настройках приложения, чтобы считать отжимания.
            </Text>
            <Pressable
              accessibilityRole="button"
              style={styles.permissionButton}
              onPress={() => {
                Linking.openSettings();
              }}>
              <Text style={styles.permissionButtonText}>
                Открыть настройки
              </Text>
            </Pressable>
          </>
        )}
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
      {/* `resizeMode="cover"` is vision-camera's default; set explicitly
          because the Skia overlay below maps normalized (0..1) keypoints to
          canvas pixels with a plain linear scale, which is only pixel-exact
          against the *content* if the preview isn't letterboxed (i.e. crops
          to cover rather than adding bars via "contain"). Exact alignment
          (cropping offsets, aspect mismatches) is still an on-device tuning
          item. */}
      <Camera
        style={StyleSheet.absoluteFill}
        device={device}
        isActive={true}
        outputs={[frameOutput]}
        resizeMode="cover"
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

      {monster && (
        <>
          {/* TIME — слева сверху */}
          <View style={[battle.timeBox, {top: 12 + insets.top}]}>
            <Text style={battle.timeLbl}>TIME</Text>
            <Text style={battle.time}>{fmtTime(elapsed)}</Text>
          </View>
          {/* Выход — справа сверху */}
          <Pressable style={[battle.exit, {top: 12 + insets.top}]} onPress={onExit}>
            <Text style={battle.exitText}>✕</Text>
          </Pressable>
          {/* Карточка монстра — центр сверху */}
          <View style={[battle.card, {top: 10 + insets.top}]} pointerEvents="none">
            {cardImageSource(monster.cardImage) ? (
              <Image
                source={cardImageSource(monster.cardImage)!}
                style={battle.cardImg}
                resizeMode="cover"
              />
            ) : null}
            <Text style={battle.cardName}>{monster.name}</Text>
          </View>
          {/* HP-бар */}
          <View style={[battle.hpWrap, {top: 184 + insets.top}]} pointerEvents="none">
            <View
              style={[
                battle.hpFill,
                {width: `${(hp / totalTarget(monster)) * 100}%`},
              ]}
            />
            <Text style={battle.hpText}>
              {hp} / {totalTarget(monster)} HP
            </Text>
          </View>
          {monster.sets > 1 && (
            <Text style={[battle.setText, {top: 208 + insets.top}]} pointerEvents="none">
              Сет {setIndex + 1}/{monster.sets} · цель {monster.repsPerSet}
            </Text>
          )}
          {/* Золотой счётчик — снизу центр */}
          <View style={battle.counter} pointerEvents="none">
            <Text style={battle.counterText}>{reps}</Text>
          </View>
        </>
      )}
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
  exitButton: {
    // top is applied inline as EXIT_BUTTON_TOP + safe-area inset.
    position: 'absolute',
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

const battle = StyleSheet.create({
  timeBox: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: 'rgba(11,17,31,0.85)',
    borderColor: '#3a4a67',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignItems: 'center',
  },
  timeLbl: {color: '#9aa4b2', fontSize: 9, letterSpacing: 2},
  time: {color: '#fff', fontSize: 18, fontWeight: '800'},
  exit: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(11,17,31,0.85)',
    borderColor: '#3a4a67',
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  exitText: {color: '#fff', fontSize: 18},
  card: {
    position: 'absolute',
    top: 10,
    alignSelf: 'center',
    width: 120,
    backgroundColor: 'rgba(11,17,31,0.85)',
    borderColor: '#F5A623',
    borderWidth: 1,
    borderRadius: 10,
    padding: 6,
    alignItems: 'center',
  },
  cardImg: {width: 104, height: 104, borderRadius: 6},
  cardName: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '800',
    marginTop: 3,
    textAlign: 'center',
  },
  hpWrap: {
    position: 'absolute',
    top: 184,
    alignSelf: 'center',
    width: 200,
    height: 20,
    backgroundColor: '#3a0f0f',
    borderRadius: 4,
    borderColor: '#000',
    borderWidth: 1,
    overflow: 'hidden',
    justifyContent: 'center',
  },
  hpFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: '#d64545',
  },
  hpText: {color: '#fff', fontSize: 12, fontWeight: '800', textAlign: 'center'},
  setText: {
    position: 'absolute',
    top: 208,
    alignSelf: 'center',
    color: '#F5A623',
    fontSize: 13,
    fontWeight: '700',
  },
  counter: {
    position: 'absolute',
    bottom: 24,
    alignSelf: 'center',
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#F5A623',
    alignItems: 'center',
    justifyContent: 'center',
  },
  counterText: {color: '#101828', fontSize: 46, fontWeight: '900'},
});
