import {angleDeg} from '../src/pose/geometry';

test('прямая рука — 180°', () => {
  expect(angleDeg({x: 0, y: 0}, {x: 0, y: 1}, {x: 0, y: 2})).toBeCloseTo(180);
});

test('прямой угол — 90°', () => {
  expect(angleDeg({x: 0, y: 0}, {x: 0, y: 1}, {x: 1, y: 1})).toBeCloseTo(90);
});

test('вырожденный случай (совпадающие точки) — 180', () => {
  expect(angleDeg({x: 0, y: 1}, {x: 0, y: 1}, {x: 1, y: 1})).toBe(180);
});
