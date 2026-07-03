# Game Progression Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A playable browser prototype of the push-up RPG game loop — map → enemy card → workout → victory → advance — over 12 monsters (locations 1–3), driven by real push-ups, backed by a pure-TS game core.

**Architecture:** A pure-TypeScript game core in `app/src/game/` (monster data, progression, daily lock, workout state machine) covered by Jest. A browser prototype in `web-game/` renders the screens on HTML/canvas and reuses BOTH the game core AND the existing pose detector (`app/src/pose/*`, MoveNet + RepDetector) for the workout screen. The existing `web-demo` (pure detection demo) is left untouched.

**Tech Stack:** TypeScript, Jest, esbuild (via `npx`), TensorFlow.js MoveNet (CDN, browser only), HTML5 canvas, localStorage.

**Spec:** `docs/superpowers/specs/2026-07-02-game-progression-design.md`

## Global Constraints

- **Repo:** dedicated `push-up-rpg` repo, root `/home/keliorw/Projects/Job/push-ups-rpg/push-up-rpg`, branch `push-ups-tracking-mvp`. Normal `git add`/`commit` is safe; keep pathspec `-- <paths>` on commits as hygiene.
- **Environment:** Node 22 + npm only — NO Android SDK, NO browser/display on this machine. Verification bar: `npx tsc --noEmit` clean + `npm test` green (game core), and `npx esbuild ... ` builds the web prototype without error. The browser visuals are verified by the user, not on this machine.
- **Language:** TypeScript. UI copy in Russian.
- **Game core lives in `app/src/game/`** (so the RN app can reuse it later) and is imported by `web-game/`. Do NOT modify `web-demo/`. Reuse `app/src/pose/RepDetector` for the workout screen.
- **Content = locations 1–3 only** (12 monsters, cycles 1–3). Map nodes 4–10 are shown locked. Rep table per spec: cycle 1 minions 6/7/8 boss 3×8; cycle 2 minions 8/9/10 boss 3×9; cycle 3 minions 9/10/11 boss 3×10.
- **Push-ups = XP.** Monster HP = `sets * repsPerSet`. Minion = 1 set, boss = 3 sets.
- Package manager npm; bundle with `npx --yes esbuild`. No new runtime deps beyond what's listed (TF.js is loaded from CDN in the browser, not installed).

---

### Task 1: Game types and monster data

**Files:**
- Create: `app/src/game/types.ts`
- Create: `app/src/game/monsters.ts`
- Test: `app/__tests__/game-monsters.test.ts`

**Interfaces:**
- Consumes: —
- Produces:
  - `type MonsterKind = 'minion' | 'boss'`
  - `interface Monster { id: string; name: string; kind: MonsterKind; cardImage: string; sets: number; repsPerSet: number; restBetweenSetsSec: number }`
  - `interface Location { index: number; name: string; monsters: Monster[]; locked: boolean }`
  - `const LOCATIONS: Location[]` (3 entries), `const MONSTER_SEQUENCE: Monster[]` (12 entries), `const NODE_POSITIONS: {x:number;y:number}[]` (10 entries, fractions of the map image).

- [ ] **Step 1: Write the failing test**

Create `app/__tests__/game-monsters.test.ts`:

```ts
import {LOCATIONS, MONSTER_SEQUENCE, NODE_POSITIONS} from '../src/game/monsters';

test('3 locations, each with 3 minions + 1 boss', () => {
  expect(LOCATIONS).toHaveLength(3);
  for (const loc of LOCATIONS) {
    expect(loc.monsters).toHaveLength(4);
    expect(loc.monsters.slice(0, 3).every(m => m.kind === 'minion')).toBe(true);
    expect(loc.monsters[3].kind).toBe('boss');
  }
});

test('flat sequence is 12 monsters in play order', () => {
  expect(MONSTER_SEQUENCE).toHaveLength(12);
  expect(MONSTER_SEQUENCE[0].id).toBe('loc1-m1');
  expect(MONSTER_SEQUENCE[3].id).toBe('loc1-boss');
  expect(MONSTER_SEQUENCE[11].id).toBe('loc3-boss');
});

test('rep targets match the spec cycles', () => {
  // cycle 1 minions 6,7,8 ; boss 3x8
  expect(MONSTER_SEQUENCE.slice(0, 3).map(m => m.repsPerSet)).toEqual([6, 7, 8]);
  expect(MONSTER_SEQUENCE[3]).toMatchObject({sets: 3, repsPerSet: 8});
  // cycle 2 minions 8,9,10 ; boss 3x9
  expect(MONSTER_SEQUENCE.slice(4, 7).map(m => m.repsPerSet)).toEqual([8, 9, 10]);
  expect(MONSTER_SEQUENCE[7]).toMatchObject({sets: 3, repsPerSet: 9});
  // cycle 3 minions 9,10,11 ; boss 3x10
  expect(MONSTER_SEQUENCE.slice(8, 11).map(m => m.repsPerSet)).toEqual([9, 10, 11]);
  expect(MONSTER_SEQUENCE[11]).toMatchObject({sets: 3, repsPerSet: 10});
});

test('minions are 1 set, bosses are 3 sets; ids unique', () => {
  const ids = new Set(MONSTER_SEQUENCE.map(m => m.id));
  expect(ids.size).toBe(12);
  for (const m of MONSTER_SEQUENCE) {
    expect(m.sets).toBe(m.kind === 'boss' ? 3 : 1);
    expect(m.cardImage).toMatch(/^[123]\/.+\.png$/);
  }
});

test('10 node positions as fractions 0..1', () => {
  expect(NODE_POSITIONS).toHaveLength(10);
  for (const p of NODE_POSITIONS) {
    expect(p.x).toBeGreaterThanOrEqual(0);
    expect(p.x).toBeLessThanOrEqual(1);
    expect(p.y).toBeGreaterThanOrEqual(0);
    expect(p.y).toBeLessThanOrEqual(1);
  }
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd /home/keliorw/Projects/Job/push-ups-rpg/push-up-rpg/app
npm test -- game-monsters
```

Expected: FAIL — `Cannot find module '../src/game/monsters'`.

- [ ] **Step 3: Write the types**

Create `app/src/game/types.ts`:

```ts
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
```

- [ ] **Step 4: Write the monster data**

Create `app/src/game/monsters.ts`:

