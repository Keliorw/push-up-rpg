import {MONSTER_SEQUENCE} from './monsters';
import {Monster} from './types';

export interface Progression {
  /** Сколько монстров уже побеждено (индекс текущего в MONSTER_SEQUENCE). */
  defeatedCount: number;
  /** ISO-дата последней завершённой тренировки (YYYY-MM-DD) или null. */
  lastWorkoutDate: string | null;
}

export const INITIAL_PROGRESSION: Progression = {
  defeatedCount: 0,
  lastWorkoutDate: null,
};

export function currentMonster(p: Progression): Monster | null {
  return MONSTER_SEQUENCE[p.defeatedCount] ?? null;
}

export function defeatMonster(p: Progression, today: string): Progression {
  return {defeatedCount: p.defeatedCount + 1, lastWorkoutDate: today};
}

export function isGameComplete(p: Progression): boolean {
  return p.defeatedCount >= MONSTER_SEQUENCE.length;
}
