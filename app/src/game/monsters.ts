import {Location, Monster} from './types';

function minion(
  id: string,
  name: string,
  cardImage: string,
  repsPerSet: number,
): Monster {
  return {id, name, kind: 'minion', cardImage, sets: 1, repsPerSet, restBetweenSetsSec: 0};
}

function boss(
  id: string,
  name: string,
  cardImage: string,
  repsPerSet: number,
): Monster {
  return {id, name, kind: 'boss', cardImage, sets: 3, repsPerSet, restBetweenSetsSec: 0};
}

export const LOCATIONS: Location[] = [
  {
    index: 1,
    name: 'Plague Sewers & Slums',
    locked: false,
    monsters: [
      minion('loc1-m1', 'Чумной кабан', '1/kaban.png', 6),
      minion('loc1-m2', 'Чумной летун', '1/mish.png', 7),
      minion('loc1-m3', 'Гробовой червь', '1/chervy.png', 8),
      boss('loc1-boss', 'Королевская Крыса-Переросток', '1/boss.png', 8),
    ],
  },
  {
    index: 2,
    name: 'Wild Goblin War-Camp',
    locked: false,
    monsters: [
      minion('loc2-m1', 'Гоблин с щитом', '2/goblin-shit.png', 8),
      minion('loc2-m2', 'Гоблин-поджигатель', '2/goblin-fire.png', 9),
      minion('loc2-m3', 'Гоблин-шаман', '2/goblin-shaman.png', 10),
      boss('loc2-boss', 'Вождь Диких Гоблинов', '2/boss.png', 9),
    ],
  },
  {
    index: 3,
    name: 'Cursed Undead Crypt',
    locked: false,
    monsters: [
      minion('loc3-m1', 'Проклятый Скелет-Рыцарь', '3/proklyt-skelet-rizar.png', 9),
      minion('loc3-m2', 'Скелет-лучник', '3/skelet-luchnik.png', 10),
      minion('loc3-m3', 'Некромант-ученик', '3/nekromant-ychenik.png', 11),
      boss('loc3-boss', 'Костяной страж', '3/boss.png', 10),
    ],
  },
];

export const MONSTER_SEQUENCE: Monster[] = LOCATIONS.flatMap(l => l.monsters);

/**
 * Центры узлов 1..10 как доли размера картинки карты (768×1376), снизу вверх.
 * Откалибровано по картинке; при необходимости уточняется вручную. Для MVP
 * геймплейно важны только 1–3; 4–10 показываются заблокированными.
 */
// Откалибровано по кружкам на games/map.png (проверено наложением маркеров).
export const NODE_POSITIONS: {x: number; y: number}[] = [
  {x: 0.5, y: 0.915}, // 1  Plague Sewers (низ, центр)
  {x: 0.58, y: 0.805}, // 2  Goblin War-Camp
  {x: 0.42, y: 0.725}, // 3  Undead Crypt
  {x: 0.57, y: 0.645}, // 4  Fetid Swamp
  {x: 0.41, y: 0.56}, // 5  Harpy Cliffs
  {x: 0.57, y: 0.485}, // 6  Minotaur Labyrinth
  {x: 0.46, y: 0.405}, // 7  Iron Fortress
  {x: 0.57, y: 0.325}, // 8  Volcanic Lava
  {x: 0.4, y: 0.25}, // 9  Hellish Chasm
  {x: 0.53, y: 0.185}, // 10 Finale
];
