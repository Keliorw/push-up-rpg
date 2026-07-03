import {Monster} from '../src/game/types';
import {
  newWorkout,
  onRep,
  progressFraction,
  totalTarget,
} from '../src/game/workout';

const minion: Monster = {
  id: 'm', name: 'M', kind: 'minion', cardImage: '1/x.png',
  sets: 1, repsPerSet: 3, restBetweenSetsSec: 0,
};
const boss: Monster = {
  id: 'b', name: 'B', kind: 'boss', cardImage: '1/boss.png',
  sets: 3, repsPerSet: 2, restBetweenSetsSec: 0,
};

test('minion: last rep of the single set defeats it', () => {
  let s = newWorkout(minion);
  expect(onRep(s, minion).event).toBe('repCounted');
  s = onRep(s, minion).state;
  expect(onRep(s, minion).event).toBe('repCounted');
  s = onRep(s, minion).state;
  const r = onRep(s, minion);
  expect(r.event).toBe('monsterDefeated');
  expect(r.state.done).toBe(true);
});

test('boss: each finished set emits setComplete, last emits monsterDefeated', () => {
  let s = newWorkout(boss);
  const events: string[] = [];
  // 3 sets x 2 reps = 6 reps
  for (let i = 0; i < 6; i++) {
    const r = onRep(s, boss);
    events.push(r.event);
    s = r.state;
  }
  expect(events).toEqual([
    'repCounted', 'setComplete',
    'repCounted', 'setComplete',
    'repCounted', 'monsterDefeated',
  ]);
  expect(s.done).toBe(true);
});

test('setComplete advances setIndex and resets repsInSet', () => {
  let s = newWorkout(boss);
  s = onRep(s, boss).state; // rep 1 of set 0
  const r = onRep(s, boss); // rep 2 -> set complete
  expect(r.event).toBe('setComplete');
  expect(r.state.setIndex).toBe(1);
  expect(r.state.repsInSet).toBe(0);
});

test('totalTarget and progressFraction', () => {
  expect(totalTarget(boss)).toBe(6);
  let s = newWorkout(boss);
  s = onRep(s, boss).state;
  s = onRep(s, boss).state;
  s = onRep(s, boss).state; // 3 of 6
  expect(progressFraction(s, boss)).toBeCloseTo(0.5);
});

test('reps after done are no-ops', () => {
  let s = newWorkout(minion);
  for (let i = 0; i < 3; i++) s = onRep(s, minion).state;
  expect(s.done).toBe(true);
  const r = onRep(s, minion);
  expect(r.event).toBe('repCounted');
  expect(r.state.done).toBe(true);
  expect(r.state.totalReps).toBe(3); // unchanged
});
