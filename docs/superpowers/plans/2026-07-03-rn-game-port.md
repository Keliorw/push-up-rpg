# RN Game Port + EAS APK Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Port the game loop (map → enemy card → battle → victory) into native React Native screens reusing the shared TS game core, and configure an EAS cloud build so the user can produce an installable APK.

**Architecture:** A simple state-machine navigation in `app/App.tsx` (`start|map|card|battle|victory`) holding `Progression`. New RN screens (Map, Card, Victory) plus the existing `WorkoutScreen` evolved into the battle screen. All game rules and rep detection come from the already-built pure-TS cores (`app/src/game/*`, `app/src/pose/*`). Assets (map, 12 cards, 2 sounds) are bundled and required via a static registry. Progress persists in AsyncStorage. The APK is built in the cloud via EAS.

**Tech Stack:** React Native 0.86 (TypeScript), react-native-vision-camera v5 + fast-tflite + skia + worklets + reanimated (existing), react-native-sound-player (existing), @react-native-async-storage/async-storage (new), EAS Build (eas-cli, cloud), Jest.

**Spec:** `docs/superpowers/specs/2026-07-03-rn-game-port-design.md`

## Global Constraints

- **Repo:** dedicated `push-up-rpg`, root `/home/keliorw/Projects/Job/push-ups-rpg/push-up-rpg`, branch `push-ups-tracking-mvp`. Normal `git commit` safe; keep pathspec `-- <paths>` on commits.
- **Environment:** Node 22 + npm only — NO Android SDK/emulator/browser here. Verification bar per task: `npx tsc --noEmit` clean (run from `app/`) and `npm test` green. RN screens are NOT unit-tested (native modules don't load in Jest); they're verified by tsc + the user on-device via the APK. The actual EAS build + device run are the user's steps.
- **Content:** locations 1–3 (12 monsters). NO daily limit (play consecutively). No react-navigation (state-machine only). Android only.
- **Reuse, don't reimplement:** `app/src/game/*` (progression, monsters, workout automaton) and `app/src/pose/*` (RepDetector) are DONE — import them, do not change their logic. Reuse the existing `WorkoutScreen` camera/skia frame-processor plumbing for the battle screen.
- **Do NOT modify `web-game/` or `web-demo/`** — they stay as the browser logic tester.
- UI copy in Russian. Visual style: dark `#101828`, accent `#F5A623` (matches existing StartScreen).
- npm for deps. Commits reference exact files.

---

### Task 1: Bundle game assets + static registries + sound helper

**Files:**
- Create: `app/src/assets/games/**` (copied from `web-game/games/**`)
- Create: `app/src/assets/cardImages.ts`
- Create: `app/src/sound.ts`
- Create: `app/__mocks__/fileMock.js`
- Modify: `app/jest.config.js` (add asset moduleNameMapper)
- Test: `app/__tests__/cardImages.test.ts`

**Interfaces:**
- Consumes: `MONSTER_SEQUENCE` from `./game/monsters` (test only).
- Produces:
  - `cardImageSource(cardImage: string): ImageSourcePropType | undefined` and `MAP_IMAGE: ImageSourcePropType` from `app/src/assets/cardImages.ts`.
  - `playHit(): void`, `playVictory(): void` from `app/src/sound.ts`.

- [ ] **Step 1: Copy the assets into the RN app**

```bash
cd /home/keliorw/Projects/Job/push-ups-rpg/push-up-rpg
mkdir -p app/src/assets/games/1 app/src/assets/games/2 app/src/assets/games/3
cp web-game/games/map.png app/src/assets/games/map.png
cp web-game/games/hit.mp3 app/src/assets/games/hit.mp3
cp web-game/games/victory.mp3 app/src/assets/games/victory.mp3
cp web-game/games/1/*.png app/src/assets/games/1/
cp web-game/games/2/*.png app/src/assets/games/2/
cp web-game/games/3/*.png app/src/assets/games/3/
ls -R app/src/assets/games | head -40
```

Expected: `map.png`, `hit.mp3`, `victory.mp3`, and 12 card PNGs under `1/`,`2/`,`3/`.

- [ ] **Step 2: Confirm metro already bundles mp3**

```bash
cd /home/keliorw/Projects/Job/push-ups-rpg/push-up-rpg/app
node -e "const c=require('@react-native/metro-config').getDefaultConfig(__dirname); console.log(c.resolver.assetExts.includes('mp3'))"
```

Expected: `true` (RN's default `assetExts` includes `mp3`, and `metro.config.js` appends `tflite` without dropping defaults). If it prints `false`, add `'mp3'` to the `assetExts` array in `app/metro.config.js` alongside `'tflite'`.

- [ ] **Step 3: Card image registry**

Create `app/src/assets/cardImages.ts`:

```ts
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
```

- [ ] **Step 4: Sound helper**

Create `app/src/sound.ts`:

```ts
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
```

- [ ] **Step 5: Jest asset mock so tests can import the registry**

Create `app/__mocks__/fileMock.js`:

```js
module.exports = 1;
```

In `app/jest.config.js`, add a `moduleNameMapper` mapping asset extensions to that mock so `require('*.png'|'*.mp3')` resolves in node. The file currently looks like `module.exports = { preset: '@react-native/js-polyfills' ... }` or `{ preset: 'react-native' }`; add the key (merge, don't drop the preset):

```js
moduleNameMapper: {
  '\\.(png|jpg|jpeg|gif|mp3|wav|m4a)$': '<rootDir>/__mocks__/fileMock.js',
},
```

(If `app/jest.config.js` does not exist and jest config lives under the `"jest"` key in `app/package.json`, add the same `moduleNameMapper` there instead.)

- [ ] **Step 6: Write the failing test**

Create `app/__tests__/cardImages.test.ts`:

```ts
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
```

- [ ] **Step 7: Run the test**

```bash
cd /home/keliorw/Projects/Job/push-ups-rpg/push-up-rpg/app
npm test -- cardImages
```

Expected: PASS, 2 tests. (If it fails with "Cannot find module './games/....png'", the asset copy in Step 1 or the mock in Step 5 is wrong — fix and re-run.)

- [ ] **Step 8: tsc + commit**

```bash
cd /home/keliorw/Projects/Job/push-ups-rpg/push-up-rpg/app && npx tsc --noEmit
cd /home/keliorw/Projects/Job/push-ups-rpg/push-up-rpg
git add app/src/assets app/src/sound.ts app/__mocks__/fileMock.js app/jest.config.js app/__tests__/cardImages.test.ts
git commit -m "feat(app): bundle game assets, card-image registry, sound helper" -- app/src/assets app/src/sound.ts app/__mocks__/fileMock.js app/jest.config.js app/__tests__/cardImages.test.ts
```

Expected: tsc clean; commit created. (If `metro.config.js` was edited in Step 2, add it to the commit.)

---

### Task 2: Progression persistence (AsyncStorage)

**Files:**
- Modify: `app/package.json` (add dependency)
- Create: `app/src/storage/progressionStore.ts`
- Test: `app/__tests__/progressionStore.test.ts`

**Interfaces:**
- Consumes: `Progression`, `INITIAL_PROGRESSION` from `../game/progression`.
- Produces: `loadProgression(): Promise<Progression>`, `saveProgression(p: Progression): Promise<void>`.

- [ ] **Step 1: Install AsyncStorage**

```bash
cd /home/keliorw/Projects/Job/push-ups-rpg/push-up-rpg/app
npm install @react-native-async-storage/async-storage
```

Expected: installs cleanly. If a peer-version conflict appears, install a version compatible with RN 0.86 (read the message; do not use `--force`).

- [ ] **Step 2: Write the failing test**

Create `app/__tests__/progressionStore.test.ts`:

```ts
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

import AsyncStorage from '@react-native-async-storage/async-storage';
import {INITIAL_PROGRESSION} from '../src/game/progression';
import {loadProgression, saveProgression} from '../src/storage/progressionStore';

beforeEach(async () => {
  await AsyncStorage.clear();
});

test('empty storage → initial progression', async () => {
  expect(await loadProgression()).toEqual(INITIAL_PROGRESSION);
});

test('save then load round-trips', async () => {
  await saveProgression({defeatedCount: 3, lastWorkoutDate: '2026-07-03'});
  expect(await loadProgression()).toEqual({
    defeatedCount: 3,
    lastWorkoutDate: '2026-07-03',
  });
});

test('corrupt storage → initial progression', async () => {
  await AsyncStorage.setItem('pushuprpg.progression', '{bad json');
  expect(await loadProgression()).toEqual(INITIAL_PROGRESSION);
});

test('non-string date is sanitized to null', async () => {
  await AsyncStorage.setItem(
    'pushuprpg.progression',
    JSON.stringify({defeatedCount: 2, lastWorkoutDate: 5}),
  );
  expect(await loadProgression()).toEqual({defeatedCount: 2, lastWorkoutDate: null});
});
```

- [ ] **Step 3: Run test to verify it fails**

```bash
cd /home/keliorw/Projects/Job/push-ups-rpg/push-up-rpg/app
npm test -- progressionStore
```

Expected: FAIL — `Cannot find module '../src/storage/progressionStore'`.

- [ ] **Step 4: Implement**

Create `app/src/storage/progressionStore.ts`:

```ts
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
```

- [ ] **Step 5: Run tests + full suite**

```bash
npm test -- progressionStore
npx tsc --noEmit && npm test 2>&1 | tail -4
```

Expected: 4 progressionStore tests pass; tsc clean; full suite green.

- [ ] **Step 6: Commit**

```bash
cd /home/keliorw/Projects/Job/push-ups-rpg/push-up-rpg
git add app/package.json app/package-lock.json app/src/storage/progressionStore.ts app/__tests__/progressionStore.test.ts
git commit -m "feat(app): progression persistence via AsyncStorage" -- app/package.json app/package-lock.json app/src/storage/progressionStore.ts app/__tests__/progressionStore.test.ts
```

---

### Task 3: Navigation shell — App state machine + Start→map + Map/Card/Victory stubs

**Files:**
- Modify: `app/App.tsx` (full replacement)
- Create: `app/src/screens/MapScreen.tsx` (stub)
- Create: `app/src/screens/CardScreen.tsx` (stub)
- Create: `app/src/screens/VictoryScreen.tsx` (real — it's tiny)
- Modify: `app/src/screens/StartScreen.tsx` (no code change needed if it already calls `onStart`; verify)

**Interfaces:**
- Consumes: `StartScreen({onStart})` (exists); `Progression`, `INITIAL_PROGRESSION` from `./src/game/progression`; `loadProgression`/`saveProgression` from `./src/storage/progressionStore`; existing `WorkoutScreen({onExit})`.
- Produces:
  - `MapScreen({progression, onSelect}: {progression: Progression; onSelect: () => void})`
  - `CardScreen({progression, onStart, onBack}: {progression: Progression; onStart: () => void; onBack: () => void})`
  - `VictoryScreen({name, onContinue}: {name: string; onContinue: () => void})`
  - App renders `start|map|card|battle|victory`; `battle` routes to the existing `WorkoutScreen` (onExit→map) for now (battle wiring is Task 6).

- [ ] **Step 1: Verify StartScreen already exposes `onStart`**

```bash
cd /home/keliorw/Projects/Job/push-ups-rpg/push-up-rpg
grep -n "onStart" app/src/screens/StartScreen.tsx
```

Expected: `StartScreen({onStart}: {onStart: () => void})` present. No change needed.

- [ ] **Step 2: Stub screens**

Create `app/src/screens/MapScreen.tsx`:

```tsx
import React from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {Progression} from '../game/progression';

export function MapScreen({
  progression: _progression,
  onSelect,
}: {
  progression: Progression;
  onSelect: () => void;
}) {
  return (
    <View style={styles.root}>
      <Text style={styles.text}>Карта — в разработке (Task 4)</Text>
      <Pressable style={styles.btn} onPress={onSelect}>
        <Text style={styles.btnText}>К бою</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {flex: 1, backgroundColor: '#101828', alignItems: 'center', justifyContent: 'center', gap: 24},
  text: {color: '#fff', fontSize: 16},
  btn: {backgroundColor: '#F5A623', paddingHorizontal: 32, paddingVertical: 12, borderRadius: 24},
  btnText: {color: '#101828', fontWeight: '800', fontSize: 16},
});
```

Create `app/src/screens/CardScreen.tsx`:

```tsx
import React from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {Progression} from '../game/progression';

export function CardScreen({
  progression: _progression,
  onStart,
  onBack,
}: {
  progression: Progression;
  onStart: () => void;
  onBack: () => void;
}) {
  return (
    <View style={styles.root}>
      <Text style={styles.text}>Карточка врага — в разработке (Task 5)</Text>
      <Pressable style={styles.btn} onPress={onStart}>
        <Text style={styles.btnText}>Начать тренировку</Text>
      </Pressable>
      <Pressable style={styles.btnDark} onPress={onBack}>
        <Text style={styles.btnText}>Назад</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {flex: 1, backgroundColor: '#101828', alignItems: 'center', justifyContent: 'center', gap: 16},
  text: {color: '#fff', fontSize: 16},
  btn: {backgroundColor: '#F5A623', paddingHorizontal: 32, paddingVertical: 12, borderRadius: 24},
  btnDark: {backgroundColor: '#24314a', paddingHorizontal: 32, paddingVertical: 12, borderRadius: 24},
  btnText: {color: '#fff', fontWeight: '800', fontSize: 16},
});
```

Create `app/src/screens/VictoryScreen.tsx` (real — small):

```tsx
import React from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';

export function VictoryScreen({
  name,
  onContinue,
}: {
  name: string;
  onContinue: () => void;
}) {
  return (
    <View style={styles.root}>
      <Text style={styles.title}>Повержен!</Text>
      {name ? <Text style={styles.name}>{name}</Text> : null}
      <Pressable style={styles.btn} onPress={onContinue}>
        <Text style={styles.btnText}>На карту</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {flex: 1, backgroundColor: '#101828', alignItems: 'center', justifyContent: 'center', gap: 20},
  title: {color: '#F5A623', fontSize: 40, fontWeight: '900'},
  name: {color: '#fff', fontSize: 18},
  btn: {backgroundColor: '#F5A623', paddingHorizontal: 48, paddingVertical: 16, borderRadius: 40, marginTop: 16},
  btnText: {color: '#101828', fontWeight: '800', fontSize: 18},
});
```

- [ ] **Step 3: App navigation**

Replace `app/App.tsx`:

```tsx
import React, {useEffect, useState} from 'react';
import {StatusBar} from 'react-native';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {StartScreen} from './src/screens/StartScreen';
import {MapScreen} from './src/screens/MapScreen';
import {CardScreen} from './src/screens/CardScreen';
import {WorkoutScreen} from './src/screens/WorkoutScreen';
import {VictoryScreen} from './src/screens/VictoryScreen';
import {INITIAL_PROGRESSION, Progression} from './src/game/progression';
import {loadProgression} from './src/storage/progressionStore';

type Screen = 'start' | 'map' | 'card' | 'battle' | 'victory';

export default function App() {
  const [screen, setScreen] = useState<Screen>('start');
  const [progression, setProgression] = useState<Progression>(INITIAL_PROGRESSION);
  const [defeatedName] = useState('');

  useEffect(() => {
    loadProgression().then(setProgression);
  }, []);

  return (
    <SafeAreaProvider>
      <StatusBar barStyle="light-content" />
      {screen === 'start' && <StartScreen onStart={() => setScreen('map')} />}
      {screen === 'map' && (
        <MapScreen progression={progression} onSelect={() => setScreen('card')} />
      )}
      {screen === 'card' && (
        <CardScreen
          progression={progression}
          onStart={() => setScreen('battle')}
          onBack={() => setScreen('map')}
        />
      )}
      {screen === 'battle' && <WorkoutScreen onExit={() => setScreen('map')} />}
      {screen === 'victory' && (
        <VictoryScreen name={defeatedName} onContinue={() => setScreen('map')} />
      )}
    </SafeAreaProvider>
  );
}
```

- [ ] **Step 4: tsc + tests + commit**

```bash
cd /home/keliorw/Projects/Job/push-ups-rpg/push-up-rpg/app && npx tsc --noEmit && npm test 2>&1 | tail -4
cd /home/keliorw/Projects/Job/push-ups-rpg/push-up-rpg
git add app/App.tsx app/src/screens/MapScreen.tsx app/src/screens/CardScreen.tsx app/src/screens/VictoryScreen.tsx
git commit -m "feat(app): screen state-machine navigation with map/card/victory" -- app/App.tsx app/src/screens/MapScreen.tsx app/src/screens/CardScreen.tsx app/src/screens/VictoryScreen.tsx
```

Expected: tsc clean; full suite still green.

---

### Task 4: MapScreen — map image + node markers + tap current

**Files:**
- Modify: `app/src/screens/MapScreen.tsx` (replace stub)

**Interfaces:**
- Consumes: `MapScreen({progression, onSelect})` contract from Task 3; `MAP_IMAGE` from `../assets/cardImages`; `LOCATIONS`, `NODE_POSITIONS` from `../game/monsters`; `currentMonster` from `../game/progression`.
- Produces: the real map screen — draws numbered node markers over the map image; the current location's node is a `Pressable` calling `onSelect`.

- [ ] **Step 1: Implement MapScreen**

Replace `app/src/screens/MapScreen.tsx`:

```tsx
import React, {useState} from 'react';
import {
  Image,
  LayoutChangeEvent,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {MAP_IMAGE} from '../assets/cardImages';
import {LOCATIONS, NODE_POSITIONS} from '../game/monsters';
import {Progression, currentMonster} from '../game/progression';

function currentLocationIndex(p: Progression): number | null {
  const m = currentMonster(p);
  if (!m) {
    return null;
  }
  const match = /^loc(\d+)-/.exec(m.id);
  return match ? Number(match[1]) : null;
}

export function MapScreen({
  progression,
  onSelect,
}: {
  progression: Progression;
  onSelect: () => void;
}) {
  const [size, setSize] = useState({w: 0, h: 0});
  const onLayout = (e: LayoutChangeEvent) => {
    const {width, height} = e.nativeEvent.layout;
    setSize({w: width, h: height});
  };
  const curLoc = currentLocationIndex(progression);

  return (
    <View style={styles.root}>
      <View style={styles.wrap} onLayout={onLayout}>
        <Image source={MAP_IMAGE} style={styles.map} resizeMode="cover" />
        {size.w > 0 &&
          NODE_POSITIONS.map((pos, i) => {
            const locIndex = i + 1;
            const hasContent = locIndex <= LOCATIONS.length;
            let state: 'done' | 'current' | 'locked' = 'locked';
            if (curLoc === null) {
              state = hasContent ? 'done' : 'locked';
            } else if (locIndex < curLoc) {
              state = 'done';
            } else if (locIndex === curLoc && hasContent) {
              state = 'current';
            }
            const left = pos.x * size.w - 18;
            const top = pos.y * size.h - 18;
            const marker = (
              <View
                style={[
                  styles.node,
                  state === 'done' && styles.nodeDone,
                  state === 'current' && styles.nodeCurrent,
                  state === 'locked' && styles.nodeLocked,
                ]}>
                <Text style={styles.nodeText}>{locIndex}</Text>
              </View>
            );
            if (state === 'current') {
              return (
                <Pressable
                  key={locIndex}
                  onPress={onSelect}
                  style={[styles.nodeWrap, {left, top}]}>
                  {marker}
                </Pressable>
              );
            }
            return (
              <View key={locIndex} style={[styles.nodeWrap, {left, top}]}>
                {marker}
              </View>
            );
          })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {flex: 1, backgroundColor: '#101828'},
  wrap: {flex: 1, width: '100%'},
  map: {width: '100%', height: '100%'},
  nodeWrap: {position: 'absolute', width: 36, height: 36},
  node: {
    width: 36, height: 36, borderRadius: 18, borderWidth: 3, borderColor: '#fff',
    backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center',
  },
  nodeDone: {backgroundColor: '#2e7d32'},
  nodeCurrent: {borderColor: '#F5A623'},
  nodeLocked: {opacity: 0.55},
  nodeText: {color: '#fff', fontWeight: '800', fontSize: 16},
});
```

- [ ] **Step 2: tsc + commit**

```bash
cd /home/keliorw/Projects/Job/push-ups-rpg/push-up-rpg/app && npx tsc --noEmit
cd /home/keliorw/Projects/Job/push-ups-rpg/push-up-rpg
git add app/src/screens/MapScreen.tsx
git commit -m "feat(app): map screen with node markers over the map image" -- app/src/screens/MapScreen.tsx
```

Expected: tsc clean. (Visual check is on-device via the APK.)

---

### Task 5: CardScreen — enemy card image + target + HP

**Files:**
- Modify: `app/src/screens/CardScreen.tsx` (replace stub)

**Interfaces:**
- Consumes: `CardScreen({progression, onStart, onBack})` contract from Task 3; `cardImageSource` from `../assets/cardImages`; `currentMonster` from `../game/progression`; `totalTarget` from `../game/workout`.
- Produces: the real card screen — shows the current monster's card image, its rep target, a full HP bar, and Start/Back buttons.

- [ ] **Step 1: Implement CardScreen**

Replace `app/src/screens/CardScreen.tsx`:

```tsx
import React from 'react';
import {Image, Pressable, StyleSheet, Text, View} from 'react-native';
import {cardImageSource} from '../assets/cardImages';
import {Progression, currentMonster} from '../game/progression';
import {totalTarget} from '../game/workout';

export function CardScreen({
  progression,
  onStart,
  onBack,
}: {
  progression: Progression;
  onStart: () => void;
  onBack: () => void;
}) {
  const m = currentMonster(progression);

  if (!m) {
    return (
      <View style={styles.root}>
        <Text style={styles.target}>Все враги повержены!</Text>
        <Pressable style={styles.btnDark} onPress={onBack}>
          <Text style={styles.btnText}>Назад</Text>
        </Pressable>
      </View>
    );
  }

  const src = cardImageSource(m.cardImage);
  const target =
    m.kind === 'boss'
      ? `БОСС: ${m.sets} подхода × ${m.repsPerSet} (всего ${totalTarget(m)})`
      : `Победи: ${m.repsPerSet} отжиманий`;

  return (
    <View style={styles.root}>
      {src ? <Image source={src} style={styles.card} resizeMode="contain" /> : null}
      <Text style={styles.target}>{target}</Text>
      <View style={styles.hpbar}>
        <View style={styles.hpfill} />
      </View>
      <Pressable style={styles.btn} onPress={onStart}>
        <Text style={styles.btnTextDark}>Начать тренировку</Text>
      </Pressable>
      <Pressable style={styles.btnDark} onPress={onBack}>
        <Text style={styles.btnText}>Назад</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {flex: 1, backgroundColor: '#101828', alignItems: 'center', justifyContent: 'center', padding: 16, gap: 12},
  card: {width: '92%', aspectRatio: 1, borderRadius: 12},
  target: {color: '#fff', fontSize: 18, textAlign: 'center'},
  hpbar: {width: '80%', height: 16, backgroundColor: '#333', borderRadius: 8, overflow: 'hidden'},
  hpfill: {width: '100%', height: '100%', backgroundColor: '#d64545'},
  btn: {backgroundColor: '#F5A623', paddingHorizontal: 40, paddingVertical: 16, borderRadius: 40},
  btnDark: {backgroundColor: '#24314a', paddingHorizontal: 40, paddingVertical: 12, borderRadius: 40},
  btnText: {color: '#fff', fontWeight: '800', fontSize: 16},
  btnTextDark: {color: '#101828', fontWeight: '800', fontSize: 18},
});
```

- [ ] **Step 2: tsc + commit**

```bash
cd /home/keliorw/Projects/Job/push-ups-rpg/push-up-rpg/app && npx tsc --noEmit
cd /home/keliorw/Projects/Job/push-ups-rpg/push-up-rpg
git add app/src/screens/CardScreen.tsx
git commit -m "feat(app): enemy card screen with target and HP" -- app/src/screens/CardScreen.tsx
```

---

### Task 6: BattleScreen — evolve WorkoutScreen into the game battle + wire App

**Files:**
- Modify: `app/src/screens/WorkoutScreen.tsx` (add battle props, game automaton, HUD, sounds)
- Modify: `app/App.tsx` (pass `progression`/`onDefeated` to the battle screen; add `onDefeated`)

**Interfaces:**
- Consumes: existing `WorkoutScreen` camera/skia frame-processor code; `RepDetector`/`DEFAULT_CONFIG`/`Pose`/`KP` (already imported there); `currentMonster` from `../game/progression`; `newWorkout`/`onRep`/`totalTarget`/`WorkoutState` from `../game/workout`; `cardImageSource` from `../assets/cardImages`; `playHit` from `../sound`; `defeatMonster`/`currentMonster` + `saveProgression` + `playVictory` in App.
- Produces: `WorkoutScreen({progression, onDefeated, onExit}: {progression: Progression; onDefeated: () => void; onExit: () => void})` — battle screen wired to the game automaton; on `monsterDefeated` calls `onDefeated`.

- [ ] **Step 1: Read the current WorkoutScreen**

```bash
sed -n '1,60p' /home/keliorw/Projects/Job/push-ups-rpg/push-up-rpg/app/src/screens/WorkoutScreen.tsx
```

Understand its existing structure: it uses `useCameraPermission`, `useCameraDevice('front')`, `useTensorflowModel`, a `useFrameOutput` worklet building a `Pose`, a `runOnJS` hop into `useWorkoutSession().onPose`, a Skia `<Canvas>` overlay, and a rep counter + "Займите упор лёжа" hint. The camera/skia/worklet plumbing is REUSED unchanged. Only the JS-side consumption of poses and the HUD change: instead of `useWorkoutSession`, feed each counted rep into the game automaton.

- [ ] **Step 2: Change the component signature and rep handling**

In `app/src/screens/WorkoutScreen.tsx`:

1. Change the signature to `export function WorkoutScreen({progression, onDefeated, onExit}: {progression: Progression; onDefeated: () => void; onExit: () => void})`.
2. Add imports at the top:

```tsx
import {Image} from 'react-native';
import {Progression, currentMonster} from '../game/progression';
import {
  WorkoutState,
  newWorkout,
  onRep,
  totalTarget,
} from '../game/workout';
import {cardImageSource} from '../assets/cardImages';
import {playHit} from '../sound';
```

3. Replace the `useWorkoutSession()` usage with local battle state. Near the top of the component body add:

```tsx
const monster = currentMonster(progression);
const wkRef = React.useRef<WorkoutState | null>(null);
if (monster && wkRef.current === null) {
  wkRef.current = newWorkout(monster);
}
const [reps, setReps] = React.useState(0);
const [setIndex, setSetIndex] = React.useState(0);
const [hp, setHp] = React.useState(monster ? totalTarget(monster) : 0);
const [elapsed, setElapsed] = React.useState(0);
const startRef = React.useRef(Date.now());
const doneRef = React.useRef(false);

React.useEffect(() => {
  const id = setInterval(() => setElapsed(Date.now() - startRef.current), 250);
  return () => clearInterval(id);
}, []);

const onPose = React.useCallback(
  (pose: Pose) => {
    if (!monster || doneRef.current || wkRef.current === null) {
      return;
    }
    // detectorRef is the existing per-screen RepDetector instance (see step 4)
    const events = detectorRef.current!.process(pose, Date.now());
    for (const e of events) {
      if (e !== 'repCounted') {
        continue;
      }
      const res = onRep(wkRef.current!, monster);
      wkRef.current = res.state;
      setReps(res.state.repsInSet);
      setSetIndex(res.state.setIndex);
      setHp(Math.max(0, totalTarget(monster) - res.state.totalReps));
      playHit();
      if (res.event === 'monsterDefeated') {
        doneRef.current = true;
        onDefeated();
      }
    }
  },
  [monster, onDefeated],
);
```

4. Add a `detectorRef` (lazy `RepDetector`) if the existing code created the detector inside `useWorkoutSession`; add near the other refs:

```tsx
const detectorRef = React.useRef<RepDetector | null>(null);
if (detectorRef.current === null) {
  detectorRef.current = new RepDetector(DEFAULT_CONFIG);
}
```

5. The existing worklet already calls `runOnJS(onPoseJS)(pose)` where `onPoseJS` wraps the session `onPose`. Point it at the new `onPose` above (keep the `useRunOnJS`/`runOnJS` wiring exactly as it already is — only the target function changes). Remove the `useWorkoutSession` import and call.

- [ ] **Step 3: Replace the HUD JSX with the battle HUD**

Replace the counter/hint overlay JSX (the `<View>` containing the big `reps` Text and the "Займите упор лёжа" hint) — AND the existing top-right exit `Pressable` — with the battle HUD below (the battle HUD provides its own `battle.exit` ✕, so remove the old exit button to avoid a duplicate). Keep the `<Camera>` and Skia `<Canvas>` overlay exactly as they are; render this HUD as absolutely-positioned siblings over them. Also keep the existing permission-denied / no-device / model-error fallback screens unchanged:

```tsx
{monster && (
  <>
    {/* TIME — слева сверху */}
    <View style={battle.timeBox}>
      <Text style={battle.timeLbl}>TIME</Text>
      <Text style={battle.time}>{fmtTime(elapsed)}</Text>
    </View>
    {/* Выход — справа сверху */}
    <Pressable style={battle.exit} onPress={onExit}>
      <Text style={battle.exitText}>✕</Text>
    </Pressable>
    {/* Карточка монстра — центр сверху */}
    <View style={battle.card} pointerEvents="none">
      {cardImageSource(monster.cardImage) ? (
        <Image source={cardImageSource(monster.cardImage)!} style={battle.cardImg} resizeMode="cover" />
      ) : null}
      <Text style={battle.cardName}>{monster.name}</Text>
    </View>
    {/* HP-бар */}
    <View style={battle.hpWrap} pointerEvents="none">
      <View style={[battle.hpFill, {width: `${(hp / totalTarget(monster)) * 100}%`}]} />
      <Text style={battle.hpText}>{hp} / {totalTarget(monster)} HP</Text>
    </View>
    {monster.sets > 1 && (
      <Text style={battle.setText} pointerEvents="none">
        Сет {setIndex + 1}/{monster.sets} · цель {monster.repsPerSet}
      </Text>
    )}
    {/* Золотой счётчик — снизу центр */}
    <View style={battle.counter} pointerEvents="none">
      <Text style={battle.counterText}>{reps}</Text>
    </View>
  </>
)}
```

Add `fmtTime` above the component:

```tsx
function fmtTime(ms: number): string {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
```

Add the `battle` StyleSheet (near the existing styles):

```tsx
const battle = StyleSheet.create({
  timeBox: {position: 'absolute', top: 12, left: 12, backgroundColor: 'rgba(11,17,31,0.85)', borderColor: '#3a4a67', borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, alignItems: 'center'},
  timeLbl: {color: '#9aa4b2', fontSize: 9, letterSpacing: 2},
  time: {color: '#fff', fontSize: 18, fontWeight: '800'},
  exit: {position: 'absolute', top: 12, right: 12, width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(11,17,31,0.85)', borderColor: '#3a4a67', borderWidth: 1, alignItems: 'center', justifyContent: 'center'},
  exitText: {color: '#fff', fontSize: 18},
  card: {position: 'absolute', top: 10, alignSelf: 'center', width: 120, backgroundColor: 'rgba(11,17,31,0.85)', borderColor: '#F5A623', borderWidth: 1, borderRadius: 10, padding: 6, alignItems: 'center'},
  cardImg: {width: 104, height: 104, borderRadius: 6},
  cardName: {color: '#fff', fontSize: 12, fontWeight: '800', marginTop: 3, textAlign: 'center'},
  hpWrap: {position: 'absolute', top: 184, alignSelf: 'center', width: 200, height: 20, backgroundColor: '#3a0f0f', borderRadius: 4, borderColor: '#000', borderWidth: 1, overflow: 'hidden', justifyContent: 'center'},
  hpFill: {position: 'absolute', left: 0, top: 0, bottom: 0, backgroundColor: '#d64545'},
  hpText: {color: '#fff', fontSize: 12, fontWeight: '800', textAlign: 'center'},
  setText: {position: 'absolute', top: 208, alignSelf: 'center', color: '#F5A623', fontSize: 13, fontWeight: '700'},
  counter: {position: 'absolute', bottom: 24, alignSelf: 'center', width: 96, height: 96, borderRadius: 48, backgroundColor: '#F5A623', alignItems: 'center', justifyContent: 'center'},
  counterText: {color: '#101828', fontSize: 46, fontWeight: '900'},
});
```

- [ ] **Step 4: Wire App to pass battle props**

In `app/App.tsx`: replace the `battle` line and add `onDefeated` + defeated-name state:

```tsx
// imports:
import {currentMonster, defeatMonster, INITIAL_PROGRESSION, Progression} from './src/game/progression';
import {loadProgression, saveProgression} from './src/storage/progressionStore';
import {playVictory} from './src/sound';

// inside App, replace `const [defeatedName] = useState('')` with:
const [defeatedName, setDefeatedName] = useState('');

const onDefeated = () => {
  setProgression(prev => {
    const m = currentMonster(prev);
    setDefeatedName(m ? m.name : '');
    const next = defeatMonster(prev, new Date().toISOString().slice(0, 10));
    saveProgression(next);
    return next;
  });
  playVictory();
  setScreen('victory');
};

// battle render:
{screen === 'battle' && (
  <WorkoutScreen
    progression={progression}
    onDefeated={onDefeated}
    onExit={() => setScreen('map')}
  />
)}
```

- [ ] **Step 5: tsc + tests + commit**

```bash
cd /home/keliorw/Projects/Job/push-ups-rpg/push-up-rpg/app && npx tsc --noEmit && npm test 2>&1 | tail -4
cd /home/keliorw/Projects/Job/push-ups-rpg/push-up-rpg
git add app/src/screens/WorkoutScreen.tsx app/App.tsx
git commit -m "feat(app): battle screen wiring detector to game automaton + HUD + sounds" -- app/src/screens/WorkoutScreen.tsx app/App.tsx
```

Expected: tsc clean; full suite green (game core unchanged). If tsc flags the `runOnJS` target type or a Frame API detail, adapt to the actual installed `.d.ts` (do not use broad `any`); the camera plumbing itself is unchanged from the working WorkoutScreen.

---

### Task 7: EAS Build configuration + build instructions

**Files:**
- Create: `eas.json` (repo root — same dir as `app/`? see step 1)
- Modify: `app/package.json` (add `expo` + eas-related deps if required by EAS for bare RN)
- Create: `docs/EAS-BUILD.md` (build instructions for the user)

**Interfaces:**
- Consumes: the RN app in `app/`.
- Produces: an EAS build profile that yields an installable Android APK, and documented steps the user runs (`eas login`, `eas build`).

- [ ] **Step 1: Determine the EAS project root and install eas tooling**

EAS operates on the RN project directory (`app/`, which contains `android/`, `ios/`, `package.json`). Run all EAS commands from `app/`.

```bash
cd /home/keliorw/Projects/Job/push-ups-rpg/push-up-rpg/app
npm install --save-dev eas-cli
npx eas --version
```

Expected: eas-cli version prints. (If `npm install eas-cli` is heavy/slow, it may instead be run via `npx eas-cli@latest` at build time — either is fine; document whichever is used.)

- [ ] **Step 2: Add the EAS build profile**

Create `app/eas.json`:

```json
{
  "cli": {
    "version": ">= 12.0.0",
    "appVersionSource": "remote"
  },
  "build": {
    "preview": {
      "distribution": "internal",
      "android": {
        "buildType": "apk"
      }
    }
  }
}
```

- [ ] **Step 3: Ensure the bare RN project is EAS-buildable**

EAS Build for a bare React Native project builds the existing `android/` Gradle project in the cloud. Verify the app has an Android application id and that the native modules autolink. If `eas build` later reports it needs the `expo` package for config resolution, install it:

```bash
cd /home/keliorw/Projects/Job/push-ups-rpg/push-up-rpg/app
# only if EAS asks for it:
# npx expo install expo
```

Document in `docs/EAS-BUILD.md` that this may be required. Do NOT run a real build here (needs the user's Expo account + cloud); tsc/tests are the local bar.

- [ ] **Step 4: Write the build instructions**

Create `docs/EAS-BUILD.md`:

```md
# Сборка APK через EAS (облако)

Собирает установочный APK в облаке Expo — локальный Android SDK не нужен.

## Один раз
1. Аккаунт Expo: https://expo.dev (бесплатный).
2. Из папки `app/`:
   ```
   cd app
   npx eas login          # войти в аккаунт Expo
   ```

## Сборка
```
cd app
npx eas build -p android --profile preview
```
EAS соберёт APK в облаке и даст ссылку на скачивание. Скачай .apk на телефон и установи (разреши установку из неизвестных источников).

## Если сборка падает
Стек нативный и новый (vision-camera v5 / Nitro / New Architecture) — возможны правки:
- Если EAS просит пакет `expo`: `npx expo install expo`, затем повторить сборку.
- Ошибки автолинковки/версий native-модулей — смотреть лог сборки EAS, поправить версии в `app/package.json`.
- Это ожидаемо для первого прохода: нативную сборку этого стека раньше не собирали.

## Тест на устройстве
После установки APK: START → карта → узел 1 → карточка → тренировка (камера, отжимания), победа → следующий монстр. Прогресс сохраняется (AsyncStorage).
```

- [ ] **Step 5: tsc + commit**

```bash
cd /home/keliorw/Projects/Job/push-ups-rpg/push-up-rpg/app && npx tsc --noEmit
cd /home/keliorw/Projects/Job/push-ups-rpg/push-up-rpg
git add app/eas.json app/package.json app/package-lock.json docs/EAS-BUILD.md
git commit -m "chore(app): EAS build profile (Android APK) + build docs" -- app/eas.json app/package.json app/package-lock.json docs/EAS-BUILD.md
```

---

## Notes for the implementer

- The camera/Skia/worklet plumbing inside `WorkoutScreen` is hard-won and already builds tsc-clean — in Task 6 REUSE it verbatim; only swap the pose consumer (from `useWorkoutSession` to the game automaton) and the HUD JSX/styles. Do not rewrite the frame processor.
- `WorkoutScreen`'s existing test does not exist (App.test.tsx was removed earlier; native camera modules don't load in Jest), so battle-screen verification is tsc + on-device.
- The `useWorkoutSession` hook (`app/src/session/`) becomes unused after Task 6. Leave it in place (it's still covered by `sessionState.test.ts`); do not delete it in this plan unless a later cleanup task is added.
- On-device is the only place the battle screen, camera, sounds, and EAS build are truly verified — the user does that after the APK builds.
