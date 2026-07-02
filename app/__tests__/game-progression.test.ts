import {
  INITIAL_PROGRESSION,
  currentMonster,
  defeatMonster,
  isGameComplete,
} from '../src/game/progression';

test('starts at the first monster, nothing defeated', () => {
  expect(INITIAL_PROGRESSION).toEqual({defeatedCount: 0, lastWorkoutDate: null});
  expect(currentMonster(INITIAL_PROGRESSION)!.id).toBe('loc1-m1');
  expect(isGameComplete(INITIAL_PROGRESSION)).toBe(false);
});

test('defeatMonster advances the pointer and stamps the date (immutably)', () => {
  const p1 = defeatMonster(INITIAL_PROGRESSION, '2026-07-02');
  expect(p1).toEqual({defeatedCount: 1, lastWorkoutDate: '2026-07-02'});
  expect(INITIAL_PROGRESSION.defeatedCount).toBe(0); // unchanged
  expect(currentMonster(p1)!.id).toBe('loc1-m2');
});

test('after 12 defeats the game is complete, currentMonster is null', () => {
  let p = INITIAL_PROGRESSION;
  for (let i = 0; i < 12; i++) {
    p = defeatMonster(p, '2026-07-02');
  }
  expect(p.defeatedCount).toBe(12);
  expect(currentMonster(p)).toBeNull();
  expect(isGameComplete(p)).toBe(true);
});
