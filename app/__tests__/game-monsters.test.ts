import {LOCATIONS, MONSTER_SEQUENCE, NODE_POSITIONS} from '../src/game/monsters';

test('3 locations, each with 3 minions + 1 boss', () => {
  expect(LOCATIONS).toHaveLength(3);
  for (const loc of LOCATIONS) {
    expect(loc.monsters).toHaveLength(4);
    expect(loc.monsters.slice(0, 3).every(m => m.kind === 'minion')).toBe(true);
    expect(loc.monsters[3].kind).toBe('boss');
  }
});

test('flat sequence is 12 monsters in play order', () => {
  expect(MONSTER_SEQUENCE).toHaveLength(12);
  expect(MONSTER_SEQUENCE[0].id).toBe('loc1-m1');
  expect(MONSTER_SEQUENCE[3].id).toBe('loc1-boss');
  expect(MONSTER_SEQUENCE[11].id).toBe('loc3-boss');
});

test('rep targets match the spec cycles', () => {
  // cycle 1 minions 6,7,8 ; boss 3x8
  expect(MONSTER_SEQUENCE.slice(0, 3).map(m => m.repsPerSet)).toEqual([6, 7, 8]);
  expect(MONSTER_SEQUENCE[3]).toMatchObject({sets: 3, repsPerSet: 8});
  // cycle 2 minions 8,9,10 ; boss 3x9
  expect(MONSTER_SEQUENCE.slice(4, 7).map(m => m.repsPerSet)).toEqual([8, 9, 10]);
  expect(MONSTER_SEQUENCE[7]).toMatchObject({sets: 3, repsPerSet: 9});
  // cycle 3 minions 9,10,11 ; boss 3x10
  expect(MONSTER_SEQUENCE.slice(8, 11).map(m => m.repsPerSet)).toEqual([9, 10, 11]);
  expect(MONSTER_SEQUENCE[11]).toMatchObject({sets: 3, repsPerSet: 10});
});

test('minions are 1 set, bosses are 3 sets; ids unique', () => {
  const ids = new Set(MONSTER_SEQUENCE.map(m => m.id));
  expect(ids.size).toBe(12);
  for (const m of MONSTER_SEQUENCE) {
    expect(m.sets).toBe(m.kind === 'boss' ? 3 : 1);
    expect(m.cardImage).toMatch(/^[123]\/.+\.png$/);
  }
});

test('10 node positions as fractions 0..1', () => {
  expect(NODE_POSITIONS).toHaveLength(10);
  for (const p of NODE_POSITIONS) {
    expect(p.x).toBeGreaterThanOrEqual(0);
    expect(p.x).toBeLessThanOrEqual(1);
    expect(p.y).toBeGreaterThanOrEqual(0);
    expect(p.y).toBeLessThanOrEqual(1);
  }
});