```ts
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
export const NODE_POSITIONS: {x: number; y: number}[] = [
  {x: 0.21, y: 0.93}, // 1
  {x: 0.57, y: 0.79}, // 2
  {x: 0.42, y: 0.71}, // 3
  {x: 0.57, y: 0.63}, // 4
  {x: 0.42, y: 0.55}, // 5
  {x: 0.58, y: 0.47}, // 6
  {x: 0.48, y: 0.39}, // 7
  {x: 0.57, y: 0.31}, // 8
  {x: 0.40, y: 0.24}, // 9
  {x: 0.53, y: 0.16}, // 10
];
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
npm test -- game-monsters
```

Expected: PASS, 5 tests.

- [ ] **Step 6: Commit**

```bash
cd /home/keliorw/Projects/Job/push-ups-rpg/push-up-rpg
git add app/src/game/types.ts app/src/game/monsters.ts app/__tests__/game-monsters.test.ts
git commit -m "feat(game): monster/location data for locations 1-3" -- app/src/game/types.ts app/src/game/monsters.ts app/__tests__/game-monsters.test.ts
```

---

### Task 2: Progression logic

**Files:**
- Create: `app/src/game/progression.ts`
- Test: `app/__tests__/game-progression.test.ts`

**Interfaces:**
- Consumes: `MONSTER_SEQUENCE` from `./monsters`; `Monster` from `./types`.
- Produces:
  - `interface Progression { defeatedCount: number; lastWorkoutDate: string | null }`
  - `const INITIAL_PROGRESSION: Progression`
  - `currentMonster(p: Progression): Monster | null`
  - `defeatMonster(p: Progression, today: string): Progression`
  - `isGameComplete(p: Progression): boolean`

- [ ] **Step 1: Write the failing test**

Create `app/__tests__/game-progression.test.ts`:

```ts
import {
  INITIAL_PROGRESSION,
  currentMonster,
  defeatMonster,
  isGameComplete,
} from '../src/game/progression';

test('starts at the first monster, nothing defeated', () => {
  expect(INITIAL_PROGRESSION).toEqual({defeatedCount: 0, lastWorkoutDate: null});
  expect(currentMonster(INITIAL_PROGRESSION)!.id).toBe('loc1-m1');
  expect(isGameComplete(INITIAL_PROGRESSION)).toBe(false);
});

test('defeatMonster advances the pointer and stamps the date (immutably)', () => {
  const p1 = defeatMonster(INITIAL_PROGRESSION, '2026-07-02');
  expect(p1).toEqual({defeatedCount: 1, lastWorkoutDate: '2026-07-02'});
  expect(INITIAL_PROGRESSION.defeatedCount).toBe(0); // unchanged
  expect(currentMonster(p1)!.id).toBe('loc1-m2');
});

test('after 12 defeats the game is complete, currentMonster is null', () => {
  let p = INITIAL_PROGRESSION;
  for (let i = 0; i < 12; i++) {
    p = defeatMonster(p, '2026-07-02');
  }
  expect(p.defeatedCount).toBe(12);
  expect(currentMonster(p)).toBeNull();
  expect(isGameComplete(p)).toBe(true);
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd /home/keliorw/Projects/Job/push-ups-rpg/push-up-rpg/app
npm test -- game-progression
```

Expected: FAIL — `Cannot find module '../src/game/progression'`.

- [ ] **Step 3: Write the implementation**

Create `app/src/game/progression.ts`:

```ts
import {MONSTER_SEQUENCE} from './monsters';
import {Monster} from './types';

export interface Progression {
  /** Сколько монстров уже побеждено (индекс текущего в MONSTER_SEQUENCE). */
  defeatedCount: number;
  /** ISO-дата последней завершённой тренировки (YYYY-MM-DD) или null. */
  lastWorkoutDate: string | null;
}

export const INITIAL_PROGRESSION: Progression = {
  defeatedCount: 0,
  lastWorkoutDate: null,
};

export function currentMonster(p: Progression): Monster | null {
  return MONSTER_SEQUENCE[p.defeatedCount] ?? null;
}

export function defeatMonster(p: Progression, today: string): Progression {
  return {defeatedCount: p.defeatedCount + 1, lastWorkoutDate: today};
}

export function isGameComplete(p: Progression): boolean {
  return p.defeatedCount >= MONSTER_SEQUENCE.length;
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test -- game-progression
```

Expected: PASS, 3 tests.

- [ ] **Step 5: Commit**

```bash
cd /home/keliorw/Projects/Job/push-ups-rpg/push-up-rpg
git add app/src/game/progression.ts app/__tests__/game-progression.test.ts
git commit -m "feat(game): progression pointer and defeat logic" -- app/src/game/progression.ts app/__tests__/game-progression.test.ts
```

---

### Task 3: Daily lock

**Files:**
- Create: `app/src/game/dailyLock.ts`
- Test: `app/__tests__/game-dailyLock.test.ts`

**Interfaces:**
- Consumes: `Progression` from `./progression`.
- Produces: `isLockedToday(p: Progression, today: string): boolean`

- [ ] **Step 1: Write the failing test**

Create `app/__tests__/game-dailyLock.test.ts`:

```ts
import {isLockedToday} from '../src/game/dailyLock';

test('not locked when no workout done yet', () => {
  expect(isLockedToday({defeatedCount: 0, lastWorkoutDate: null}, '2026-07-02')).toBe(false);
});

test('locked when the last workout was today', () => {
  expect(isLockedToday({defeatedCount: 1, lastWorkoutDate: '2026-07-02'}, '2026-07-02')).toBe(true);
});

test('unlocked again on a later date', () => {
  expect(isLockedToday({defeatedCount: 1, lastWorkoutDate: '2026-07-02'}, '2026-07-03')).toBe(false);
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd /home/keliorw/Projects/Job/push-ups-rpg/push-up-rpg/app
npm test -- game-dailyLock
```

Expected: FAIL — `Cannot find module '../src/game/dailyLock'`.

- [ ] **Step 3: Write the implementation**

Create `app/src/game/dailyLock.ts`:

```ts
import {Progression} from './progression';

/**
 * true, если сегодня уже была завершена тренировка (один бой в день).
 * Дата передаётся снаружи (локальная дата устройства или подмена в тестах/
 * dev-панели), а не берётся из Date внутри ядра.
 */
export function isLockedToday(p: Progression, today: string): boolean {
  return p.lastWorkoutDate === today;
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test -- game-dailyLock
```

Expected: PASS, 3 tests.

- [ ] **Step 5: Commit**

```bash
cd /home/keliorw/Projects/Job/push-ups-rpg/push-up-rpg
git add app/src/game/dailyLock.ts app/__tests__/game-dailyLock.test.ts
git commit -m "feat(game): one-workout-per-day lock" -- app/src/game/dailyLock.ts app/__tests__/game-dailyLock.test.ts
```

