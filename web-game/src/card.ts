import {Exercise, monsterForExercise} from '../../app/src/game/exercise';
import {currentMonster} from '../../app/src/game/progression';
import {totalTarget} from '../../app/src/game/workout';
import type {App} from './main';

const EXERCISE_WORD: Record<Exercise, string> = {
  pushups: 'отжиманий',
  squats: 'приседаний',
};

export function renderCard(app: App): void {
  const m = currentMonster(app.progression);
  const img = document.getElementById('card-img') as HTMLImageElement;
  const target = document.getElementById('card-target') as HTMLElement;
  const hp = document.getElementById('card-hp') as HTMLElement;
  const startBtn = document.getElementById('card-start-btn') as HTMLButtonElement;
  const modeWrap = document.getElementById('card-mode') as HTMLElement;
  const modePushups = document.getElementById('mode-pushups') as HTMLButtonElement;
  const modeSquats = document.getElementById('mode-squats') as HTMLButtonElement;
  const hint = document.getElementById('hint') as HTMLElement;

  if (!m) {
    target.textContent = 'Все враги повержены!';
    startBtn.style.display = 'none';
    modeWrap.style.display = 'none';
    hint.textContent = '';
    img.removeAttribute('src');
    return;
  }

  const updateTarget = () => {
    // Цель под выбранное упражнение (приседания — ×1.5 повторов).
    const scaled = monsterForExercise(m, app.exercise);
    const word = EXERCISE_WORD[app.exercise];
    target.textContent =
      scaled.kind === 'boss'
        ? `БОСС: ${scaled.sets} подхода × ${scaled.repsPerSet} ${word} (всего ${totalTarget(scaled)})`
        : `Победи: ${scaled.repsPerSet} ${word}`;
    modePushups.classList.toggle('active', app.exercise === 'pushups');
    modeSquats.classList.toggle('active', app.exercise === 'squats');
  };

  modePushups.onclick = () => {
    app.exercise = 'pushups';
    updateTarget();
  };
  modeSquats.onclick = () => {
    app.exercise = 'squats';
    updateTarget();
  };

  img.src = `./games/${m.cardImage}`;
  hp.style.width = '100%';
  updateTarget();

  startBtn.style.display = '';
  modeWrap.style.display = '';
  hint.textContent = '';
}
