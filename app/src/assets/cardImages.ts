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
  '4/oderdjimiy-tryp.png': require('./games/4/oderdjimiy-tryp.png'),
  '4/ilyzonrniy-prizrak.png': require('./games/4/ilyzonrniy-prizrak.png'),
  '4/gnilostnay-piyvka.png': require('./games/4/gnilostnay-piyvka.png'),
  '4/boss.png': require('./games/4/boss.png'),
  '5/odomashneniy-grifon.png': require('./games/5/odomashneniy-grifon.png'),
  '5/pikirushay-garpiy.png': require('./games/5/pikirushay-garpiy.png'),
  '5/garpiy-sirena.png': require('./games/5/garpiy-sirena.png'),
  '5/boss.png': require('./games/5/boss.png'),
  '6/bronirovaniy-kamenotas.png': require('./games/6/bronirovaniy-kamenotas.png'),
  '6/diki-labirintny-volk.png': require('./games/6/diki-labirintny-volk.png'),
  '6/pogonshik-goblinov.png': require('./games/6/pogonshik-goblinov.png'),
  '6/boss.png': require('./games/6/boss.png'),
  '7/kamennay-gorguliy.png': require('./games/7/kamennay-gorguliy.png'),
  '7/zavodnoy-pauk.png': require('./games/7/zavodnoy-pauk.png'),
  '7/magicheskay-sfera.png': require('./games/7/magicheskay-sfera.png'),
  '7/boss.png': require('./games/7/boss.png'),
  '8/magmaticheskiy-slaym.png': require('./games/8/magmaticheskiy-slaym.png'),
  '8/ognenay-salamandra.png': require('./games/8/ognenay-salamandra.png'),
  '8/iskra-zhizni.png': require('./games/8/iskra-zhizni.png'),
  '8/boss.png': require('./games/8/boss.png'),
  '9/adskay-gonchay.png': require('./games/9/adskay-gonchay.png'),
  '9/bas-muchitel.png': require('./games/9/bas-muchitel.png'),
  '9/sukub.png': require('./games/9/sukub.png'),
  '9/boss.png': require('./games/9/boss.png'),
  '10/drakonid-gvardeic.png': require('./games/10/drakonid-gvardeic.png'),
  '10/vylupvshijsya-drakonchik.png': require('./games/10/vylupvshijsya-drakonchik.png'),
  "10/kul'tist-drakon.png": require("./games/10/kul'tist-drakon.png"),
  '10/drevniy-drakon-smerty.png': require('./games/10/drevniy-drakon-smerty.png'),
};

export function cardImageSource(
  cardImage: string,
): ImageSourcePropType | undefined {
  return CARD_IMAGES[cardImage];
}

export const MAP_IMAGE: ImageSourcePropType = require('./games/map.png');