---

### Task 4: Workout state machine

**Files:**
- Create: `app/src/game/workout.ts`
- Test: `app/__tests__/game-workout.test.ts`

**Interfaces:**
- Consumes: `Monster` from `./types`.
- Produces:
  - `type WorkoutEvent = 'repCounted' | 'setComplete' | 'monsterDefeated'`
  - `interface WorkoutState { setIndex: number; repsInSet: number; totalReps: number; done: boolean }`
  - `newWorkout(m: Monster): WorkoutState`
  - `onRep(state: WorkoutState, m: Monster): { state: WorkoutState; event: WorkoutEvent }`
  - `totalTarget(m: Monster): number`
  - `progressFraction(state: WorkoutState, m: Monster): number`

- [ ] **Step 1: Write the failing test**

Create `app/__tests__/game-workout.test.ts`:

```ts
import {Monster} from '../src/game/types';
import {
  newWorkout,
  onRep,
  progressFraction,
  totalTarget,
} from '../src/game/workout';

const minion: Monster = {
  id: 'm', name: 'M', kind: 'minion', cardImage: '1/x.png',
  sets: 1, repsPerSet: 3, restBetweenSetsSec: 0,
};
const boss: Monster = {
  id: 'b', name: 'B', kind: 'boss', cardImage: '1/boss.png',
  sets: 3, repsPerSet: 2, restBetweenSetsSec: 0,
};

test('minion: last rep of the single set defeats it', () => {
  let s = newWorkout(minion);
  expect(onRep(s, minion).event).toBe('repCounted');
  s = onRep(s, minion).state;
  expect(onRep(s, minion).event).toBe('repCounted');
  s = onRep(s, minion).state;
  const r = onRep(s, minion);
  expect(r.event).toBe('monsterDefeated');
  expect(r.state.done).toBe(true);
});

test('boss: each finished set emits setComplete, last emits monsterDefeated', () => {
  let s = newWorkout(boss);
  const events: string[] = [];
  // 3 sets x 2 reps = 6 reps
  for (let i = 0; i < 6; i++) {
    const r = onRep(s, boss);
    events.push(r.event);
    s = r.state;
  }
  expect(events).toEqual([
    'repCounted', 'setComplete',
    'repCounted', 'setComplete',
    'repCounted', 'monsterDefeated',
  ]);
  expect(s.done).toBe(true);
});

test('setComplete advances setIndex and resets repsInSet', () => {
  let s = newWorkout(boss);
  s = onRep(s, boss).state; // rep 1 of set 0
  const r = onRep(s, boss); // rep 2 -> set complete
  expect(r.event).toBe('setComplete');
  expect(r.state.setIndex).toBe(1);
  expect(r.state.repsInSet).toBe(0);
});

test('totalTarget and progressFraction', () => {
  expect(totalTarget(boss)).toBe(6);
  let s = newWorkout(boss);
  s = onRep(s, boss).state;
  s = onRep(s, boss).state;
  s = onRep(s, boss).state; // 3 of 6
  expect(progressFraction(s, boss)).toBeCloseTo(0.5);
});

test('reps after done are no-ops', () => {
  let s = newWorkout(minion);
  for (let i = 0; i < 3; i++) s = onRep(s, minion).state;
  expect(s.done).toBe(true);
  const r = onRep(s, minion);
  expect(r.event).toBe('repCounted');
  expect(r.state.done).toBe(true);
  expect(r.state.totalReps).toBe(3); // unchanged
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd /home/keliorw/Projects/Job/push-ups-rpg/push-up-rpg/app
npm test -- game-workout
```

Expected: FAIL — `Cannot find module '../src/game/workout'`.

- [ ] **Step 3: Write the implementation**

Create `app/src/game/workout.ts`:

```ts
import {Monster} from './types';

export type WorkoutEvent = 'repCounted' | 'setComplete' | 'monsterDefeated';

export interface WorkoutState {
  /** Индекс текущего подхода (0-based). */
  setIndex: number;
  /** Повторов в текущем подходе. */
  repsInSet: number;
  /** Всего повторов за бой (XP). */
  totalReps: number;
  done: boolean;
}

export function newWorkout(_m: Monster): WorkoutState {
  return {setIndex: 0, repsInSet: 0, totalReps: 0, done: false};
}

export function totalTarget(m: Monster): number {
  return m.sets * m.repsPerSet;
}

export function progressFraction(state: WorkoutState, m: Monster): number {
  return Math.min(1, state.totalReps / totalTarget(m));
}

/**
 * Учитывает один засчитанный повтор. Возвращает новое состояние и событие:
 * - 'monsterDefeated' — добит последний повтор последнего подхода;
 * - 'setComplete' — закончился подход (не последний); прототип показывает
 *   экран отдыха, затем продолжает вызывать onRep для следующего подхода;
 * - 'repCounted' — обычный повтор.
 * После done все повторы — no-op.
 */
export function onRep(
  state: WorkoutState,
  m: Monster,
): {state: WorkoutState; event: WorkoutEvent} {
  if (state.done) {
    return {state, event: 'repCounted'};
  }
  const repsInSet = state.repsInSet + 1;
  const totalReps = state.totalReps + 1;
  if (repsInSet >= m.repsPerSet) {
    const isLastSet = state.setIndex + 1 >= m.sets;
    if (isLastSet) {
      return {
        state: {setIndex: state.setIndex, repsInSet, totalReps, done: true},
        event: 'monsterDefeated',
      };
    }
    return {
      state: {setIndex: state.setIndex + 1, repsInSet: 0, totalReps, done: false},
      event: 'setComplete',
    };
  }
  return {state: {...state, repsInSet, totalReps}, event: 'repCounted'};
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test -- game-workout
```

Expected: PASS, 5 tests.

- [ ] **Step 5: Run full suite + tsc**

```bash
npx tsc --noEmit && npm test 2>&1 | tail -4
```

Expected: tsc clean; all suites pass.

- [ ] **Step 6: Commit**

```bash
cd /home/keliorw/Projects/Job/push-ups-rpg/push-up-rpg
git add app/src/game/workout.ts app/__tests__/game-workout.test.ts
git commit -m "feat(game): workout set/rep state machine" -- app/src/game/workout.ts app/__tests__/game-workout.test.ts
```

---

### Task 5: Copy and downscale game assets into the repo

**Files:**
- Create: `web-game/games/map.png` and `web-game/games/{1,2,3}/*.png` (downscaled copies)

