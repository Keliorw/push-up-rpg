import {INITIAL_PROGRESSION, Progression} from '../../app/src/game/progression';

const KEY = 'pushuprpg.progression';

export function loadProgression(): Progression {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return INITIAL_PROGRESSION;
    const p = JSON.parse(raw) as Progression;
    if (typeof p.defeatedCount === 'number') return p;
  } catch {
    // ignore corrupt storage
  }
  return INITIAL_PROGRESSION;
}

export function saveProgression(p: Progression): void {
  localStorage.setItem(KEY, JSON.stringify(p));
}

export function resetProgression(): void {
  localStorage.removeItem(KEY);
}
