import {monsterForExercise} from '../src/game/exercise';
import {Monster} from '../src/game/types';

const monster: Monster = {
  id: 'loc1-m1',
  name: 'Кабан',
  kind: 'minion',
  cardImage: '1/kaban.png',
  sets: 1,
  repsPerSet: 10,
  restBetweenSetsSec: 0,
};

describe('monsterForExercise', () => {
  it('отжимания — исходная цель без изменений', () => {
    expect(monsterForExercise(monster, 'pushups')).toBe(monster);
  });

  it('приседания — ×1.5 с округлением вверх', () => {
    expect(monsterForExercise(monster, 'squats').repsPerSet).toBe(15);
    expect(monsterForExercise({...monster, repsPerSet: 7}, 'squats').repsPerSet).toBe(11);
  });

  it('не меняет остальные поля и не мутирует исходного монстра', () => {
    const boss = {...monster, kind: 'boss' as const, sets: 3, repsPerSet: 12};
    const scaled = monsterForExercise(boss, 'squats');
    expect(scaled).toEqual({...boss, repsPerSet: 18});
    expect(boss.repsPerSet).toBe(12);
  });
});