**Interfaces:**
- Consumes: —
- Produces: assets served by the web prototype at `games/…` matching each `Monster.cardImage` path and a `games/map.png`.

- [ ] **Step 1: Copy the map and downscale the cards**

The static ffmpeg from earlier is at
`/tmp/claude-1000/-home-keliorw-Projects-Job-push-ups-rpg/d340df5a-5b42-409c-aecb-fca27711248a/scratchpad/venv/lib/python3.12/site-packages/imageio_ffmpeg/binaries/ffmpeg-linux-x86_64-v7.0.2`.
If it is gone, reinstall: `python3 -m venv /tmp/ffvenv && /tmp/ffvenv/bin/pip install imageio-ffmpeg && FF=$(/tmp/ffvenv/bin/python -c "import imageio_ffmpeg;print(imageio_ffmpeg.get_ffmpeg_exe())")`.

```bash
cd /home/keliorw/Projects/Job/push-ups-rpg/push-up-rpg
FF="/tmp/claude-1000/-home-keliorw-Projects-Job-push-ups-rpg/d340df5a-5b42-409c-aecb-fca27711248a/scratchpad/venv/lib/python3.12/site-packages/imageio_ffmpeg/binaries/ffmpeg-linux-x86_64-v7.0.2"
SRC=/home/keliorw/Downloads/games
mkdir -p web-game/games/1 web-game/games/2 web-game/games/3
# map: keep as-is (already phone-sized 768x1376)
cp "$SRC/UI/90726539.png" web-game/games/map.png
# cards: downscale to width 600 to keep the repo lean
for loc in 1 2 3; do
  for f in "$SRC/$loc"/*.png; do
    base=$(basename "$f")
    "$FF" -y -i "$f" -vf "scale=600:-1" "web-game/games/$loc/$base"
  done
done
ls -R web-game/games | head -40
```

Expected: `web-game/games/map.png` plus `web-game/games/1/{boss,kaban,mish,chervy}.png`, `web-game/games/2/{boss,goblin-shit,goblin-fire,goblin-shaman}.png`, `web-game/games/3/{boss,proklyt-skelet-rizar,skelet-luchnik,nekromant-ychenik}.png`. Each card ≪ its 1024² original.

- [ ] **Step 2: Verify the filenames exactly match the data**

```bash
cd /home/keliorw/Projects/Job/push-ups-rpg/push-up-rpg
for p in 1/kaban.png 1/mish.png 1/chervy.png 1/boss.png \
         2/goblin-shit.png 2/goblin-fire.png 2/goblin-shaman.png 2/boss.png \
         3/proklyt-skelet-rizar.png 3/skelet-luchnik.png 3/nekromant-ychenik.png 3/boss.png; do
  test -f "web-game/games/$p" && echo "OK $p" || echo "MISSING $p"
done
```

Expected: all `OK` (these are exactly the `cardImage` values from Task 1).

- [ ] **Step 3: Commit**

```bash
cd /home/keliorw/Projects/Job/push-ups-rpg/push-up-rpg
git add web-game/games
git commit -m "chore(web-game): add downscaled map + enemy card assets (locations 1-3)" -- web-game/games
```

---

### Task 6: Web prototype scaffold — build, storage, screen router, dev panel

**Files:**
- Create: `web-game/index.html`
- Create: `web-game/tsconfig.json`
- Create: `web-game/src/storage.ts`
- Create: `web-game/src/dates.ts`
- Create: `web-game/src/main.ts`
- Create: `web-game/README.md`

**Interfaces:**
- Consumes: `Progression`, `INITIAL_PROGRESSION` from `../../app/src/game/progression`; `LOCATIONS`, `MONSTER_SEQUENCE`, `NODE_POSITIONS` from `../../app/src/game/monsters`.
- Produces:
  - `web-game/src/storage.ts`: `loadProgression(): Progression`, `saveProgression(p: Progression): void`, `resetProgression(): void`.
  - `web-game/src/dates.ts`: `todayISO(): string` (local `YYYY-MM-DD`).
  - `web-game/src/main.ts`: a `showScreen(id)` router and an `AppState` holding the current `Progression`; renders the START screen and a placeholder MAP screen; wires a dev panel. Exposes `window.__game` for later screens to call `render()`.
  - Bundle command: `npx --yes esbuild web-game/src/main.ts --bundle --format=esm --outfile=web-game/app.js`.

- [ ] **Step 1: Create the tsconfig for type-checking the prototype**

Create `web-game/tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2020", "DOM"],
    "strict": true,
    "noEmit": true,
    "skipLibCheck": true,
    "types": []
  },
  "include": ["src", "../app/src/game", "../app/src/pose"]
}
```

- [ ] **Step 2: Storage + dates helpers**

Create `web-game/src/storage.ts`:

```ts
import {INITIAL_PROGRESSION, Progression} from '../../app/src/game/progression';

const KEY = 'pushuprpg.progression';

export function loadProgression(): Progression {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return INITIAL_PROGRESSION;
    const p = JSON.parse(raw) as Progression;
    if (typeof p.defeatedCount === 'number') return p;
  } catch {
    // ignore corrupt storage
  }
  return INITIAL_PROGRESSION;
}

export function saveProgression(p: Progression): void {
  localStorage.setItem(KEY, JSON.stringify(p));
}

export function resetProgression(): void {
  localStorage.removeItem(KEY);
}
```

Create `web-game/src/dates.ts`:

```ts
/** Локальная дата устройства в формате YYYY-MM-DD. */
export function todayISO(): string {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}
```

- [ ] **Step 3: HTML shell**

Create `web-game/index.html`:

