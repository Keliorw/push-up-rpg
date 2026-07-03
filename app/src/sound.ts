import SoundPlayer from 'react-native-sound-player';

/** Звук урона по мобу (каждое отжимание). Ошибка воспроизведения не критична. */
export function playHit(): void {
  try {
    SoundPlayer.playAsset(require('./assets/games/hit.mp3'));
  } catch {
    // ignore
  }
}

/** Трек победы над монстром. */
export function playVictory(): void {
  try {
    SoundPlayer.playAsset(require('./assets/games/victory.mp3'));
  } catch {
    // ignore
  }
}
