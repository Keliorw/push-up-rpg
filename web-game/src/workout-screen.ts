import {DEFAULT_CONFIG} from '../../app/src/pose/config';
import {RepDetector} from '../../app/src/pose/RepDetector';
import {KP, Pose} from '../../app/src/pose/types';
import {currentMonster} from '../../app/src/game/progression';
import {
  WorkoutState,
  newWorkout,
  onRep,
  totalTarget,
} from '../../app/src/game/workout';
import type {App} from './main';

declare const tf: any;
declare const poseDetection: any;

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

export function startWorkout(app: App): void {
  const found = currentMonster(app.progression);
  if (!found) return;
  const monster = found;

  const video = document.getElementById('wk-video') as HTMLVideoElement;
  const canvas = document.getElementById('wk-overlay') as HTMLCanvasElement;
  const ctx = canvas.getContext('2d')!;
  const counterEl = document.getElementById('wk-counter')!;
  const setEl = document.getElementById('wk-set')!;
  const hpEl = document.getElementById('wk-hp') as HTMLElement;
  const restEl = document.getElementById('wk-rest') as HTMLElement;
  const statusEl = document.getElementById('wk-status')!;
  const backBtn = document.getElementById('wk-back') as HTMLButtonElement;
  const monsterImg = document.getElementById('wk-monster') as HTMLImageElement;
  const monsterName = document.getElementById('wk-monster-name') as HTMLElement;
  const hpTextEl = document.getElementById('wk-hp-text')!;
  const timeEl = document.getElementById('wk-time')!;

  // Картинка текущего монстра на экране тренировки.
  monsterImg.src = `./games/${monster.cardImage}`;
  monsterName.textContent = monster.name;

  const maxHp = totalTarget(monster);

  // Звук урона по мобу (каждое отжимание = урон = XP).
  const hitSound = new Audio('./games/hit.mp3');
  hitSound.volume = 0.6;

  const detector = new RepDetector(DEFAULT_CONFIG);
  let wk: WorkoutState = newWorkout(monster);
  let resting = false;
  let finished = false;
  let stream: MediaStream | null = null;

  // Таймер уровня (сколько заняло прохождение) — слева сверху.
  const startMs = performance.now();
  const fmtTime = (ms: number): string => {
    const s = Math.floor(ms / 1000);
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  };
  const timerId = window.setInterval(() => {
    timeEl.textContent = fmtTime(performance.now() - startMs);
  }, 250);
  const stopTimer = () => window.clearInterval(timerId);

  backBtn.onclick = () => {
    finished = true;
    stopTimer();
    if (stream) {
      stream.getTracks().forEach(t => t.stop());
    }
    app.render();
    app.show('screen-map');
  };

  const updateHud = () => {
    counterEl.textContent = String(wk.repsInSet);
    setEl.textContent =
      monster.sets > 1
        ? `Сет ${wk.setIndex + 1}/${monster.sets} · цель ${monster.repsPerSet}`
        : `Цель ${monster.repsPerSet}`;
    const hp = Math.max(0, maxHp - wk.totalReps);
    hpEl.style.width = `${(hp / maxHp) * 100}%`;
    hpTextEl.textContent = `${hp} / ${maxHp} HP`;
  };
  updateHud();

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

  function handleRep() {
    try {
      hitSound.currentTime = 0;
      hitSound.play().catch(() => {});
    } catch {
      // звук не критичен
    }
    const res = onRep(wk, monster);
    wk = res.state;
    updateHud();
    if (res.event === 'monsterDefeated') {
      finished = true;
      stopTimer();
      app.onDefeated();
    } else if (res.event === 'setComplete') {
      startRest();
    }
  }

  function startRest() {
    resting = true;
    let left = monster.restBetweenSetsSec;
    restEl.style.display = 'flex';
    const tick = () => {
      if (left <= 0) {
        restEl.style.display = 'none';
        resting = false;
        updateHud();
        return;
      }
      restEl.textContent = `Отдых: ${left} с (нажми, чтобы продолжить)`;
      left -= 1;
      setTimeout(tick, 1000);
    };
    // 0 сек отдыха для локаций 1–3 → сразу продолжаем; иначе таймер + пропуск по тапу
    if (monster.restBetweenSetsSec <= 0) {
      restEl.style.display = 'none';
      resting = false;
    } else {
      restEl.textContent = `Отдых: ${left} с (нажми, чтобы продолжить)`;
      restEl.onclick = () => {
        restEl.style.display = 'none';
        resting = false;
      };
      tick();
    }
  }

  async function run() {
    statusEl.textContent = 'Запрашиваю камеру…';
    stream = await navigator.mediaDevices.getUserMedia({
      video: {facingMode: 'user', width: 640, height: 480},
      audio: false,
    });
    video.srcObject = stream;
    await video.play();
    statusEl.textContent = 'Загружаю модель…';
    await tf.setBackend('webgl');
    await tf.ready();
    const det = await poseDetection.createDetector(
      poseDetection.SupportedModels.MoveNet,
      {modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING},
    );
    statusEl.textContent = 'Займи упор лёжа';

    async function loop() {
      if (finished) {
        (video.srcObject as MediaStream).getTracks().forEach(t => t.stop());
        return;
      }
      const poses = await det.estimatePoses(video, {flipHorizontal: false});
      let pose: Pose | null = null;
      if (poses && poses[0]) {
        const kps = poses[0].keypoints;
        pose = [];
        for (let i = 0; i < KEYPOINT_COUNT; i++) {
          pose.push({x: kps[i].x, y: kps[i].y, score: kps[i].score ?? 0});
        }
        if (!resting) {
          const events = detector.process(pose, performance.now());
          for (const e of events) {
            if (e === 'repCounted') handleRep();
          }
        }
      }
      draw(pose);
      requestAnimationFrame(loop);
    }
    loop();
  }

  // камера запускается заново при каждом входе; предыдущий поток уже остановлен
  run().catch(err => {
    statusEl.textContent = 'Ошибка: ' + (err?.message ?? String(err));
    // eslint-disable-next-line no-console
    console.error(err);
  });
}