```html
<!DOCTYPE html>
<html lang="ru">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
    <title>push-up-rpg</title>
    <style>
      * { box-sizing: border-box; }
      html, body { margin: 0; height: 100%; }
      body {
        background: #101828; color: #fff;
        font-family: system-ui, -apple-system, sans-serif;
        display: flex; justify-content: center;
      }
      #app { width: 100%; max-width: 480px; position: relative; }
      .screen { display: none; }
      .screen.active { display: block; }
      button { font-family: inherit; }
      .btn {
        background: #F5A623; color: #101828; border: none; border-radius: 40px;
        padding: 16px 40px; font-size: 20px; font-weight: 800; letter-spacing: 1px;
      }
      .btn:disabled { opacity: .5; }
      /* START */
      #screen-start { text-align: center; padding-top: 30vh; }
      #screen-start h1 { font-size: 32px; font-weight: 900; }
      /* MAP */
      #map-wrap { position: relative; }
      #map-img { width: 100%; display: block; }
      .node {
        position: absolute; width: 34px; height: 34px; transform: translate(-50%, -50%);
        border-radius: 50%; border: 3px solid #fff; display: flex;
        align-items: center; justify-content: center; font-weight: 800; font-size: 16px;
        background: rgba(0,0,0,.55); color: #fff;
      }
      .node.done { background: #2e7d32; }
      .node.current { border-color: #F5A623; box-shadow: 0 0 0 4px rgba(245,166,35,.5); }
      .node.locked { opacity: .55; }
      .node.current { cursor: pointer; }
      /* CARD */
      #screen-card { padding: 12px; text-align: center; }
      #card-img { width: 100%; border-radius: 12px; display: block; }
      #card-target { font-size: 20px; margin: 12px 0; }
      .hpbar { height: 16px; background: #333; border-radius: 8px; overflow: hidden; margin: 8px 0; }
      .hpbar > i { display: block; height: 100%; background: #d64545; width: 100%; }
      /* WORKOUT */
      #screen-workout { position: relative; }
      #wk-stage { position: relative; transform: scaleX(-1); }
      #wk-video, #wk-overlay { width: 100%; display: block; }
      #wk-video { background: #000; }
      #wk-overlay { position: absolute; inset: 0; }
      #wk-hud { position: absolute; inset: 0; pointer-events: none; }
      #wk-counter { position: absolute; top: 8px; left: 0; right: 0; text-align: center;
        font-size: 64px; font-weight: 900; color: #F5A623; text-shadow: 0 2px 8px #000; }
      #wk-set { position: absolute; top: 84px; left: 0; right: 0; text-align: center; font-size: 18px; }
      #wk-rest { position: absolute; inset: 0; display: none; align-items: center;
        justify-content: center; flex-direction: column; background: rgba(0,0,0,.8); font-size: 24px; }
      /* VICTORY */
      #screen-victory { text-align: center; padding-top: 30vh; }
      #screen-victory h1 { color: #F5A623; font-size: 40px; font-weight: 900; }
      /* DEV */
      #dev { position: fixed; bottom: 0; left: 0; right: 0; background: #0b111f;
        font-size: 12px; padding: 6px; display: flex; gap: 6px; flex-wrap: wrap;
        justify-content: center; opacity: .9; }
      #dev button { background: #24314a; color: #fff; border: 1px solid #3a4a67;
        border-radius: 6px; padding: 4px 8px; }
      #hint { font-size: 14px; color: #9aa4b2; }
    </style>
  </head>
  <body>
    <div id="app">
      <section id="screen-start" class="screen active">
        <h1>Push-Ups RPG</h1>
        <button class="btn" id="start-btn">START</button>
      </section>

      <section id="screen-map" class="screen">
        <div id="map-wrap">
          <img id="map-img" src="./games/map.png" alt="map" />
          <!-- node markers injected by JS -->
        </div>
      </section>

      <section id="screen-card" class="screen">
        <img id="card-img" alt="enemy" />
        <div id="card-target"></div>
        <div class="hpbar"><i id="card-hp"></i></div>
        <button class="btn" id="card-start-btn">Начать тренировку</button>
        <div id="hint"></div>
        <div><button class="btn" id="card-back-btn" style="background:#24314a;color:#fff;margin-top:8px">Назад</button></div>
      </section>

      <section id="screen-workout" class="screen">
        <div id="wk-stage">
          <video id="wk-video" playsinline muted></video>
          <canvas id="wk-overlay"></canvas>
        </div>
        <div id="wk-hud">
          <div id="wk-counter">0</div>
          <div id="wk-set"></div>
        </div>
        <div class="hpbar" style="position:absolute;top:60px;left:8px;right:8px">
          <i id="wk-hp"></i>
        </div>
        <div id="wk-rest"></div>
        <div id="wk-status" style="text-align:center;color:#F5A623;padding:6px"></div>
      </section>

      <section id="screen-victory" class="screen">
        <h1>Повержен!</h1>
        <div id="victory-name"></div>
        <button class="btn" id="victory-btn" style="margin-top:24px">На карту</button>
      </section>
    </div>

    <div id="dev">
      <span>DEV:</span>
      <button id="dev-reset-day">сбросить день</button>
      <button id="dev-reset-progress">сбросить прогресс</button>
      <button id="dev-prev">◀ монстр</button>
      <button id="dev-next">монстр ▶</button>
    </div>

    <script src="https://cdn.jsdelivr.net/npm/@tensorflow/tfjs-core"></script>
    <script src="https://cdn.jsdelivr.net/npm/@tensorflow/tfjs-converter"></script>
    <script src="https://cdn.jsdelivr.net/npm/@tensorflow/tfjs-backend-webgl"></script>
    <script src="https://cdn.jsdelivr.net/npm/@tensorflow-models/pose-detection"></script>
    <script type="module" src="./app.js"></script>
  </body>
</html>
```

- [ ] **Step 4: Router + app state + dev panel (`main.ts`)**

Create `web-game/src/main.ts`:

```ts
import {MONSTER_SEQUENCE} from '../../app/src/game/monsters';
import {
  INITIAL_PROGRESSION,
  Progression,
  currentMonster,
  defeatMonster,
} from '../../app/src/game/progression';
import {todayISO} from './dates';
import {loadProgression, resetProgression, saveProgression} from './storage';
import {renderMap} from './map';
import {renderCard} from './card';
import {startWorkout} from './workout-screen';

export type ScreenId =
  | 'screen-start'
  | 'screen-map'
  | 'screen-card'
  | 'screen-workout'
  | 'screen-victory';

export interface App {
  progression: Progression;
  show(id: ScreenId): void;
  render(): void;
  goCard(): void;
  goWorkout(): void;
  onDefeated(): void; // called by the workout screen on monster defeat
}

function show(id: ScreenId): void {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id)!.classList.add('active');
}

const app: App = {
  progression: loadProgression(),
  show,
  render() {
    renderMap(this);
  },
  goCard() {
    renderCard(this);
    show('screen-card');
  },
  goWorkout() {
    show('screen-workout');
    startWorkout(this);
  },
  onDefeated() {
    const m = currentMonster(this.progression);
    this.progression = defeatMonster(this.progression, todayISO());
    saveProgression(this.progression);
    (document.getElementById('victory-name') as HTMLElement).textContent = m ? m.name : '';
    show('screen-victory');
  },
};

// START
document.getElementById('start-btn')!.addEventListener('click', () => {
  app.render();
  show('screen-map');
});
// VICTORY -> map
document.getElementById('victory-btn')!.addEventListener('click', () => {
  app.render();
  show('screen-map');
});
// CARD back / start
document.getElementById('card-back-btn')!.addEventListener('click', () => {
  app.render();
  show('screen-map');
});
document.getElementById('card-start-btn')!.addEventListener('click', () => app.goWorkout());

// DEV panel
document.getElementById('dev-reset-day')!.addEventListener('click', () => {
  app.progression = {...app.progression, lastWorkoutDate: null};
  saveProgression(app.progression);
  app.render();
});
document.getElementById('dev-reset-progress')!.addEventListener('click', () => {
  resetProgression();
  app.progression = INITIAL_PROGRESSION;
  app.render();
});
document.getElementById('dev-prev')!.addEventListener('click', () => {
  app.progression = {
    ...app.progression,
    defeatedCount: Math.max(0, app.progression.defeatedCount - 1),
  };
  saveProgression(app.progression);
  app.render();
});
document.getElementById('dev-next')!.addEventListener('click', () => {
  app.progression = {
    ...app.progression,
    defeatedCount: Math.min(MONSTER_SEQUENCE.length, app.progression.defeatedCount + 1),
  };
  saveProgression(app.progression);
  app.render();
});
```

