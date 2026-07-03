// Web validation demo for the push-up-rpg core logic.
//
// This is NOT the shipping app. It reuses the app's REAL, unit-tested pure-TS
// logic (RepDetector, config) but swaps two platform pieces so it can run in a
// desktop browser against the computer's webcam:
//   - keypoint source: TensorFlow.js MoveNet (instead of the native tflite model)
//   - rendering:        an HTML <canvas> overlay (instead of react-native-skia)
//
// The point is to see the pose tracking + rep counting work on your computer
// camera without the Android toolchain, and to expose the detector's live
// signals so thresholds in ../app/src/pose/config.ts can be calibrated.

import {RepDetector, DetectorEvent} from '../../app/src/pose/RepDetector';
import {DEFAULT_CONFIG} from '../../app/src/pose/config';
import {KP, Pose} from '../../app/src/pose/types';

// tf + poseDetection are loaded as globals via <script> tags in index.html.
declare const tf: any;
declare const poseDetection: any;

const video = document.getElementById('video') as HTMLVideoElement;
const canvas = document.getElementById('overlay') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;
const counterEl = document.getElementById('counter')!;
const hintEl = document.getElementById('hint')!;
const debugEl = document.getElementById('debug')!;
const statusEl = document.getElementById('status')!;

// MoveNet returns the 17 keypoints in the same order as our KP map, so a direct
// copy maps cleanly onto our Pose (the detector needs hips/knees for the plank
// gate + descent signal, so we pass all 17).
const KEYPOINT_COUNT = 17;
const MIN_SCORE = 0.3;
const EDGES: Array<[number, number]> = [
  [KP.leftShoulder, KP.rightShoulder],
  [KP.leftShoulder, KP.leftElbow],
  [KP.leftElbow, KP.leftWrist],
  [KP.rightShoulder, KP.rightElbow],
  [KP.rightElbow, KP.rightWrist],
  [KP.nose, KP.leftShoulder],
  [KP.nose, KP.rightShoulder],
  [KP.leftShoulder, KP.leftHip],
  [KP.rightShoulder, KP.rightHip],
  [KP.leftHip, KP.rightHip],
  [KP.leftHip, KP.leftKnee],
  [KP.leftKnee, KP.leftAnkle],
  [KP.rightHip, KP.rightKnee],
  [KP.rightKnee, KP.rightAnkle],
];

const detectorLogic = new RepDetector(DEFAULT_CONFIG);
let reps = 0;
let inPosition = false;

function setStatus(text: string) {
  statusEl.textContent = text;
}

// Short beep via WebAudio (mirrors the app's beep-on-rep).
let audioCtx: AudioContext | null = null;
function beep() {
  try {
    audioCtx = audioCtx ?? new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.frequency.value = 880;
    gain.gain.value = 0.2;
    osc.connect(gain).connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.12);
  } catch {
    /* audio is non-critical */
  }
}

function applyEvents(events: DetectorEvent[]) {
  for (const e of events) {
    if (e === 'repCounted') {
      reps += 1;
      beep();
    } else if (e === 'positionAcquired') {
      inPosition = true;
    } else if (e === 'positionLost') {
      inPosition = false;
    }
  }
}

function draw(pose: Pose | null) {
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (!pose) return;

  ctx.lineWidth = Math.max(2, canvas.width * 0.008);
  ctx.strokeStyle = '#FFFFFF';
  for (const [a, b] of EDGES) {
    if (!pose[a] || !pose[b]) continue;
    if (pose[a].score < MIN_SCORE || pose[b].score < MIN_SCORE) continue;
    ctx.beginPath();
    ctx.moveTo(pose[a].x, pose[a].y);
    ctx.lineTo(pose[b].x, pose[b].y);
    ctx.stroke();
  }
  ctx.fillStyle = '#F5A623';
  const r = Math.max(3, canvas.width * 0.012);
  for (let i = 0; i < KEYPOINT_COUNT; i++) {
    if (!pose[i] || pose[i].score < MIN_SCORE) continue;
    ctx.beginPath();
    ctx.arc(pose[i].x, pose[i].y, r, 0, Math.PI * 2);
    ctx.fill();
  }
}

function fmt(n: number | null, digits = 0, suffix = ''): string {
  return n == null ? '—' : n.toFixed(digits) + suffix;
}

