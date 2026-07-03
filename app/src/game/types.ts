export type MonsterKind = 'minion' | 'boss';

export interface Monster {
  /** Стабильный id, напр. 'loc1-m1', 'loc1-boss'. */
  id: string;
  name: string;
  kind: MonsterKind;
  /** Путь к карточке относительно games/, напр. '1/kaban.png'. */
  cardImage: string;
  /** Приспешник: 1; босс: 3. */
  sets: number;
  /** Норма отжиманий в одном подходе. */
  repsPerSet: number;
  /** Отдых между подходами, сек (0 для локаций 1–3). */
  restBetweenSetsSec: number;
}

export interface Location {
  /** 1..10 */
  index: number;
  name: string;
  /** [m1, m2, m3, boss] */
  monsters: Monster[];
  locked: boolean;
}