- [ ] **Step 5: Create temporary stub modules so the bundle builds**

These are filled in Tasks 7–9. Create minimal stubs now so `main.ts` imports resolve.

Create `web-game/src/map.ts`:

```ts
import type {App} from './main';
export function renderMap(_app: App): void {
  // filled in Task 7
}
```

Create `web-game/src/card.ts`:

```ts
import type {App} from './main';
export function renderCard(_app: App): void {
  // filled in Task 8
}
```

Create `web-game/src/workout-screen.ts`:

```ts
import type {App} from './main';
export function startWorkout(_app: App): void {
  // filled in Task 9
}
```

- [ ] **Step 6: Build and typecheck**

```bash
cd /home/keliorw/Projects/Job/push-ups-rpg/push-up-rpg
npx --yes esbuild web-game/src/main.ts --bundle --format=esm --outfile=web-game/app.js
npx tsc -p web-game/tsconfig.json
```

Expected: esbuild writes `web-game/app.js` with no errors; `tsc` prints nothing (clean).

- [ ] **Step 7: README with run instructions**

Create `web-game/README.md`:

```md
# web-game — играбельный прототип

Прототип игрового лупа (карта → карточка → тренировка → победа) на общем ядре
`app/src/game/*` и детекторе `app/src/pose/*`. НЕ боевое приложение.

## Запуск
Нужны интернет (CDN TF.js) и веб-камера. Камера работает только на localhost:
```
cd web-game
python3 -m http.server 8081
```
Открой http://localhost:8081/ , жми START.

## Пересборка после правок
```
cd ..   # корень репозитория
npx --yes esbuild web-game/src/main.ts --bundle --format=esm --outfile=web-game/app.js
```

Внизу есть DEV-панель (сбросить день/прогресс, перейти к монстру) — правило
«1 бой в день» иначе не протестировать.
```

- [ ] **Step 8: Commit**

```bash
cd /home/keliorw/Projects/Job/push-ups-rpg/push-up-rpg
git add web-game/index.html web-game/tsconfig.json web-game/src/storage.ts web-game/src/dates.ts web-game/src/main.ts web-game/src/map.ts web-game/src/card.ts web-game/src/workout-screen.ts web-game/app.js web-game/README.md
git commit -m "feat(web-game): scaffold — router, storage, dev panel, screen shells" -- web-game/index.html web-game/tsconfig.json web-game/src web-game/app.js web-game/README.md
```

---

### Task 7: Map screen — nodes, progress, tap current

**Files:**
- Modify: `web-game/src/map.ts` (replace stub)

**Interfaces:**
- Consumes: `App` from `./main`; `LOCATIONS`, `NODE_POSITIONS` from `../../app/src/game/monsters`; `currentMonster`, `isGameComplete` from `../../app/src/game/progression`; `isLockedToday` from `../../app/src/game/dailyLock`; `todayISO` from `./dates`.
- Produces: `renderMap(app: App): void` — draws node markers over `#map-img`, marks defeated/current/locked, and makes the current node tap to `app.goCard()`.

- [ ] **Step 1: Implement the map screen**

Replace `web-game/src/map.ts`:

```ts
import {LOCATIONS, NODE_POSITIONS} from '../../app/src/game/monsters';
import {currentMonster} from '../../app/src/game/progression';
import {isLockedToday} from '../../app/src/game/dailyLock';
import {todayISO} from './dates';
import type {App} from './main';

/** Индекс локации (1-based) текущего монстра, или null если игра пройдена. */
function currentLocationIndex(app: App): number | null {
  const m = currentMonster(app.progression);
  if (!m) return null;
  // id вида 'locN-...'
  const match = /^loc(\d+)-/.exec(m.id);
  return match ? Number(match[1]) : null;
}

export function renderMap(app: App): void {
  const wrap = document.getElementById('map-wrap')!;
  // убрать старые маркеры (оставить <img>)
  wrap.querySelectorAll('.node').forEach(n => n.remove());

  const curLoc = currentLocationIndex(app);
  const locked = isLockedToday(app.progression, todayISO());

  for (let i = 0; i < NODE_POSITIONS.length; i++) {
    const locIndex = i + 1;
    const pos = NODE_POSITIONS[i];
    const el = document.createElement('div');
    el.className = 'node';
    el.style.left = `${pos.x * 100}%`;
    el.style.top = `${pos.y * 100}%`;
    el.textContent = String(locIndex);

    const hasContent = locIndex <= LOCATIONS.length; // 1..3 играбельны
    if (curLoc === null) {
      // игра пройдена — все доступные локации done
      el.classList.add(hasContent ? 'done' : 'locked');
    } else if (locIndex < curLoc) {
      el.classList.add('done');
    } else if (locIndex === curLoc && hasContent) {
      el.classList.add('current');
      if (!locked) {
        el.addEventListener('click', () => app.goCard());
      }
    } else {
      el.classList.add('locked');
    }
    wrap.appendChild(el);
  }
}
```

- [ ] **Step 2: Build + typecheck**

```bash
cd /home/keliorw/Projects/Job/push-ups-rpg/push-up-rpg
npx --yes esbuild web-game/src/main.ts --bundle --format=esm --outfile=web-game/app.js
npx tsc -p web-game/tsconfig.json
```

Expected: esbuild OK, tsc clean.

- [ ] **Step 3: Manual check (user, in browser)**

Serve and open (`cd web-game && python3 -m http.server 8081`), press START. Expected: map with node 1 highlighted (orange), nodes 2–10 locked. Tapping node 1 opens the card screen (blank until Task 8). This step is a user-side visual check; the agent verifies only the build.

- [ ] **Step 4: Commit**

```bash
cd /home/keliorw/Projects/Job/push-ups-rpg/push-up-rpg
git add web-game/src/map.ts web-game/app.js
git commit -m "feat(web-game): map screen with node progress and tap-to-fight" -- web-game/src/map.ts web-game/app.js
```

---

### Task 8: Enemy card screen + daily lock display

**Files:**
- Modify: `web-game/src/card.ts` (replace stub)

**Interfaces:**
- Consumes: `App` from `./main`; `currentMonster` from `../../app/src/game/progression`; `totalTarget` from `../../app/src/game/workout`; `isLockedToday` from `../../app/src/game/dailyLock`; `todayISO` from `./dates`.
- Produces: `renderCard(app: App): void` — fills `#card-img`, `#card-target`, HP bar, and toggles the start button / "come back tomorrow" hint by the daily lock.

