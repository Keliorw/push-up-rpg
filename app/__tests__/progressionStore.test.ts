jest.mock('@react-native-async-storage/async-storage');

import AsyncStorage from '@react-native-async-storage/async-storage';
import {INITIAL_PROGRESSION} from '../src/game/progression';
import {loadProgression, saveProgression} from '../src/storage/progressionStore';

beforeEach(async () => {
  await AsyncStorage.clear();
});

test('empty storage → initial progression', async () => {
  expect(await loadProgression()).toEqual(INITIAL_PROGRESSION);
});

test('save then load round-trips', async () => {
  await saveProgression({defeatedCount: 3, lastWorkoutDate: '2026-07-03'});
  expect(await loadProgression()).toEqual({
    defeatedCount: 3,
    lastWorkoutDate: '2026-07-03',
  });
});

test('corrupt storage → initial progression', async () => {
  await AsyncStorage.setItem('pushuprpg.progression', '{bad json');
  expect(await loadProgression()).toEqual(INITIAL_PROGRESSION);
});

test('non-string date is sanitized to null', async () => {
  await AsyncStorage.setItem(
    'pushuprpg.progression',
    JSON.stringify({defeatedCount: 2, lastWorkoutDate: 5}),
  );
  expect(await loadProgression()).toEqual({defeatedCount: 2, lastWorkoutDate: null});
});
