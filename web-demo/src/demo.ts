// Web validation demo for the push-up-rpg core logic.
//
// This is NOT the shipping app. It reuses the app's REAL, unit-tested pure-TS
// logic (RepDetector, geometry, config) but swaps two platform pieces so it can
// run in a desktop browser against the computer's webcam:
//   - keypoint source: TensorFlow.js MoveNet (instead of the native tflite model)
//   - rendering:        an HTML <canvas> overlay (instead of react-native-skia)
//
// The point is to see the pose tracking + rep counting work on your computer
// camera without the Android toolchain.

import {RepDetector, DetectorEvent} from '../../app/src/pose/RepDetector';
import {DEFAULT_CONFIG} from '../../app/src/pose/config';
import {KP, Pose} from '../../app/src/pose/types';
import {angleDeg} from '../../app/src/pose/geometry';

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

// MoveNet returns the 17 keypoints in the same order as our KP map (indices
// 0..10 are nose..rightWrist), so a direct slice maps cleanly onto our Pose.
const UPPER_BODY_POINTS = 11;
const MIN_SCORE = 0.3;
const EDGES: Array<[number, number]> = [
  [KP.leftShoulder, KP.rightShoulder],
  [KP.leftShoulder, KP.leftElbow],
  [KP.leftElbow, KP.leftWrist],
  [KP.rightShoulder, KP.rightElbow],
  [KP.rightElbow, KP.rightWrist],
  [KP.nose, KP.leftShoulder],
  [KP.nose, KP.rightShoulder],
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

// Debug read-out of the current elbow angle, computed with the SAME geometry
// the detector uses — so you can watch the pipeline react even before a full rep.
function meanElbowAngleForDebug(pose: Pose): number | null {
  const arms = [
    {s: KP.leftShoulder, e: KP.leftElbow, w: KP.leftWrist},
    {s: KP.rightShoulder, e: KP.rightElbow, w: KP.rightWrist},
  ];
  const angles: number[] = [];
  for (const a of arms) {
    const s = pose[a.s];
    const e = pose[a.e];
    const w = pose[a.w];
    if (s.score < MIN_SCORE || e.score < MIN_SCORE || w.score < MIN_SCORE) continue;
    if (w.y <= s.y) continue; // wrist must be below shoulder (image y grows down)
    angles.push(angleDeg(s, e, w));
  }
  if (angles.length === 0) return null;
  return angles.reduce((sum, v) => sum + v, 0) / angles.length;
}

function draw(pose: Pose | null) {
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (!pose) return;

  ctx.lineWidth = Math.max(2, canvas.width * 0.008);
  ctx.strokeStyle = '#FFFFFF';
  for (const [a, b] of EDGES) {
    if (pose[a].score < MIN_SCORE || pose[b].score < MIN_SCORE) continue;
    ctx.beginPath();
    ctx.moveTo(pose[a].x, pose[a].y);
    ctx.lineTo(pose[b].x, pose[b].y);
    ctx.stroke();
  }
  ctx.fillStyle = '#F5A623';
  const r = Math.max(3, canvas.width * 0.012);
  for (let i = 0; i < UPPER_BODY_POINTS; i++) {
    if (pose[i].score < MIN_SCORE) continue;
    ctx.beginPath();
    ctx.arc(pose[i].x, pose[i].y, r, 0, Math.PI * 2);
    ctx.fill();
  }
}

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
      for (let i = 0; i < UPPER_BODY_POINTS; i++) {
        pose.push({x: kps[i].x, y: kps[i].y, score: kps[i].score ?? 0});
      }
      const events = detectorLogic.process(pose, performance.now());
      applyEvents(events);
    }
    draw(pose);

    counterEl.textContent = String(reps);
    hintEl.style.display = inPosition ? 'none' : 'block';
    const angle = pose ? meanElbowAngleForDebug(pose) : null;
    debugEl.textContent =
      'угол локтя: ' +
      (angle == null ? '—' : angle.toFixed(0) + '°') +
      '   |   в позиции: ' +
      (inPosition ? 'да' : 'нет') +
      '   |   пороги: сгиб<' +
      DEFAULT_CONFIG.elbowFlexedDeg +
      '° разгиб>' +
      DEFAULT_CONFIG.elbowExtendedDeg +
      '°';

    requestAnimationFrame(loop);
  }
  loop();
}

main().catch(err => {
  setStatus('Ошибка: ' + (err?.message ?? String(err)));
  // eslint-disable-next-line no-console
  console.error(err);
});
