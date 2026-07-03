import {
  Progression,
  currentMonster,
  defeatMonster,
} from '../../app/src/game/progression';
import {todayISO} from './dates';
import {loadProgression, saveProgression} from './storage';
import {renderMap} from './map';
import {renderCard} from './card';
import {startWorkout} from './workout-screen';

export type ScreenId =
  | 'screen-start'
  | 'screen-map'
  | 'screen-card'
  | 'screen-workout'
  | 'screen-victory';

export interface App {
  progression: Progression;
  show(id: ScreenId): void;
  render(): void;
  goCard(): void;
  goWorkout(): void;
  onDefeated(): void; // called by the workout screen on monster defeat
}

function show(id: ScreenId): void {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id)!.classList.add('active');
}

// Трек победы (играет на экране «Повержен!», останавливается при выходе на карту).
let victorySound: HTMLAudioElement | null = null;
function playVictory(): void {
  stopVictory();
  victorySound = new Audio('./games/victory.mp3');
  victorySound.volume = 0.8;
  victorySound.play().catch(() => {
    // автоплей может быть заблокирован — не критично
  });
}
function stopVictory(): void {
  if (victorySound) {
    victorySound.pause();
    victorySound = null;
  }
}

const app: App = {
  progression: loadProgression(),
  show,
  render() {
    renderMap(this);
  },
  goCard() {
    renderCard(this);
    show('screen-card');
  },
  goWorkout() {
    show('screen-workout');
    startWorkout(this);
  },
  onDefeated() {
    const m = currentMonster(this.progression);
    this.progression = defeatMonster(this.progression, todayISO());
    saveProgression(this.progression);
    (document.getElementById('victory-name') as HTMLElement).textContent = m ? m.name : '';
    // «Следующий монстр» показываем только если ещё есть кого бить.
    const next = currentMonster(this.progression);
    (document.getElementById('victory-next') as HTMLElement).style.display = next ? '' : 'none';
    show('screen-victory');
    playVictory();
  },
};

// MAIN MENU: «Кампания» -> карта (как раньше START). «Arena» пока не активна.
document.getElementById('btn-campaign')!.addEventListener('click', () => {
  app.render();
  show('screen-map');
});

// Анимированный фон меню: статичная картинка -> видео, когда догрузится.
// Бесшовный цикл через два ролика (double-buffer): пока играет активный,
// второй уже стоит на кадре 0 (декодирован), и на стыке эстафета передаётся
// мгновенно — без перемотки к 0, которая на нативном loop даёт микро-фриз.
// Видео muted/playsinline, pointer-events:none, без контролов и паузы.
const menuVids = [
  document.getElementById('menu-bg-video'),
  document.getElementById('menu-bg-video-b'),
].filter(Boolean) as HTMLVideoElement[];
if (menuVids.length === 2) {
  let active = 0;
  const advance = () => {
    const incoming = menuVids[active ^ 1]; // уже на кадре 0 и декодирован
    const outgoing = menuVids[active];
    incoming.classList.add('ready');
    void incoming.play().catch(() => {});
    outgoing.classList.remove('ready');
    active ^= 1;
    // Готовим ушедший ролик к следующему показу заранее, пока он скрыт.
    outgoing.pause();
    outgoing.currentTime = 0;
  };
  menuVids.forEach(v => {
    v.loop = false;
    v.addEventListener('ended', advance);
  });
  const start = () => {
    menuVids[0].classList.add('ready');
    void menuVids[0].play().catch(() => {});
  };
  if (menuVids[0].readyState >= 3) start();
  else menuVids[0].addEventListener('canplaythrough', start, {once: true});
}
// VICTORY: сразу к следующему монстру (его превью) или выйти на карту.
document.getElementById('victory-next')!.addEventListener('click', () => {
  stopVictory();
  app.render(); // обновить прогресс на карте (на фоне)
  app.goCard(); // превью следующего монстра
});
document.getElementById('victory-map')!.addEventListener('click', () => {
  stopVictory();
  app.render();
  show('screen-map');
});
// CARD back / start
document.getElementById('card-back-btn')!.addEventListener('click', () => {
  app.render();
  show('screen-map');
});
document.getElementById('card-start-btn')!.addEventListener('click', () => app.goWorkout());
// MAP: возврат в главное меню
document.getElementById('map-back')!.addEventListener('click', () => show('screen-start'));
