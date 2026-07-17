// Калибровочная страничка приседаний. НЕ боевое приложение: переиспользует
// настоящий SquatDetector из app/src/pose/, а keypoints берёт из TF.js MoveNet.
//
// Два источника кадров:
//   - камера (селфи, сцена зеркалится);
//   - видеофайл — пользователь записывает приседания, файл гоняется через
//     детектор многократно (с перемоткой и паузой) при калибровке порогов.
//
// Время для детектора: в файловом режиме — таймлайн видео (video.currentTime),
// чтобы перемотка/повтор были детерминированными; с камеры — performance.now().

import {DetectorEvent} from '../../app/src/pose/RepDetector';
import {DEFAULT_SQUAT_CONFIG} from '../../app/src/pose/squat-config';
import {SquatDetector} from '../../app/src/pose/SquatDetector';
import {KP, Pose} from '../../app/src/pose/types';

declare const tf: any;
declare const poseDetection: any;

const video = document.getElementById('video') as HTMLVideoElement;
const stage = document.getElementById('stage')!;
const canvas = document.getElementById('overlay') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;
const counterEl = document.getElementById('counter')!;
const hintEl = document.getElementById('hint')!;
const debugEl = document.getElementById('debug')!;
const statusEl = document.getElementById('status')!;
const btnCamera = document.getElementById('btn-camera') as HTMLButtonElement;
const btnFile = document.getElementById('btn-file') as HTMLButtonElement;
const fileInput = document.getElementById('file-input') as HTMLInputElement;
const btnReset = document.getElementById('btn-reset') as HTMLButtonElement;
const btnLog = document.getElementById('btn-log') as HTMLButtonElement;

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

let detectorLogic = new SquatDetector(DEFAULT_SQUAT_CONFIG);
let reps = 0;
let inPosition = false;
let mode: 'camera' | 'file' | null = null;
let stream: MediaStream | null = null;

function setStatus(text: string) {
  statusEl.textContent = text;
}

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
    /* звук не критичен */
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

// Скользящие min/max ключевых сигналов: несколько реальных приседаний
// показывают фактический диапазон — по нему калибруются пороги.
interface Range {
  min: number;
  max: number;
}
const ranges: Record<'gap' | 'knee' | 'descent' | 'upright', Range> = {
  gap: {min: Infinity, max: -Infinity},
  knee: {min: Infinity, max: -Infinity},
  descent: {min: Infinity, max: -Infinity},
  upright: {min: Infinity, max: -Infinity},
};
function track(key: keyof typeof ranges, v: number | null) {
  if (v == null) return;
  ranges[key].min = Math.min(ranges[key].min, v);
  ranges[key].max = Math.max(ranges[key].max, v);
}
function rangeStr(r: Range, digits: number): string {
  if (r.min === Infinity) return '—';
  return r.min.toFixed(digits) + '…' + r.max.toFixed(digits);
}

// Полный лог сигналов по кадрам — выгружается в JSON для анализа порогов.
interface LogSample {
  t: number;
  gap: number | null;
  upright: number | null;
  knee: number | null;
  descent: number | null;
  phase: string;
  inPosition: boolean;
  reps: number;
}
const MAX_LOG = 50_000;
let signalLog: LogSample[] = [];

function resetAll() {
  detectorLogic = new SquatDetector(DEFAULT_SQUAT_CONFIG);
  reps = 0;
  inPosition = false;
  signalLog = [];
  for (const k of Object.keys(ranges) as Array<keyof typeof ranges>) {
    ranges[k].min = Infinity;
    ranges[k].max = -Infinity;
  }
}

btnReset.onclick = resetAll;

btnLog.onclick = () => {
  const blob = new Blob(
    [JSON.stringify({config: DEFAULT_SQUAT_CONFIG, samples: signalLog})],
    {type: 'application/json'},
  );
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'squat-signals.json';
  a.click();
  URL.revokeObjectURL(a.href);
};

function stopStream() {
  if (stream) {
    stream.getTracks().forEach(t => t.stop());
    stream = null;
  }
}

btnCamera.onclick = async () => {
  try {
    setStatus('Запрашиваю камеру…');
    stopStream();
    video.removeAttribute('src');
    video.controls = false;
    stream = await navigator.mediaDevices.getUserMedia({
      video: {facingMode: 'user', width: 640, height: 480},
      audio: false,
    });
    video.srcObject = stream;
    stage.classList.add('mirrored');
    await video.play();
    mode = 'camera';
    resetAll();
    setStatus('Камера активна — встань в полный рост');
  } catch (err: any) {
    setStatus('Ошибка камеры: ' + (err?.message ?? String(err)));
  }
};

