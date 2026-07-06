import {
  ARENA_CONFIG,
  mobHp,
  mobTimerSec,
  arenaMonster,
  newRun,
  onRep,
  onRestDone,
  onTimeout,
} from '../src/game/arena';
import {MONSTER_SEQUENCE} from '../src/game/monsters';

describe('arena формулы', () => {
  test('mobHp растёт на hpStep', () => {
    expect(mobHp(1)).toBe(5);
    expect(mobHp(2)).toBe(7);
    expect(mobHp(10)).toBe(23);
  });

  test('mobTimerSec: минимум базовый, потом HP*secondsPerRep', () => {
    // hp*4: моб1=20→60(min), моб6 hp15*4=60→60, моб7 hp17*4=68→68
    expect(mobTimerSec(1)).toBe(60);
    expect(mobTimerSec(6)).toBe(60);
    expect(mobTimerSec(7)).toBe(68);
    expect(mobTimerSec(10)).toBe(92);
  });

  test('mobTimerSec всегда >= 4 секунды на отжимание', () => {
    for (let n = 1; n <= 30; n++) {
      expect(mobTimerSec(n)).toBeGreaterThanOrEqual(mobHp(n) * ARENA_CONFIG.secondsPerRep);
    }
  });

  test('arenaMonster идёт по кампании и зацикливается', () => {
    expect(arenaMonster(1)).toBe(MONSTER_SEQUENCE[0]);
    expect(arenaMonster(2)).toBe(MONSTER_SEQUENCE[1]);
    const len = MONSTER_SEQUENCE.length;
    expect(arenaMonster(len)).toBe(MONSTER_SEQUENCE[len - 1]);
    expect(arenaMonster(len + 1)).toBe(MONSTER_SEQUENCE[0]); // по кругу
  });
});

describe('arena state-машина', () => {
  test('newRun — первый моб, полный HP, fighting', () => {
    const s = newRun();
    expect(s).toEqual({mobIndex: 1, hpLeft: 5, kills: 0, phase: 'fighting'});
  });

  test('onRep снимает HP, событие hit', () => {
    const r = onRep(newRun());
    expect(r.event).toBe('hit');
    expect(r.state.hpLeft).toBe(4);
    expect(r.state.kills).toBe(0);
  });

  test('последний повтор убивает моба → mobKilled + resting', () => {
    let s = newRun(); // hp 5
    let event = '';
    for (let i = 0; i < 5; i++) {
      const r = onRep(s);
      s = r.state;
      event = r.event;
    }
    expect(event).toBe('mobKilled');
    expect(s.kills).toBe(1);
    expect(s.phase).toBe('resting');
    expect(s.hpLeft).toBe(0);
  });

  test('onRep в фазе resting/over — noop', () => {
    const resting = {mobIndex: 1, hpLeft: 0, kills: 1, phase: 'resting' as const};
    expect(onRep(resting).event).toBe('noop');
    expect(onRep(resting).state).toBe(resting);
    const over = {mobIndex: 3, hpLeft: 2, kills: 2, phase: 'over' as const};
    expect(onRep(over).event).toBe('noop');
  });

  test('onRestDone → следующий моб с новым HP, fighting', () => {
    const resting = {mobIndex: 1, hpLeft: 0, kills: 1, phase: 'resting' as const};
    const s = onRestDone(resting);
    expect(s).toEqual({mobIndex: 2, hpLeft: 7, kills: 1, phase: 'fighting'});
  });

  test('onRestDone вне resting — no-op', () => {
    const fighting = newRun();
    expect(onRestDone(fighting)).toBe(fighting);
  });

  test('onTimeout из fighting → over; иначе без изменений', () => {
    expect(onTimeout(newRun()).phase).toBe('over');
    const resting = {mobIndex: 1, hpLeft: 0, kills: 1, phase: 'resting' as const};
    expect(onTimeout(resting)).toBe(resting);
    const over = {mobIndex: 1, hpLeft: 0, kills: 1, phase: 'over' as const};
    expect(onTimeout(over)).toBe(over);
  });
});
