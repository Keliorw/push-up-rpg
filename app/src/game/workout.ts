import {Monster} from './types';

export type WorkoutEvent = 'repCounted' | 'setComplete' | 'monsterDefeated';

export interface WorkoutState {
  /** Индекс текущего подхода (0-based). */
  setIndex: number;
  /** Повторов в текущем подходе. */
  repsInSet: number;
  /** Всего повторов за бой (XP). */
  totalReps: number;
  done: boolean;
}

export function newWorkout(_m: Monster): WorkoutState {
  return {setIndex: 0, repsInSet: 0, totalReps: 0, done: false};
}

export function totalTarget(m: Monster): number {
  return m.sets * m.repsPerSet;
}

export function progressFraction(state: WorkoutState, m: Monster): number {
  return Math.min(1, state.totalReps / totalTarget(m));
}

/**
 * Учитывает один засчитанный повтор. Возвращает новое состояние и событие:
 * - 'monsterDefeated' — добит последний повтор последнего подхода;
 * - 'setComplete' — закончился подход (не последний); прототип показывает
 *   экран отдыха, затем продолжает вызывать onRep для следующего подхода;
 * - 'repCounted' — обычный повтор.
 * После done все повторы — no-op.
 */
export function onRep(
  state: WorkoutState,
  m: Monster,
): {state: WorkoutState; event: WorkoutEvent} {
  if (state.done) {
    return {state, event: 'repCounted'};
  }
  const repsInSet = state.repsInSet + 1;
  const totalReps = state.totalReps + 1;
  if (repsInSet >= m.repsPerSet) {
    const isLastSet = state.setIndex + 1 >= m.sets;
    if (isLastSet) {
      return {
        state: {setIndex: state.setIndex, repsInSet, totalReps, done: true},
        event: 'monsterDefeated',
      };
    }
    return {
      state: {setIndex: state.setIndex + 1, repsInSet: 0, totalReps, done: false},
      event: 'setComplete',
    };
  }
  return {state: {...state, repsInSet, totalReps}, event: 'repCounted'};
}