- [ ] **Step 1: Implement the card screen**

Replace `web-game/src/card.ts`:

```ts
import {currentMonster} from '../../app/src/game/progression';
import {isLockedToday} from '../../app/src/game/dailyLock';
import {totalTarget} from '../../app/src/game/workout';
import {todayISO} from './dates';
import type {App} from './main';

export function renderCard(app: App): void {
  const m = currentMonster(app.progression);
  const img = document.getElementById('card-img') as HTMLImageElement;
  const target = document.getElementById('card-target') as HTMLElement;
  const hp = document.getElementById('card-hp') as HTMLElement;
  const startBtn = document.getElementById('card-start-btn') as HTMLButtonElement;
  const hint = document.getElementById('hint') as HTMLElement;

  if (!m) {
    target.textContent = 'Все враги повержены!';
    startBtn.style.display = 'none';
    hint.textContent = '';
    img.removeAttribute('src');
    return;
  }

  img.src = `./games/${m.cardImage}`;
  hp.style.width = '100%';
  target.textContent =
    m.kind === 'boss'
      ? `БОСС: ${m.sets} подхода × ${m.repsPerSet} (всего ${totalTarget(m)})`
      : `Победи: ${m.repsPerSet} отжиманий`;

  const locked = isLockedToday(app.progression, todayISO());
  if (locked) {
    startBtn.style.display = 'none';
    hint.textContent = 'Тренировка на сегодня выполнена — приходи завтра.';
  } else {
    startBtn.style.display = '';
    hint.textContent = '';
  }
}
```

- [ ] **Step 2: Build + typecheck**

```bash
cd /home/keliorw/Projects/Job/push-ups-rpg/push-up-rpg
npx --yes esbuild web-game/src/main.ts --bundle --format=esm --outfile=web-game/app.js
npx tsc -p web-game/tsconfig.json
```

Expected: esbuild OK, tsc clean.

- [ ] **Step 3: Manual check (user)**

START → node 1 → card shows the "Чумной кабан" art, "Победи: 6 отжиманий", HP full, "Начать тренировку". After a completed workout the same day, the card shows "приходи завтра" instead of the button (test via DEV → after a win, reopen; DEV "сбросить день" restores the button).

- [ ] **Step 4: Commit**

```bash
cd /home/keliorw/Projects/Job/push-ups-rpg/push-up-rpg
git add web-game/src/card.ts web-game/app.js
git commit -m "feat(web-game): enemy card screen with target and daily lock" -- web-game/src/card.ts web-game/app.js
```

---

### Task 9: Workout screen — detector + set/rep automaton + HP + rest + victory

**Files:**
- Modify: `web-game/src/workout-screen.ts` (replace stub)

**Interfaces:**
- Consumes: `App` from `./main`; `currentMonster` from `../../app/src/game/progression`; `RepDetector` from `../../app/src/pose/RepDetector`; `DEFAULT_CONFIG` from `../../app/src/pose/config`; `KP`, `Pose` from `../../app/src/pose/types`; `newWorkout`, `onRep`, `progressFraction`, `WorkoutState` from `../../app/src/game/workout`.
- Produces: `startWorkout(app: App): void` — runs the camera + MoveNet + RepDetector loop, feeds each `repCounted` into the game workout automaton, updates the counter/HP/set indicator, shows a rest screen on `setComplete`, and calls `app.onDefeated()` on `monsterDefeated`.

- [ ] **Step 1: Implement the workout screen**

Replace `web-game/src/workout-screen.ts`. This mirrors the detection loop in `web-demo/src/demo.ts` (TF.js MoveNet globals `tf`/`poseDetection`, all 17 keypoints → `Pose`) but routes counted reps into the game automaton.

