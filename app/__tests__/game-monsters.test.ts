import {LOCATIONS, MONSTER_SEQUENCE, NODE_POSITIONS} from '../src/game/monsters';

// Полная таблица норм отжиманий по циклам (спека, Приложение A).
const CYCLES = [
  {minions: [6, 7, 8], boss: 8},
  {minions: [8, 9, 10], boss: 9},
  {minions: [9, 10, 11], boss: 10},
  {minions: [10, 11, 12], boss: 12},
  {minions: [11, 12, 13], boss: 13},
  {minions: [12, 13, 14], boss: 14},
  {minions: [13, 14, 15], boss: 15},
  {minions: [14, 15, 16], boss: 16},
  {minions: [15, 16, 17], boss: 18},
  {minions: [16, 17, 18], boss: 20},
];

test('10 locations, each with 3 minions + 1 boss', () => {
  expect(LOCATIONS).toHaveLength(10);
  for (const loc of LOCATIONS) {
    expect(loc.monsters).toHaveLength(4);
    expect(loc.monsters.slice(0, 3).every(m => m.kind === 'minion')).toBe(true);
    expect(loc.monsters[3].kind).toBe('boss');
  }
});

test('flat sequence is 40 monsters in play order', () => {
  expect(MONSTER_SEQUENCE).toHaveLength(40);
  expect(MONSTER_SEQUENCE[0].id).toBe('loc1-m1');
  expect(MONSTER_SEQUENCE[3].id).toBe('loc1-boss');
  expect(MONSTER_SEQUENCE[39].id).toBe('loc10-boss');
});

test('rep targets match all 10 spec cycles', () => {
  CYCLES.forEach((c, i) => {
    const base = i * 4;
    expect(MONSTER_SEQUENCE.slice(base, base + 3).map(m => m.repsPerSet)).toEqual(
      c.minions,
    );
    expect(MONSTER_SEQUENCE[base + 3]).toMatchObject({sets: 3, repsPerSet: c.boss});
  });
});

test('boss 8 rests 180s between sets; all other bosses 0', () => {
  const bosses = MONSTER_SEQUENCE.filter(m => m.kind === 'boss');
  expect(bosses).toHaveLength(10);
  bosses.forEach((b, i) => {
    // cycle 8 = index 7: strict 3-minute rest per spec
    expect(b.restBetweenSetsSec).toBe(i === 7 ? 180 : 0);
  });
});

test('minions are 1 set, bosses are 3 sets; ids unique; cardImage well-formed', () => {
  const ids = new Set(MONSTER_SEQUENCE.map(m => m.id));
  expect(ids.size).toBe(40);
  for (const m of MONSTER_SEQUENCE) {
    expect(m.sets).toBe(m.kind === 'boss' ? 3 : 1);
    expect(m.cardImage).toMatch(/^(10|[1-9])\/.+\.png$/);
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
