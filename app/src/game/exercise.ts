import {Monster} from './types';

/** Каким упражнением игрок проходит бой. */
export type Exercise = 'pushups' | 'squats';

/**
 * Приседания легче отжиманий, поэтому монстр требует их больше:
 * ×1.5 от числа отжиманий, округление вверх (10 отжиманий → 15 приседаний).
 */
export const SQUAT_TARGET_MULT = 1.5;

/**
 * Монстр с целью, пересчитанной под выбранное упражнение. Для отжиманий —
 * исходный монстр; для приседаний repsPerSet умножается на SQUAT_TARGET_MULT.
 */
export function monsterForExercise(m: Monster, exercise: Exercise): Monster {
  if (exercise === 'pushups') {
    return m;
  }
  return {...m, repsPerSet: Math.ceil(m.repsPerSet * SQUAT_TARGET_MULT)};
}
