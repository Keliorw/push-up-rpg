import type {ImageSourcePropType} from 'react-native';

// Статический реестр: RN require() должен быть литералом, поэтому перечисляем
// все карточки явно. Ключи = Monster.cardImage из app/src/game/monsters.ts.
const CARD_IMAGES: Record<string, ImageSourcePropType> = {
  '1/kaban.png': require('./games/1/kaban.png'),
  '1/mish.png': require('./games/1/mish.png'),
  '1/chervy.png': require('./games/1/chervy.png'),
  '1/boss.png': require('./games/1/boss.png'),
  '2/goblin-shit.png': require('./games/2/goblin-shit.png'),
  '2/goblin-fire.png': require('./games/2/goblin-fire.png'),
  '2/goblin-shaman.png': require('./games/2/goblin-shaman.png'),
  '2/boss.png': require('./games/2/boss.png'),
  '3/proklyt-skelet-rizar.png': require('./games/3/proklyt-skelet-rizar.png'),
  '3/skelet-luchnik.png': require('./games/3/skelet-luchnik.png'),
  '3/nekromant-ychenik.png': require('./games/3/nekromant-ychenik.png'),
  '3/boss.png': require('./games/3/boss.png'),
};

export function cardImageSource(
  cardImage: string,
): ImageSourcePropType | undefined {
  return CARD_IMAGES[cardImage];
}

export const MAP_IMAGE: ImageSourcePropType = require('./games/map.png');
