import {
  ARENA_CONFIG,
  ArenaState,
  arenaMonster,
  mobHp,
  mobTimerSec,
  newRun,
  onRep,
  onRestDone,
  onTimeout,
} from '../../app/src/game/arena';
import {ensureDetector} from './pose-model';
import {startBattleCamera, BattleCamera} from './battle-camera';
import {saveBestArena} from './storage';
import type {App} from './main';

/** Экран загрузки модели → бой арены на #screen-workout. */
export function startArenaFlow(app: App): void {
  app.show('screen-loading');
  const loadingBack = document.getElementById('loading-back') as HTMLElement;
  const loadingText = document.getElementById('loading-text') as HTMLElement;
  loadingBack.style.display = 'none';
  loadingText.textContent = 'Загрузка арены…';
  ensureDetector().then(
    detector => {
      if (!document.getElementById('screen-loading')!.classList.contains('active')) return;
      app.show('screen-workout');
      runArena(app, detector);
    },
    () => {
      loadingText.textContent = 'Не удалось загрузить модель';
      loadingBack.style.display = 'inline-block';
    },
  );
}

function runArena(app: App, detector: any): void {
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

  const hitSound = new Audio('./games/hit.mp3');
  hitSound.volume = 0.6;

  let state: ArenaState = newRun();
  let camera: BattleCamera | null = null;
  let secLeft = mobTimerSec(state.mobIndex);
  let mobTimerId = 0;
  let ended = false;

  const fmtTime = (s: number): string =>
    `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  function renderMobHud() {
    const m = arenaMonster(state.mobIndex);
    monsterImg.src = `./games/${m.cardImage}`;
    monsterName.textContent = m.name;
    const maxHp = mobHp(state.mobIndex);
    hpEl.style.width = `${(state.hpLeft / maxHp) * 100}%`;
    hpTextEl.textContent = `${state.hpLeft} / ${maxHp} HP`;
    counterEl.textContent = String(maxHp - state.hpLeft); // отжато по текущему мобу
    setEl.textContent = `Убито: ${state.kills}`;
  }

  function renderTimer() {
    timeEl.textContent = fmtTime(Math.max(0, secLeft));
    timeEl.style.color = secLeft <= 10 ? '#ff6a56' : '#fff';
  }

  function startMobTimer() {
    secLeft = mobTimerSec(state.mobIndex);
    renderTimer();
    window.clearInterval(mobTimerId);
    mobTimerId = window.setInterval(() => {
      secLeft -= 1;
      renderTimer();
      if (secLeft <= 0) {
        window.clearInterval(mobTimerId);
        state = onTimeout(state);
        endRun();
      }
    }, 1000);
  }

  function startRest() {
    if (camera) camera.setPaused(true);
    window.clearInterval(mobTimerId);
    let left = ARENA_CONFIG.restSec;
    restEl.style.display = 'flex';
    const finishRest = () => {
      restEl.style.display = 'none';
      state = onRestDone(state);
      renderMobHud();
      if (camera) camera.setPaused(false);
      startMobTimer();
    };
    restEl.onclick = finishRest;
    const tick = () => {
      if (restEl.style.display === 'none') return; // пропущено тапом
      if (left <= 0) {
        finishRest();
        return;
      }
      restEl.textContent = `Отдых: ${left} с (нажми, чтобы продолжить)`;
      left -= 1;
      setTimeout(tick, 1000);
    };
    tick();
  }

  function handleRep() {
    if (ended || state.phase !== 'fighting') return;
    try {
      hitSound.currentTime = 0;
      hitSound.play().catch(() => {});
    } catch {
      // звук не критичен
    }
    const res = onRep(state);
    state = res.state;
    app.addRep();
    renderMobHud();
    if (res.event === 'mobKilled') {
      startRest();
    }
  }

  function endRun() {
    if (ended) return;
    ended = true;
    window.clearInterval(mobTimerId);
    restEl.style.display = 'none'; // остановить тикер отдыха, если ✕/таймаут пришли во время rest
    timeEl.style.color = '#fff'; // сбросить красный, чтобы не протёк в бой кампании
    if (camera) camera.stop();
    const kills = state.kills;
    const isRecord = kills > app.bestArena;
    if (isRecord) {
      app.bestArena = kills;
      saveBestArena(kills);
    }
    app.persistProfile(); // XP + bestArena в облако
    (document.getElementById('arena-result-kills') as HTMLElement).textContent =
      `Убито мобов: ${kills}`;
    (document.getElementById('arena-result-record') as HTMLElement).textContent = isRecord
      ? 'Новый рекорд!'
      : `Рекорд: ${app.bestArena}`;
    app.show('screen-arena-result');
  }

  backBtn.onclick = () => endRun();

  renderMobHud();
  startMobTimer();
  // Арена — всегда отжимания (режим приседаний пока только в кампании).
  startBattleCamera(video, canvas, detector, 'pushups', handleRep, text => {
    statusEl.textContent = text;
  }).then(
    cam => {
      camera = cam;
      if (ended) cam.stop(); // выход/таймаут во время загрузки камеры
    },
    err => {
      statusEl.textContent = 'Ошибка: ' + (err?.message ?? String(err));
      // eslint-disable-next-line no-console
      console.error(err);
    },
  );
}
