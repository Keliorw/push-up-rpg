import test from 'node:test';
import assert from 'node:assert/strict';
import {locationLabel} from './levels.ts';

test('начало кампании → локация 1', () => {
  assert.equal(locationLabel(0).index, 1);
});
test('4-й монстр (босс loc1) всё ещё локация 1', () => {
  assert.equal(locationLabel(3).index, 1);
});
test('5-й монстр → локация 2', () => {
  assert.equal(locationLabel(4).index, 2);
});
test('последний монстр → локация 10', () => {
  assert.equal(locationLabel(39).index, 10);
});
test('кампания пройдена → index null', () => {
  const r = locationLabel(40);
  assert.equal(r.index, null);
  assert.equal(r.name, 'Кампания пройдена');
});
test('name непустой для валидной локации', () => {
  assert.ok(locationLabel(0).name.length > 0);
});
