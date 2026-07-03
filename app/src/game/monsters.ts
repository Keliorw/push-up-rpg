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
  restBetweenSetsSec = 0,
): Monster {
  return {id, name, kind: 'boss', cardImage, sets: 3, repsPerSet, restBetweenSetsSec};
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
  {
    index: 4,
    name: 'Fetid Fog-Choked Swamp',
    locked: false,
    monsters: [
      minion('loc4-m1', 'Одержимый труп', '4/oderdjimiy-tryp.png', 10),
      minion('loc4-m2', 'Иллюзорный призрак', '4/ilyzonrniy-prizrak.png', 11),
      minion('loc4-m3', 'Гнилостная пиявка', '4/gnilostnay-piyvka.png', 12),
      boss('loc4-boss', 'Болотный Ужас', '4/boss.png', 12),
    ],
  },
  {
    index: 5,
    name: 'Windswept Harpy Cliffs',
    locked: false,
    monsters: [
      minion('loc5-m1', 'Одомашненный грифон', '5/odomashneniy-grifon.png', 11),
      minion('loc5-m2', 'Пикирующая гарпия', '5/pikirushay-garpiy.png', 12),
      minion('loc5-m3', 'Гарпия-сирена', '5/garpiy-sirena.png', 13),
      boss('loc5-boss', 'Королева Гарпий', '5/boss.png', 13),
    ],
  },
  {
    index: 6,
    name: 'Colossal Stone Minotaur Labyrinth',
    locked: false,
    monsters: [
      minion('loc6-m1', 'Бронированный каменотес', '6/bronirovaniy-kamenotas.png', 12),
      minion('loc6-m2', 'Дикий лабиринтный волк', '6/diki-labirintny-volk.png', 13),
      minion('loc6-m3', 'Погонщик гоблинов', '6/pogonshik-goblinov.png', 14),
      boss('loc6-boss', 'Разъяренный Минотавр-Лорд', '6/boss.png', 14),
    ],
  },
  {
    index: 7,
    name: 'Iron Mechanical Fortress',
    locked: false,
    monsters: [
      minion('loc7-m1', 'Каменная горгулья', '7/kamennay-gorguliy.png', 13),
      minion('loc7-m2', 'Заводной паук', '7/zavodnoy-pauk.png', 14),
      minion('loc7-m3', 'Магическая сфера', '7/magicheskay-sfera.png', 15),
      boss('loc7-boss', 'Железный Голем-Разрушитель', '7/boss.png', 15),
    ],
  },
  {
    index: 8,
    name: 'Blazing Volcanic Lava Fields',
    locked: false,
    monsters: [
      minion('loc8-m1', 'Магматический слайм', '8/magmaticheskiy-slaym.png', 14),
      minion('loc8-m2', 'Огненная саламандра', '8/ognenay-salamandra.png', 15),
      minion('loc8-m3', 'Искра жизни', '8/iskra-zhizni.png', 16),
      // Босс 8: отдых между подходами строго 3 минуты (180с) — по ТЗ.
      boss('loc8-boss', 'Повелитель Пламени', '8/boss.png', 16, 180),
    ],
  },
  {
    index: 9,
    name: 'Hellish Infernal Chasm',
    locked: false,
    monsters: [
      minion('loc9-m1', 'Адская гончая', '9/adskay-gonchay.png', 15),
      minion('loc9-m2', 'Бес-мучитель', '9/bas-muchitel.png', 16),
      minion('loc9-m3', 'Суккуб', '9/sukub.png', 17),
      boss('loc9-boss', 'Цербер, Страж Преисподней', '9/boss.png', 18),
    ],
  },
  {
    index: 10,
    name: 'Finale: Blackened Death Mountain',
    locked: false,
    monsters: [
      minion('loc10-m1', 'Драконид-гвардеец', '10/drakonid-gvardeic.png', 16),
      minion('loc10-m2', 'Вылупившийся дракончик', '10/vylupvshijsya-drakonchik.png', 17),
      minion("loc10-m3", 'Культист Дракона', "10/kul'tist-drakon.png", 18),
      boss('loc10-boss', 'Древний Дракон Смерти', '10/drevniy-drakon-smerty.png', 20),
    ],
  },
];

export const MONSTER_SEQUENCE: Monster[] = LOCATIONS.flatMap(l => l.monsters);

/**
 * Центры узлов 1..10 как доли размера картинки карты (768×1376), снизу вверх.
 * Все 10 локаций заполнены контентом. Откалибровано по кружкам на games/map.png
 * (проверено наложением маркеров).
 */
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