// Rolling min/max of the key signals, so a few real push-ups reveal the actual
// range and we can calibrate thresholds. Reset by clicking anywhere.
let descentMin = Infinity;
let descentMax = -Infinity;
let elbowMin = Infinity;
let elbowMax = -Infinity;
function trackRanges(descent: number | null, elbow: number | null) {
  if (descent != null) {
    descentMin = Math.min(descentMin, descent);
    descentMax = Math.max(descentMax, descent);
  }
  if (elbow != null) {
    elbowMin = Math.min(elbowMin, elbow);
    elbowMax = Math.max(elbowMax, elbow);
  }
}
function rangeStr(min: number, max: number, digits: number): string {
  if (min === Infinity) return '—';
  return min.toFixed(digits) + '…' + max.toFixed(digits);
}
document.body.addEventListener('click', () => {
  descentMin = Infinity;
  descentMax = -Infinity;
  elbowMin = Infinity;
  elbowMax = -Infinity;
  reps = 0;
});

async function main() {
  setStatus('Запрашиваю камеру…');
  const stream = await navigator.mediaDevices.getUserMedia({
    video: {facingMode: 'user', width: 640, height: 480},
    audio: false,
  });
  video.srcObject = stream;
  await video.play();

  setStatus('Загружаю модель MoveNet…');
  await tf.setBackend('webgl');
  await tf.ready();
  const detector = await poseDetection.createDetector(
    poseDetection.SupportedModels.MoveNet,
    {modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING},
  );
  setStatus('Готово — двигайтесь перед камерой');

  async function loop() {
    const poses = await detector.estimatePoses(video, {flipHorizontal: false});
    let pose: Pose | null = null;
    if (poses && poses[0]) {
      const kps = poses[0].keypoints;
      pose = [];
      for (let i = 0; i < KEYPOINT_COUNT; i++) {
        pose.push({x: kps[i].x, y: kps[i].y, score: kps[i].score ?? 0});
      }
      applyEvents(detectorLogic.process(pose, performance.now()));
    }
    draw(pose);

    counterEl.textContent = String(reps);
    hintEl.style.display = inPosition ? 'none' : 'block';

    // Live detector signals — use these to calibrate config.ts thresholds.
    const dbg = detectorLogic.debug;
    trackRanges(dbg.descent, dbg.elbowAngle);
    const posColor = dbg.inPosition ? '#5ad469' : '#ff6b6b';
    debugEl.innerHTML =
      '<div>гейт: <b>' + dbg.gateMode + '</b>' +
      ' &nbsp; в позиции: <b style="color:' + posColor + '">' +
      (dbg.inPosition ? 'ДА' : 'НЕТ') + '</b>' +
      ' &nbsp; фаза: <b>' + dbg.phase + '</b>' +
      ' &nbsp; корпус: <b>' + fmt(dbg.torsoAngle, 0, '°') + '</b>' +
      ' &nbsp; формат тела: <b>' + fmt(dbg.bodyAspect, 1) + '</b>' +
      ' (планка&lt;' + DEFAULT_CONFIG.maxBodyAspect + ')' +
      ' &nbsp; точек: <b>' + dbg.visibleKeypoints + '/17</b></div>' +
      '<div>проседание: <b>' + fmt(dbg.descent, 2) + '</b>' +
      ' &nbsp; макс за подход: <b>' + rangeStr(descentMin, descentMax, 2) + '</b>' +
      ' &nbsp; (порог ' + DEFAULT_CONFIG.descentDownFrac + ')</div>' +
      '<div>локоть: <b>' + fmt(dbg.elbowAngle, 0, '°') + '</b>' +
      ' &nbsp; диапазон: <b>' + rangeStr(elbowMin, elbowMax, 0) + '°</b>' +
      ' &nbsp; (сгиб&lt;' + DEFAULT_CONFIG.elbowFlexedDeg +
      ' разгиб&gt;' + DEFAULT_CONFIG.elbowExtendedDeg + ')</div>' +
      '<div style="opacity:.6;font-size:.7em">клик — сбросить диапазоны и счётчик</div>';

    requestAnimationFrame(loop);
  }
  loop();
}

main().catch(err => {
  setStatus('Ошибка: ' + (err?.message ?? String(err)));
  // eslint-disable-next-line no-console
  console.error(err);
});
