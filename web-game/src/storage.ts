import {MONSTER_SEQUENCE} from '../../app/src/game/monsters';
import {INITIAL_PROGRESSION, Progression} from '../../app/src/game/progression';

const KEY = 'pushuprpg.progression';

export function loadProgression(): Progression {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return INITIAL_PROGRESSION;
    const p = JSON.parse(raw) as Partial<Progression>;
    const defeatedCount = Number.isFinite(p.defeatedCount)
      ? Math.max(0, Math.min(MONSTER_SEQUENCE.length, Math.floor(p.defeatedCount as number)))
      : INITIAL_PROGRESSION.defeatedCount;
    const lastWorkoutDate =
      p.lastWorkoutDate === null || typeof p.lastWorkoutDate === 'string'
        ? p.lastWorkoutDate
        : null;
    return {defeatedCount, lastWorkoutDate};
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
