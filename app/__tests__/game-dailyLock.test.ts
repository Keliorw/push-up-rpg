import {isLockedToday} from '../src/game/dailyLock';

test('not locked when no workout done yet', () => {
  expect(isLockedToday({defeatedCount: 0, lastWorkoutDate: null}, '2026-07-02')).toBe(false);
});

test('locked when the last workout was today', () => {
  expect(isLockedToday({defeatedCount: 1, lastWorkoutDate: '2026-07-02'}, '2026-07-02')).toBe(true);
});

test('unlocked again on a later date', () => {
  expect(isLockedToday({defeatedCount: 1, lastWorkoutDate: '2026-07-02'}, '2026-07-03')).toBe(false);
});
