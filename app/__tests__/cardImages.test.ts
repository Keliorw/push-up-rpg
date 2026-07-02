import {MONSTER_SEQUENCE} from '../src/game/monsters';
import {MAP_IMAGE, cardImageSource} from '../src/assets/cardImages';

test('every monster has a bundled card image', () => {
  for (const m of MONSTER_SEQUENCE) {
    expect(cardImageSource(m.cardImage)).toBeDefined();
  }
});

test('map image is bundled', () => {
  expect(MAP_IMAGE).toBeDefined();
});
