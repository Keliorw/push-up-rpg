import test from 'node:test';
import assert from 'node:assert/strict';
import {mergeProgress, mergeProfile} from './sync.ts';

test('берёт больший defeatedCount', () => {
  assert.deepEqual(
    mergeProgress(
      {defeatedCount: 3, lastWorkoutDate: null},
      {defeatedCount: 7, lastWorkoutDate: null},
    ),
    {defeatedCount: 7, lastWorkoutDate: null},
  );
});

test('берёт самую свежую дату', () => {
  assert.deepEqual(
    mergeProgress(
      {defeatedCount: 5, lastWorkoutDate: '2026-07-01'},
      {defeatedCount: 5, lastWorkoutDate: '2026-07-03'},
    ),
    {defeatedCount: 5, lastWorkoutDate: '2026-07-03'},
  );
});

test('null-дата с одной стороны — берётся непустая', () => {
  assert.deepEqual(
    mergeProgress(
      {defeatedCount: 2, lastWorkoutDate: null},
      {defeatedCount: 1, lastWorkoutDate: '2026-06-30'},
    ),
    {defeatedCount: 2, lastWorkoutDate: '2026-06-30'},
  );
});

test('обе даты null → null', () => {
  assert.equal(
    mergeProgress(
      {defeatedCount: 0, lastWorkoutDate: null},
      {defeatedCount: 0, lastWorkoutDate: null},
    ).lastWorkoutDate,
    null,
  );
});

test('mergeProfile: прогресс и XP не откатываются', () => {
  assert.deepEqual(
    mergeProfile(
      {progression: {defeatedCount: 3, lastWorkoutDate: '2026-07-01'}, totalReps: 120, bestArena: 0},
      {progression: {defeatedCount: 5, lastWorkoutDate: '2026-06-30'}, totalReps: 90, bestArena: 0},
    ),
    {progression: {defeatedCount: 5, lastWorkoutDate: '2026-07-01'}, totalReps: 120, bestArena: 0},
  );
});

test('mergeProfile: bestArena берётся по максимуму, не откатывается', () => {
  assert.deepEqual(
    mergeProfile(
      {progression: {defeatedCount: 3, lastWorkoutDate: '2026-07-01'}, totalReps: 120, bestArena: 8},
      {progression: {defeatedCount: 5, lastWorkoutDate: '2026-06-30'}, totalReps: 90, bestArena: 3},
    ),
    {progression: {defeatedCount: 5, lastWorkoutDate: '2026-07-01'}, totalReps: 120, bestArena: 8},
  );
});