```ts
import {DEFAULT_CONFIG} from '../../app/src/pose/config';
import {RepDetector} from '../../app/src/pose/RepDetector';
import {KP, Pose} from '../../app/src/pose/types';
import {currentMonster} from '../../app/src/game/progression';
import {
  WorkoutState,
  newWorkout,
  onRep,
  progressFraction,
} from '../../app/src/game/workout';
import type {App} from './main';

declare const tf: any;
declare const poseDetection: any;

const KEYPOINT_COUNT = 17;
const MIN_SCORE = 0.3;
const EDGES: Array<[number, number]> = [
  [KP.leftShoulder, KP.rightShoulder],
  [KP.leftShoulder, KP.leftElbow],
  [KP.leftElbow, KP.leftWrist],
  [KP.rightShoulder, KP.rightElbow],
  [KP.rightElbow, KP.rightWrist],
  [KP.nose, KP.leftShoulder],
  [KP.nose, KP.rightShoulder],
  [KP.leftShoulder, KP.leftHip],
  [KP.rightShoulder, KP.rightHip],
  [KP.leftHip, KP.rightHip],
  [KP.leftHip, KP.leftKnee],
  [KP.leftKnee, KP.leftAnkle],
  [KP.rightHip, KP.rightKnee],
  [KP.rightKnee, KP.rightAnkle],
];

export function startWorkout(app: App): void {
  const monster = currentMonster(app.progression);
  if (!monster) return;

  const video = document.getElementById('wk-video') as HTMLVideoElement;
  const canvas = document.getElementById('wk-overlay') as HTMLCanvasElement;
  const ctx = canvas.getContext('2d')!;
  const counterEl = document.getElementById('wk-counter')!;
  const setEl = document.getElementById('wk-set')!;
  const hpEl = document.getElementById('wk-hp') as HTMLElement;
  const restEl = document.getElementById('wk-rest') as HTMLElement;
  const statusEl = document.getElementById('wk-status')!;

  const detector = new RepDetector(DEFAULT_CONFIG);
  let wk: WorkoutState = newWorkout(monster);
  let resting = false;
  let finished = false;

  const updateHud = () => {
    counterEl.textContent = String(wk.repsInSet);
    setEl.textContent =
      monster.sets > 1 ? `Сет ${wk.setIndex + 1}/${monster.sets} · цель ${monster.repsPerSet}` : `Цель ${monster.repsPerSet}`;
    hpEl.style.width = `${100 - progressFraction(wk, monster) * 100}%`;
  };
  updateHud();

  function draw(pose: Pose | null) {
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (!pose) return;
    ctx.lineWidth = Math.max(2, canvas.width * 0.008);
    ctx.strokeStyle = '#FFFFFF';
    for (const [a, b] of EDGES) {
      if (!pose[a] || !pose[b]) continue;
      if (pose[a].score < MIN_SCORE || pose[b].score < MIN_SCORE) continue;
      ctx.beginPath();
      ctx.moveTo(pose[a].x, pose[a].y);
      ctx.lineTo(pose[b].x, pose[b].y);
      ctx.stroke();
    }
    ctx.fillStyle = '#F5A623';
    const r = Math.max(3, canvas.width * 0.012);
    for (let i = 0; i < KEYPOINT_COUNT; i++) {
      if (!pose[i] || pose[i].score < MIN_SCORE) continue;
      ctx.beginPath();
      ctx.arc(pose[i].x, pose[i].y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function handleRep() {
    const res = onRep(wk, monster);
    wk = res.state;
    updateHud();
    if (res.event === 'monsterDefeated') {
      finished = true;
      app.onDefeated();
    } else if (res.event === 'setComplete') {
      startRest();
    }
  }

  function startRest() {
    resting = true;
    let left = monster.restBetweenSetsSec;
    restEl.style.display = 'flex';
    const tick = () => {
      if (left <= 0) {
        restEl.style.display = 'none';
        resting = false;
        updateHud();
        return;
      }
      restEl.textContent = `Отдых: ${left} с (нажми, чтобы продолжить)`;
      left -= 1;
      setTimeout(tick, 1000);
    };
    // 0 сек отдыха для локаций 1–3 → сразу продолжаем; иначе таймер + пропуск по тапу
    if (monster.restBetweenSetsSec <= 0) {
      restEl.style.display = 'none';
      resting = false;
    } else {
      restEl.textContent = `Отдых: ${left} с (нажми, чтобы продолжить)`;
      restEl.onclick = () => {
        restEl.style.display = 'none';
        resting = false;
      };
      tick();
    }
  }

  async function run() {
    statusEl.textContent = 'Запрашиваю камеру…';
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {facingMode: 'user', width: 640, height: 480},
      audio: false,
    });
    video.srcObject = stream;
    await video.play();
    statusEl.textContent = 'Загружаю модель…';
    await tf.setBackend('webgl');
    await tf.ready();
    const det = await poseDetection.createDetector(
      poseDetection.SupportedModels.MoveNet,
      {modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING},
    );
    statusEl.textContent = 'Займи упор лёжа';

    async function loop() {
      if (finished) {
        (video.srcObject as MediaStream).getTracks().forEach(t => t.stop());
        return;
      }
      const poses = await det.estimatePoses(video, {flipHorizontal: false});
      let pose: Pose | null = null;
      if (poses && poses[0]) {
        const kps = poses[0].keypoints;
        pose = [];
        for (let i = 0; i < KEYPOINT_COUNT; i++) {
          pose.push({x: kps[i].x, y: kps[i].y, score: kps[i].score ?? 0});
        }
        if (!resting) {
          const events = detector.process(pose, performance.now());
          for (const e of events) {
            if (e === 'repCounted') handleRep();
          }
        }
      }
      draw(pose);
      requestAnimationFrame(loop);
    }
    loop();
  }

  // камера запускается заново при каждом входе; предыдущий поток уже остановлен
  run().catch(err => {
    statusEl.textContent = 'Ошибка: ' + (err?.message ?? String(err));
    // eslint-disable-next-line no-console
    console.error(err);
  });
}
```

- [ ] **Step 2: Build + typecheck**

```bash
cd /home/keliorw/Projects/Job/push-ups-rpg/push-up-rpg
npx --yes esbuild web-game/src/main.ts --bundle --format=esm --outfile=web-game/app.js
npx tsc -p web-game/tsconfig.json
```

Expected: esbuild OK, tsc clean.

- [ ] **Step 3: Full core suite + app tsc (nothing regressed)**

```bash
cd /home/keliorw/Projects/Job/push-ups-rpg/push-up-rpg/app
npx tsc --noEmit && npm test 2>&1 | tail -5
```

Expected: app tsc clean; all Jest suites pass (game core + existing).

- [ ] **Step 4: Manual end-to-end check (user)**

Serve `web-game` on localhost, START → node 1 → card (Чумной кабан, 6) → Начать тренировку → do 6 push-ups → HP empties → "Повержен!" → На карту → node 1 done, node 2... still location 1 (next monster m2). After the boss (3 sets), verify the set indicator and (for later bosses) rest. Verify the daily lock blocks a second fight until DEV "сбросить день".

- [ ] **Step 5: Commit**

```bash
cd /home/keliorw/Projects/Job/push-ups-rpg/push-up-rpg
git add web-game/src/workout-screen.ts web-game/app.js
git commit -m "feat(web-game): workout screen wiring detector to set/rep automaton, HP, rest, victory" -- web-game/src/workout-screen.ts web-game/app.js
```

---

## Notes for the implementer

- The map's per-location node represents 4 sequential fights (3 minions then the boss). The map highlights the current *location*; the card always shows the current *monster* (`currentMonster`). Sub-progress within a location is implicit (the node stays "current" until its 4th monster — the boss — is beaten, then it becomes "done" and the next node becomes "current").
- `NODE_POSITIONS` are approximate; the user calibrates them visually against `games/map.png` if markers sit off the drawn circles. Changing only the numbers + rebuild is enough.
- `web-game` type-checks via its own `tsconfig.json` (which also pulls in the shared `app/src/game` and `app/src/pose`), separate from the app's `tsc`. Run both.
- Do not modify `web-demo/`.
