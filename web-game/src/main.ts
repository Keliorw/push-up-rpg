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
    show('screen-victory');
    playVictory();
  },
};

// MAIN MENU: «Кампания» -> карта (как раньше START). «Arena» пока не активна.
document.getElementById('btn-campaign')!.addEventListener('click', () => {
  app.render();
  show('screen-map');
});

// Анимированный фон меню: сначала статичная картинка, затем подменяем видео,
// когда оно догрузится. Видео muted/loop/autoplay, без плеера и паузы.
const menuVideo = document.getElementById('menu-bg-video') as HTMLVideoElement | null;
if (menuVideo) {
  const showVideo = () => {
    menuVideo.classList.add('ready');
    void menuVideo.play().catch(() => {});
  };
  if (menuVideo.readyState >= 3) {
    showVideo();
  } else {
    menuVideo.addEventListener('canplaythrough', showVideo, {once: true});
  }
}
// VICTORY -> map
document.getElementById('victory-btn')!.addEventListener('click', () => {
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
