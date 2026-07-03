import type {Progression} from '../../app/src/game/progression';

/** Самая свежая из двух ISO-дат (YYYY-MM-DD), null-safe. */
function latestDate(a: string | null, b: string | null): string | null {
  if (a === null) return b;
  if (b === null) return a;
  return a >= b ? a : b;
}

/**
 * Объединяет локальный и облачный прогресс так, что прогресс НИКОГДА не
 * откатывается: берём максимум побед и самую свежую дату тренировки.
 */
export function mergeProgress(a: Progression, b: Progression): Progression {
  return {
    defeatedCount: Math.max(a.defeatedCount, b.defeatedCount),
    lastWorkoutDate: latestDate(a.lastWorkoutDate, b.lastWorkoutDate),
  };
}
