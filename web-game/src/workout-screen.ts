import {monsterForExercise} from '../../app/src/game/exercise';
import {currentMonster} from '../../app/src/game/progression';
import {WorkoutState, newWorkout, onRep, totalTarget} from '../../app/src/game/workout';
import {startBattleCamera, BattleCamera} from './battle-camera';
import type {App} from './main';

export function startWorkout(app: App, detector: any): void {
  const found = currentMonster(app.progression);
  if (!found) return;
  // Цель пересчитана под выбранное упражнение (приседания — ×1.5 повторов).
  const monster = monsterForExercise(found, app.exercise);

  const video = document.getElementById('wk-video') as HTMLVideoElement;
  const canvas = document.getElementById('wk-overlay') as HTMLCanvasElement;
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

  monsterImg.src = `./games/${monster.cardImage}`;
  monsterName.textContent = monster.name;

  const maxHp = totalTarget(monster);
  const hitSound = new Audio('./games/hit.mp3');
  hitSound.volume = 0.6;

  let wk: WorkoutState = newWorkout(monster);
  let camera: BattleCamera | null = null;
  let aborted = false; // выход нажат до готовности камеры — остановить её по готовности

  // Таймер уровня (сколько заняло прохождение) — слева сверху, растущий.
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
    aborted = true;
    stopTimer();
    if (camera) camera.stop();
    restEl.style.display = 'none'; // погасить осиротевший оверлей отдыха (общий #wk-rest)
    app.persistProfile(); // XP из этого боя (даже без победы) уходит в облако
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

  function startRest() {
    let left = monster.restBetweenSetsSec;
    if (left <= 0) {
      if (camera) camera.setPaused(false);
      return;
    }
    if (camera) camera.setPaused(true);
    restEl.style.display = 'flex';
    restEl.textContent = `Отдых: ${left} с (нажми, чтобы продолжить)`;
    restEl.onclick = () => {
      restEl.style.display = 'none';
      if (camera) camera.setPaused(false);
    };
    const tick = () => {
      if (restEl.style.display === 'none') return; // пропущено тапом
      if (left <= 0) {
        restEl.style.display = 'none';
        if (camera) camera.setPaused(false);
        return;
      }
      restEl.textContent = `Отдых: ${left} с (нажми, чтобы продолжить)`;
      left -= 1;
      setTimeout(tick, 1000);
    };
    tick();
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
    app.addRep();
    updateHud();
    if (res.event === 'monsterDefeated') {
      stopTimer();
      if (camera) camera.stop();
      app.onDefeated();
    } else if (res.event === 'setComplete') {
      startRest();
    }
  }

  startBattleCamera(video, canvas, detector, app.exercise, handleRep, text => {
    statusEl.textContent = text;
  }).then(
    cam => {
      camera = cam;
      if (aborted) cam.stop(); // пользователь вышел, пока грузилась камера
    },
    err => {
      statusEl.textContent = 'Ошибка: ' + (err?.message ?? String(err));
      // eslint-disable-next-line no-console
      console.error(err);
    },
  );
}
