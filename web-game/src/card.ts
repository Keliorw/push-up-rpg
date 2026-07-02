import {currentMonster} from '../../app/src/game/progression';
import {totalTarget} from '../../app/src/game/workout';
import type {App} from './main';

export function renderCard(app: App): void {
  const m = currentMonster(app.progression);
  const img = document.getElementById('card-img') as HTMLImageElement;
  const target = document.getElementById('card-target') as HTMLElement;
  const hp = document.getElementById('card-hp') as HTMLElement;
  const startBtn = document.getElementById('card-start-btn') as HTMLButtonElement;
  const hint = document.getElementById('hint') as HTMLElement;

  if (!m) {
    target.textContent = 'Все враги повержены!';
    startBtn.style.display = 'none';
    hint.textContent = '';
    img.removeAttribute('src');
    return;
  }

  img.src = `./games/${m.cardImage}`;
  hp.style.width = '100%';
  target.textContent =
    m.kind === 'boss'
      ? `БОСС: ${m.sets} подхода × ${m.repsPerSet} (всего ${totalTarget(m)})`
      : `Победи: ${m.repsPerSet} отжиманий`;

  startBtn.style.display = '';
  hint.textContent = '';
}
