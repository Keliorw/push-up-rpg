import AsyncStorage from '@react-native-async-storage/async-storage';
import {INITIAL_PROGRESSION, Progression} from '../game/progression';

const KEY = 'pushuprpg.progression';

export async function loadProgression(): Promise<Progression> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) {
      return INITIAL_PROGRESSION;
    }
    const p = JSON.parse(raw) as Progression;
    if (typeof p.defeatedCount === 'number' && Number.isFinite(p.defeatedCount)) {
      return {
        defeatedCount: Math.max(0, Math.floor(p.defeatedCount)),
        lastWorkoutDate:
          typeof p.lastWorkoutDate === 'string' ? p.lastWorkoutDate : null,
      };
    }
  } catch {
    // corrupt storage → fall through to default
  }
  return INITIAL_PROGRESSION;
}

export async function saveProgression(p: Progression): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    // persistence is best-effort
  }
}
