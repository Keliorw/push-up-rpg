import {LOCATIONS, NODE_POSITIONS} from '../../app/src/game/monsters';
import {currentMonster} from '../../app/src/game/progression';
import type {App} from './main';

/** Индекс локации (1-based) текущего монстра, или null если игра пройдена. */
function currentLocationIndex(app: App): number | null {
  const m = currentMonster(app.progression);
  if (!m) return null;
  // id вида 'locN-...'
  const match = /^loc(\d+)-/.exec(m.id);
  return match ? Number(match[1]) : null;
}

export function renderMap(app: App): void {
  const wrap = document.getElementById('map-wrap')!;
  // убрать старые маркеры (оставить <img>)
  wrap.querySelectorAll('.node').forEach(n => n.remove());

  const curLoc = currentLocationIndex(app);

  for (let i = 0; i < NODE_POSITIONS.length; i++) {
    const locIndex = i + 1;
    const pos = NODE_POSITIONS[i];
    const el = document.createElement('div');
    el.className = 'node';
    el.style.left = `${pos.x * 100}%`;
    el.style.top = `${pos.y * 100}%`;
    el.textContent = String(locIndex);

    const hasContent = locIndex <= LOCATIONS.length; // 1..3 играбельны
    if (curLoc === null) {
      // игра пройдена — все доступные локации done
      el.classList.add(hasContent ? 'done' : 'locked');
    } else if (locIndex < curLoc) {
      el.classList.add('done');
    } else if (locIndex === curLoc && hasContent) {
      el.classList.add('current');
      el.addEventListener('click', () => app.goCard());
    } else {
      el.classList.add('locked');
    }
    wrap.appendChild(el);
  }
}
