import {arenaMonster, mobHp, mobTimerSec} from '../../app/src/game/arena';
import {openArenaRatingModal} from './arena-screen';
import type {App} from './main';

/** Показать лобби арены: фон, кнопка старта, лучший результат. */
export function openArenaLobby(app: App): void {
  const best = document.getElementById('arena-best') as HTMLElement;
  if (app.bestArena > 0) {
    best.textContent = `Лучший результат: ${app.bestArena}`;
    best.style.display = '';
  } else {
    best.style.display = 'none';
  }
  app.show('screen-arena-lobby');
}

/** Превью первого моба забега на экране карточки (#screen-card) с аренными кнопками. */
export function showArenaPreview(app: App): void {
  const m = arenaMonster(1);
  const img = document.getElementById('card-img') as HTMLImageElement;
  const target = document.getElementById('card-target') as HTMLElement;
  const hp = document.getElementById('card-hp') as HTMLElement;
  const startBtn = document.getElementById('card-start-btn') as HTMLButtonElement;
  const backBtn = document.getElementById('card-back-btn') as HTMLButtonElement;
  const startSpan = startBtn.querySelector('span') as HTMLElement;
  const hint = document.getElementById('hint') as HTMLElement;

  img.src = `./games/${m.cardImage}`;
  hp.style.width = '100%';
  target.textContent = `АРЕНА · ${m.name}: ${mobHp(1)} HP · ${mobTimerSec(1)} сек`;
  startSpan.textContent = 'В бой';
  startBtn.style.display = '';
  hint.textContent = '';

  // Аренные обработчики (перекрывают кампанийные onclick — см. main.ts).
  startBtn.onclick = () => app.goArenaBattle();
  backBtn.onclick = () => openArenaLobby(app);

  app.show('screen-card');
}

/** Проводка кнопок лобби. Вызывается один раз при старте. */
export function initArenaLobby(app: App): void {
  document.getElementById('arena-lobby-back')!.addEventListener('click', () => app.show('screen-start'));
  document.getElementById('arena-lobby-rating')!.addEventListener('click', () => {
    void openArenaRatingModal(app.currentUid());
  });
  document.getElementById('arena-lobby-start')!.addEventListener('click', () => showArenaPreview(app));
  document.getElementById('arena-result-lobby')!.addEventListener('click', () => openArenaLobby(app));
  document.getElementById('arena-result-again')!.addEventListener('click', () => showArenaPreview(app));
}