btnFile.onclick = () => fileInput.click();
fileInput.onchange = () => {
  const file = fileInput.files && fileInput.files[0];
  if (!file) return;
  stopStream();
  video.srcObject = null;
  video.src = URL.createObjectURL(file);
  video.controls = true;
  stage.classList.remove('mirrored');
  mode = 'file';
  resetAll();
  video.play().catch(() => {});
  setStatus(`Видео: ${file.name} (перемотка и пауза работают)`);
};

// Проигрывание файла с начала = свежий прогон детектора.
video.addEventListener('play', () => {
  if (mode === 'file' && video.currentTime < 0.05) resetAll();
});

async function main() {
  setStatus('Загружаю модель MoveNet…');
  await tf.setBackend('webgl');
  await tf.ready();
  const detector = await poseDetection.createDetector(
    poseDetection.SupportedModels.MoveNet,
    {modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING},
  );
  setStatus('Модель готова. Выбери источник: камера или видеофайл.');

  let lastLoggedT = -1;
  async function loop() {
    if (mode === null || video.readyState < 2 || video.videoWidth === 0) {
      requestAnimationFrame(loop);
      return;
    }
    const tMs = mode === 'file' ? video.currentTime * 1000 : performance.now();
    const poses = await detector.estimatePoses(video, {flipHorizontal: false});
    let pose: Pose | null = null;
    if (poses && poses[0]) {
      const kps = poses[0].keypoints;
      pose = [];
      for (let i = 0; i < KEYPOINT_COUNT; i++) {
        pose.push({x: kps[i].x, y: kps[i].y, score: kps[i].score ?? 0});
      }
      applyEvents(detectorLogic.process(pose, tMs));
    }
    draw(pose);

    counterEl.textContent = String(reps);
    hintEl.style.display = inPosition ? 'none' : 'block';

    const dbg = detectorLogic.debug;
    track('gap', dbg.gap);
    track('knee', dbg.kneeAngle);
    track('descent', dbg.hipDescent);
    track('upright', dbg.torsoUprightFrac);
    if (pose && tMs !== lastLoggedT && signalLog.length < MAX_LOG) {
      lastLoggedT = tMs;
      signalLog.push({
        t: Math.round(tMs),
        gap: dbg.gap,
        upright: dbg.torsoUprightFrac,
        knee: dbg.kneeAngle,
        descent: dbg.hipDescent,
        phase: dbg.phase,
        inPosition: dbg.inPosition,
        reps,
      });
    }

    const cfg = DEFAULT_SQUAT_CONFIG;
    const posColor = dbg.inPosition ? '#5ad469' : '#ff6b6b';
    debugEl.innerHTML =
      '<div>в позиции: <b style="color:' + posColor + '">' +
      (dbg.inPosition ? 'ДА' : 'НЕТ') + '</b>' +
      ' &nbsp; фаза: <b>' + dbg.phase + '</b>' +
      ' &nbsp; точек: <b>' + dbg.visibleKeypoints + '/17</b>' +
      ' &nbsp; формат тела: <b>' + fmt(dbg.bodyAspect, 1) + '</b></div>' +
      '<div>зазор таз↔колени: <b>' + fmt(dbg.gap, 2) + '</b>' +
      ' &nbsp; диапазон: <b>' + rangeStr(ranges.gap, 2) + '</b>' +
      ' &nbsp; (вниз&le;' + cfg.gapDownFrac + ' вверх&ge;' + cfg.gapUpFrac + ')</div>' +
      '<div>вертикальность торса: <b>' + fmt(dbg.torsoUprightFrac, 2) + '</b>' +
      ' &nbsp; диапазон: <b>' + rangeStr(ranges.upright, 2) + '</b>' +
      ' &nbsp; (гейт&ge;' + cfg.torsoUprightMinFrac + ')</div>' +
      '<div>угол колена: <b>' + fmt(dbg.kneeAngle, 0, '°') + '</b>' +
      ' &nbsp; диапазон: <b>' + rangeStr(ranges.knee, 0) + '°</b>' +
      ' &nbsp; просадка таза: <b>' + fmt(dbg.hipDescent, 2) + '</b>' +
      ' &nbsp; диапазон: <b>' + rangeStr(ranges.descent, 2) + '</b></div>' +
      '<div style="opacity:.6;font-size:.7em">повторов: ' + reps +
      ' · лог: ' + signalLog.length + ' кадров</div>';

    requestAnimationFrame(loop);
  }
  loop();
}

main().catch(err => {
  setStatus('Ошибка: ' + (err?.message ?? String(err)));
  // eslint-disable-next-line no-console
  console.error(err);
});
