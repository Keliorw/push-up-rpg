import {MONSTER_SEQUENCE} from '../../app/src/game/monsters';
import {
  INITIAL_PROGRESSION,
  Progression,
  currentMonster,
  defeatMonster,
} from '../../app/src/game/progression';
import {todayISO} from './dates';
import {loadProgression, resetProgression, saveProgression} from './storage';
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

// START
document.getElementById('start-btn')!.addEventListener('click', () => {
  app.render();
  show('screen-map');
});
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

// DEV panel
document.getElementById('dev-reset-day')!.addEventListener('click', () => {
  app.progression = {...app.progression, lastWorkoutDate: null};
  saveProgression(app.progression);
  app.render();
});
document.getElementById('dev-reset-progress')!.addEventListener('click', () => {
  resetProgression();
  app.progression = INITIAL_PROGRESSION;
  app.render();
});
document.getElementById('dev-prev')!.addEventListener('click', () => {
  app.progression = {
    ...app.progression,
    defeatedCount: Math.max(0, app.progression.defeatedCount - 1),
  };
  saveProgression(app.progression);
  app.render();
});
document.getElementById('dev-next')!.addEventListener('click', () => {
  app.progression = {
    ...app.progression,
    defeatedCount: Math.min(MONSTER_SEQUENCE.length, app.progression.defeatedCount + 1),
  };
  saveProgression(app.progression);
  app.render();
});
