import {LOCATIONS, MONSTER_SEQUENCE} from '../../app/src/game/monsters';

/**
 * По числу побеждённых монстров возвращает локацию текущего (следующего) монстра.
 * Если кампания пройдена — index null.
 */
export function locationLabel(defeatedCount: number): {index: number | null; name: string} {
  const m = MONSTER_SEQUENCE[defeatedCount];
  if (!m) return {index: null, name: 'Кампания пройдена'};
  const match = /^loc(\d+)-/.exec(m.id);
  const index = match ? Number(match[1]) : null;
  const loc = index != null ? LOCATIONS.find(l => l.index === index) : undefined;
  return {index, name: loc ? loc.name : `Локация ${index ?? '?'}`};
}
