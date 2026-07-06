# Arena Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Добавить в web-game режим «Арена» — бесконечный забег, где игрок отжиманиями убивает мобов с растущей сложностью, пока не истечёт таймер моба; лучший результат (число убитых) сохраняется и участвует в отдельном арена-рейтинге.

**Architecture:** Чистая логика забега — `app/src/game/arena.ts` (TDD, Jest). Общий цикл «камера→позы→RepDetector→повтор+скелет» извлекается из `workout-screen.ts` в `battle-camera.ts` и переиспользуется кампанией и ареной. Арена собирается из `arena-lobby.ts` (лобби + превью) и `arena-battle.ts` (бой поверх DOM `#screen-workout`). Данные (`bestArena`) — localStorage + Firestore через расширенный `Profile`/`mergeProfile`.

**Tech Stack:** TypeScript, esbuild-бандл (`--external:'https://*'`), Jest (app), `node --test` (web-game чистая логика), Firebase Firestore (CDN ESM), MoveNet/TF.js (CDN глобалы).

## Global Constraints

- **Ветка:** `web-arena` (застекана поверх `web-map-rating-modal` / PR #11). Все коммиты сюда.
- **`app.js` — собранный артефакт в гите.** После правок любого TS в `web-game/` пересобирать: `npx --yes esbuild web-game/src/main.ts --bundle --format=esm --outfile=web-game/app.js --external:'https://*'` (из корня репо).
- **CDN-импорты Firebase оставлять внешними** (`--external:'https://*'`); импорты Firestore — с полного URL `https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js`.
- **RN-ядро `app/src/game/*` не ломать:** `arena.ts` — новый файл, существующие не трогаем. RN-приложение арену не получает (веб-прототип).
- **Правила Firestore менять НЕ нужно:** `bestArena` не валидируется (как `totalReps`); чтение публичное.
- **tsc raw `tsc -p web-game/tsconfig.json` даёт ~16 структурных «ошибок» и на main** (CDN https-импорты, `node:test`, `.ts`-импорты) — это НЕ регрессия. Гейт по типам: не добавлять НОВЫХ реальных ошибок (кроме этих категорий).
- **Тесты-гейты:** `cd app && npx jest` (был 44/44) и `node --test web-game/src/sync.test.ts web-game/src/nickname.test.ts` (10/10) — не должны падать; новые тесты добавляются.
- Комментарии и UI-строки — по-русски, в тоне существующего кода.
- Числа баланса — только через `ARENA_CONFIG` (Task 1), нигде не хардкодить.

---

## File Structure

**Создаём:**
- `app/src/game/arena.ts` — чистая логика: конфиг, формулы HP/таймера, выбор монстра, state-машина забега.
- `app/__tests__/game-arena.test.ts` — Jest-тесты логики арены.
- `web-game/src/battle-camera.ts` — извлечённый цикл камеры/распознавания/скелета.
- `web-game/src/arena-lobby.ts` — лобби арены + превью первого моба.
- `web-game/src/arena-battle.ts` — бой арены поверх `#screen-workout`, отдых, конец забега, экран результата, сохранение.

**Модифицируем:**
- `web-game/src/sync.ts` — `Profile.bestArena` + merge max.
- `web-game/src/sync.test.ts` — тест merge `bestArena`.
- `web-game/src/storage.ts` — `loadBestArena`/`saveBestArena`.
- `web-game/src/remote-storage.ts` — `bestArena` в save/load; `ArenaLeaderRow`; `loadArenaLeaderboard`.
- `web-game/src/arena-screen.ts` — параметризовать модалку под два рейтинга (XP / арена); убрать полноэкранный `openArena`.
- `web-game/src/workout-screen.ts` — рефактор на `battle-camera`.
- `web-game/src/main.ts` — `bestArena` в профиле; роутинг новых экранов; `btn-arena` → лобби; убрать старый `#screen-arena`.
- `web-game/index.html` — новые экраны `#screen-arena-lobby`/`#screen-arena-result`; стили; ассеты; удалить `#screen-arena`.
- `web-game/games/arena-bg.png`, `web-game/games/arena-start-button.png` — новые ассеты (конвертация из `~/Downloads`).
- `web-game/app.js` — пересборка (финальный таск).

---

## Task 1: Чистая логика арены (`arena.ts`) + Jest

**Files:**
- Create: `app/src/game/arena.ts`
- Test: `app/__tests__/game-arena.test.ts`

**Interfaces:**
- Consumes: `MONSTER_SEQUENCE` из `app/src/game/monsters.ts` (`Monster[]`, длина 40); `Monster` из `app/src/game/types.ts`.
- Produces:
  - `ARENA_CONFIG: ArenaConfig` и тип `ArenaConfig {baseHp,hpStep,secondsPerRep,baseTimerSec,restSec: number}`
  - `mobHp(n: number, cfg?: ArenaConfig): number`
  - `mobTimerSec(n: number, cfg?: ArenaConfig): number`
  - `arenaMonster(n: number): Monster`
  - тип `ArenaPhase = 'fighting'|'resting'|'over'`
  - интерфейс `ArenaState {mobIndex,hpLeft,kills: number; phase: ArenaPhase}`
  - `newRun(cfg?: ArenaConfig): ArenaState`
  - тип `ArenaEvent = 'hit'|'mobKilled'|'noop'`
  - `onRep(s: ArenaState, cfg?: ArenaConfig): {state: ArenaState; event: ArenaEvent}`
  - `onRestDone(s: ArenaState, cfg?: ArenaConfig): ArenaState`
  - `onTimeout(s: ArenaState): ArenaState`

- [ ] **Step 1: Написать падающий тест**

Создать `app/__tests__/game-arena.test.ts`:

```ts
import {
  ARENA_CONFIG,
  mobHp,
  mobTimerSec,
  arenaMonster,
  newRun,
  onRep,
  onRestDone,
  onTimeout,
} from '../src/game/arena';
import {MONSTER_SEQUENCE} from '../src/game/monsters';

describe('arena формулы', () => {
  test('mobHp растёт на hpStep', () => {
    expect(mobHp(1)).toBe(5);
    expect(mobHp(2)).toBe(7);
    expect(mobHp(10)).toBe(23);
  });

  test('mobTimerSec: минимум базовый, потом HP*secondsPerRep', () => {
    // hp*4: моб1=20→60(min), моб6 hp15*4=60→60, моб7 hp17*4=68→68
    expect(mobTimerSec(1)).toBe(60);
    expect(mobTimerSec(6)).toBe(60);
    expect(mobTimerSec(7)).toBe(68);
    expect(mobTimerSec(10)).toBe(92);
  });

  test('mobTimerSec всегда >= 4 секунды на отжимание', () => {
    for (let n = 1; n <= 30; n++) {
      expect(mobTimerSec(n)).toBeGreaterThanOrEqual(mobHp(n) * ARENA_CONFIG.secondsPerRep);
    }
  });

  test('arenaMonster идёт по кампании и зацикливается', () => {
    expect(arenaMonster(1)).toBe(MONSTER_SEQUENCE[0]);
    expect(arenaMonster(2)).toBe(MONSTER_SEQUENCE[1]);
    const len = MONSTER_SEQUENCE.length;
    expect(arenaMonster(len)).toBe(MONSTER_SEQUENCE[len - 1]);
    expect(arenaMonster(len + 1)).toBe(MONSTER_SEQUENCE[0]); // по кругу
  });
});

describe('arena state-машина', () => {
  test('newRun — первый моб, полный HP, fighting', () => {
    const s = newRun();
    expect(s).toEqual({mobIndex: 1, hpLeft: 5, kills: 0, phase: 'fighting'});
  });

  test('onRep снимает HP, событие hit', () => {
    const r = onRep(newRun());
    expect(r.event).toBe('hit');
    expect(r.state.hpLeft).toBe(4);
    expect(r.state.kills).toBe(0);
  });

  test('последний повтор убивает моба → mobKilled + resting', () => {
    let s = newRun(); // hp 5
    let event = '';
    for (let i = 0; i < 5; i++) {
      const r = onRep(s);
      s = r.state;
      event = r.event;
    }
    expect(event).toBe('mobKilled');
    expect(s.kills).toBe(1);
    expect(s.phase).toBe('resting');
    expect(s.hpLeft).toBe(0);
  });

  test('onRep в фазе resting/over — noop', () => {
    const resting = {mobIndex: 1, hpLeft: 0, kills: 1, phase: 'resting' as const};
    expect(onRep(resting).event).toBe('noop');
    expect(onRep(resting).state).toBe(resting);
    const over = {mobIndex: 3, hpLeft: 2, kills: 2, phase: 'over' as const};
    expect(onRep(over).event).toBe('noop');
  });

  test('onRestDone → следующий моб с новым HP, fighting', () => {
    const resting = {mobIndex: 1, hpLeft: 0, kills: 1, phase: 'resting' as const};
    const s = onRestDone(resting);
    expect(s).toEqual({mobIndex: 2, hpLeft: 7, kills: 1, phase: 'fighting'});
  });

  test('onRestDone вне resting — no-op', () => {
    const fighting = newRun();
    expect(onRestDone(fighting)).toBe(fighting);
  });

  test('onTimeout из fighting → over; иначе без изменений', () => {
    expect(onTimeout(newRun()).phase).toBe('over');
    const resting = {mobIndex: 1, hpLeft: 0, kills: 1, phase: 'resting' as const};
    expect(onTimeout(resting)).toBe(resting);
    const over = {mobIndex: 1, hpLeft: 0, kills: 1, phase: 'over' as const};
    expect(onTimeout(over)).toBe(over);
  });
});
```

- [ ] **Step 2: Запустить тест — должен упасть**

Run: `cd app && npx jest game-arena -v`
Expected: FAIL — `Cannot find module '../src/game/arena'`.

- [ ] **Step 3: Реализовать `arena.ts`**

Создать `app/src/game/arena.ts`:

```ts
import {MONSTER_SEQUENCE} from './monsters';
import {Monster} from './types';

export interface ArenaConfig {
  /** HP первого моба (= число отжиманий на убийство). */
  baseHp: number;
  /** Прирост HP за каждого следующего моба. */
  hpStep: number;
  /** Минимум секунд на одно отжимание — задаёт нижнюю границу таймера. */
  secondsPerRep: number;
  /** Базовый таймер моба, сек (пока HP·secondsPerRep не превысит его). */
  baseTimerSec: number;
  /** Отдых между мобами, сек. */
  restSec: number;
}

export const ARENA_CONFIG: ArenaConfig = {
  baseHp: 5,
  hpStep: 2,
  secondsPerRep: 4,
  baseTimerSec: 60,
  restSec: 30,
};

/** HP моба n (1-based): baseHp + hpStep·(n−1). */
export function mobHp(n: number, cfg: ArenaConfig = ARENA_CONFIG): number {
  return cfg.baseHp + cfg.hpStep * (n - 1);
}

/**
 * Таймер моба n, сек: не меньше baseTimerSec и не меньше HP·secondsPerRep —
 * то есть на каждое отжимание гарантированно даётся >= secondsPerRep секунд,
 * а с ростом HP таймер увеличивается.
 */
export function mobTimerSec(n: number, cfg: ArenaConfig = ARENA_CONFIG): number {
  return Math.max(cfg.baseTimerSec, mobHp(n, cfg) * cfg.secondsPerRep);
}

/** Монстр (арт/имя) для моба n: монстры кампании по порядку, по кругу после последнего. */
export function arenaMonster(n: number): Monster {
  return MONSTER_SEQUENCE[(n - 1) % MONSTER_SEQUENCE.length];
}

export type ArenaPhase = 'fighting' | 'resting' | 'over';

export interface ArenaState {
  /** 1-based номер текущего моба. */
  mobIndex: number;
  /** Осталось HP у текущего моба. */
  hpLeft: number;
  /** Убито мобов за забег. */
  kills: number;
  phase: ArenaPhase;
}

export function newRun(cfg: ArenaConfig = ARENA_CONFIG): ArenaState {
  return {mobIndex: 1, hpLeft: mobHp(1, cfg), kills: 0, phase: 'fighting'};
}

export type ArenaEvent = 'hit' | 'mobKilled' | 'noop';

/**
 * Учитывает один засчитанный повтор. Только в фазе fighting: −1 HP; при 0 —
 * моб убит (kills+1, фаза resting). В resting/over — no-op.
 */
export function onRep(
  s: ArenaState,
  _cfg: ArenaConfig = ARENA_CONFIG,
): {state: ArenaState; event: ArenaEvent} {
  if (s.phase !== 'fighting') return {state: s, event: 'noop'};
  const hpLeft = s.hpLeft - 1;
  if (hpLeft <= 0) {
    return {
      state: {...s, hpLeft: 0, kills: s.kills + 1, phase: 'resting'},
      event: 'mobKilled',
    };
  }
  return {state: {...s, hpLeft}, event: 'hit'};
}

/** Отдых закончился → следующий моб с новым HP, фаза fighting. Вне resting — no-op. */
export function onRestDone(s: ArenaState, cfg: ArenaConfig = ARENA_CONFIG): ArenaState {
  if (s.phase !== 'resting') return s;
  const mobIndex = s.mobIndex + 1;
  return {...s, mobIndex, hpLeft: mobHp(mobIndex, cfg), phase: 'fighting'};
}

/** Таймер моба истёк во время боя → забег окончен. Вне fighting — no-op. */
export function onTimeout(s: ArenaState): ArenaState {
  if (s.phase !== 'fighting') return s;
  return {...s, phase: 'over'};
}
```

- [ ] **Step 4: Запустить тест — должен пройти**

Run: `cd app && npx jest game-arena -v`
Expected: PASS (все кейсы).

- [ ] **Step 5: Убедиться, что вся app-сюита цела**

Run: `cd app && npx jest`
Expected: PASS, суммарно 44 + новые = 55 tests passed (10 новых кейсов).

- [ ] **Step 6: Commit**

```bash
git add app/src/game/arena.ts app/__tests__/game-arena.test.ts
git commit -m "feat(arena): чистая логика забега (HP/таймер/state-машина) + Jest"
```

---

## Task 2: Персистенс `bestArena` (Profile / storage / remote / merge)

**Files:**
- Modify: `web-game/src/sync.ts`
- Modify: `web-game/src/sync.test.ts`
- Modify: `web-game/src/storage.ts`
- Modify: `web-game/src/remote-storage.ts`

**Interfaces:**
- Consumes: `Profile` (текущий: `{progression: Progression; totalReps: number}`), `mergeProfile` из `sync.ts`; `db` из `firebase.ts`; Firestore CDN функции.
- Produces:
  - `Profile` расширен полем `bestArena: number`.
  - `mergeProfile` учитывает `bestArena = max`.
  - `loadBestArena(): number`, `saveBestArena(n: number): void` в `storage.ts`.
  - `saveRemote`/`loadRemote` пишут/читают `bestArena`.
  - `interface ArenaLeaderRow {uid: string; nickname: string; kills: number}`
  - `loadArenaLeaderboard(max: number): Promise<ArenaLeaderRow[]>` в `remote-storage.ts`.

- [ ] **Step 1: Написать падающий тест для merge**

В `web-game/src/sync.test.ts` добавить в конец файла:

```ts
test('mergeProfile: bestArena берётся по максимуму, не откатывается', () => {
  assert.deepEqual(
    mergeProfile(
      {progression: {defeatedCount: 3, lastWorkoutDate: '2026-07-01'}, totalReps: 120, bestArena: 8},
      {progression: {defeatedCount: 5, lastWorkoutDate: '2026-06-30'}, totalReps: 90, bestArena: 3},
    ),
    {progression: {defeatedCount: 5, lastWorkoutDate: '2026-07-01'}, totalReps: 120, bestArena: 8},
  );
});
```

- [ ] **Step 2: Запустить — должен упасть**

Run: `node --test web-game/src/sync.test.ts`
Expected: FAIL — существующий `mergeProfile` не имеет `bestArena` (несовпадение объекта / тип).

- [ ] **Step 3: Расширить `Profile` и `mergeProfile`**

В `web-game/src/sync.ts` заменить блок `Profile` + `mergeProfile`:

```ts
export interface Profile {
  progression: Progression;
  totalReps: number;
  /** Лучший результат арены — число убитых мобов за забег. */
  bestArena: number;
}

/** Объединяет полный профиль (прогресс + XP + рекорд арены), ничего не откатывая. */
export function mergeProfile(a: Profile, b: Profile): Profile {
  return {
    progression: mergeProgress(a.progression, b.progression),
    totalReps: Math.max(a.totalReps, b.totalReps),
    bestArena: Math.max(a.bestArena, b.bestArena),
  };
}
```

- [ ] **Step 4: Запустить — должен пройти (и старый merge-тест тоже)**

Run: `node --test web-game/src/sync.test.ts`
Expected: FAIL — старый тест `mergeProfile: прогресс и XP не откатываются` теперь не содержит `bestArena` в ожидании. Обновить его: в существующем кейсе добавить `bestArena` в оба входа и в ожидаемый результат.

Заменить в `sync.test.ts` существующий кейс на:

```ts
test('mergeProfile: прогресс и XP не откатываются', () => {
  assert.deepEqual(
    mergeProfile(
      {progression: {defeatedCount: 3, lastWorkoutDate: '2026-07-01'}, totalReps: 120, bestArena: 0},
      {progression: {defeatedCount: 5, lastWorkoutDate: '2026-06-30'}, totalReps: 90, bestArena: 0},
    ),
    {progression: {defeatedCount: 5, lastWorkoutDate: '2026-07-01'}, totalReps: 120, bestArena: 0},
  );
});
```

Run: `node --test web-game/src/sync.test.ts`
Expected: PASS (оба кейса mergeProfile + существующие mergeProgress).

- [ ] **Step 5: Добавить storage-обёртки**

В `web-game/src/storage.ts` добавить в конец файла:

```ts
const BEST_ARENA_KEY = 'pushuprpg.bestArena';

export function loadBestArena(): number {
  const raw = localStorage.getItem(BEST_ARENA_KEY);
  const n = raw != null ? Number(raw) : 0;
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0;
}

export function saveBestArena(n: number): void {
  localStorage.setItem(BEST_ARENA_KEY, String(Math.max(0, Math.floor(n))));
}
```

- [ ] **Step 6: Читать/писать `bestArena` в Firestore + арена-рейтинг**

В `web-game/src/remote-storage.ts`:

(a) В `loadRemote` — в возвращаемый `Profile` добавить `bestArena`. Заменить `return {...}` на:

```ts
  return {
    progression: {
      defeatedCount: typeof d.defeatedCount === 'number' ? d.defeatedCount : 0,
      lastWorkoutDate: typeof d.lastWorkoutDate === 'string' ? d.lastWorkoutDate : null,
    },
    totalReps: typeof d.totalReps === 'number' ? d.totalReps : 0,
    bestArena: typeof d.bestArena === 'number' ? d.bestArena : 0,
  };
```

(b) В `saveRemote` — в объект `setDoc` добавить поле `bestArena: profile.bestArena,` (рядом с `totalReps`).

(c) Добавить в конец файла тип и загрузку арена-рейтинга. `where` уже не импортирован — добавить его в импорт из firestore CDN (в существующий список `{doc,getDoc,setDoc,serverTimestamp,collection,query,orderBy,limit,getDocs}` добавить `where`):

```ts
export interface ArenaLeaderRow {
  uid: string;
  nickname: string;
  kills: number;
}

/** Топ игроков арены по лучшему результату (числу убитых мобов). */
export async function loadArenaLeaderboard(max: number): Promise<ArenaLeaderRow[]> {
  const q = query(
    collection(db, 'users'),
    where('bestArena', '>', 0),
    orderBy('bestArena', 'desc'),
    limit(max),
  );
  const snap = await getDocs(q);
  const rows: ArenaLeaderRow[] = [];
  snap.forEach(docSnap => {
    const d = docSnap.data();
    rows.push({
      uid: docSnap.id,
      nickname: typeof d.nickname === 'string' && d.nickname ? d.nickname : '—',
      kills: typeof d.bestArena === 'number' ? d.bestArena : 0,
    });
  });
  return rows;
}
```

- [ ] **Step 7: tsc — нет новых реальных ошибок**

Run: `app/node_modules/.bin/tsc -p web-game/tsconfig.json 2>&1 | grep "error TS" | grep -vE "node:test|node:assert|allowImportingTsExtensions|gstatic.com|implicitly has an 'any'"`
Expected: пусто (только известный структурный шум остаётся).

> ⚠️ Все места, создающие `Profile` (в `main.ts`), временно не имеют `bestArena` → это НОВАЯ реальная ошибка типов. Она устраняется в Task 6 (main.ts). До Task 6 tsc по `web-game` покажет ошибки в `main.ts` про отсутствующее `bestArena` — это ожидаемо. Проверка выше делается ТОЛЬКО по файлам этого таска; для честного гейта запусти:
> `app/node_modules/.bin/tsc -p web-game/tsconfig.json 2>&1 | grep -E "sync\.ts|storage\.ts|remote-storage\.ts"` → должно быть пусто.

- [ ] **Step 8: Commit**

```bash
git add web-game/src/sync.ts web-game/src/sync.test.ts web-game/src/storage.ts web-game/src/remote-storage.ts
git commit -m "feat(arena): bestArena в Profile/merge/storage/Firestore + loadArenaLeaderboard"
```

---

## Task 3: Параметризовать модалку рейтинга (XP / арена)

**Files:**
- Modify: `web-game/src/arena-screen.ts`

**Interfaces:**
- Consumes: `loadLeaderboard`, `LeaderRow` из `remote-storage.ts`; `loadArenaLeaderboard`, `ArenaLeaderRow` (Task 2); `locationLabel` из `levels.ts`; DOM `#arena-modal`, `#arena-modal-list`, заголовок `#arena-modal-panel h1`.
- Produces:
  - `openXpRatingModal(currentUid: string | null): Promise<void>` — модалка XP-рейтинга (для карты).
  - `openArenaRatingModal(currentUid: string | null): Promise<void>` — модалка арена-рейтинга (для лобби).
  - `closeArenaModal(): void` (без изменений).
  - Удаляются: `openArena` (полноэкранный) и `openArenaModal` (переименован в `openXpRatingModal`).

- [ ] **Step 1: Переписать `arena-screen.ts`**

Полностью заменить содержимое `web-game/src/arena-screen.ts`:

```ts
import {loadLeaderboard, LeaderRow, loadArenaLeaderboard, ArenaLeaderRow} from './remote-storage';
import {locationLabel} from './levels';

function esc(s: string): string {
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

function xpRowHtml(row: LeaderRow, rank: number, isMe: boolean): string {
  const loc = locationLabel(row.defeatedCount);
  const locText = loc.index != null ? `Локация ${loc.index} · ${esc(loc.name)}` : esc(loc.name);
  return (
    `<div class="arena-row${isMe ? ' me' : ''}">` +
    `<div class="rank">${rank}</div>` +
    `<div class="who"><b>${esc(row.nickname)}</b><span>${locText}</span></div>` +
    `<div class="xp">${row.totalReps} XP</div>` +
    `</div>`
  );
}

function arenaRowHtml(row: ArenaLeaderRow, rank: number, isMe: boolean): string {
  return (
    `<div class="arena-row${isMe ? ' me' : ''}">` +
    `<div class="rank">${rank}</div>` +
    `<div class="who"><b>${esc(row.nickname)}</b></div>` +
    `<div class="xp">${row.kills} 💀</div>` +
    `</div>`
  );
}

/** Открывает модалку и рендерит в неё строки, полученные и отрисованные переданными колбэками. */
async function openModal<T extends {uid: string}>(
  title: string,
  currentUid: string | null,
  load: () => Promise<T[]>,
  sort: (rows: T[]) => void,
  rowHtml: (row: T, rank: number, isMe: boolean) => string,
): Promise<void> {
  const modal = document.getElementById('arena-modal') as HTMLElement;
  const list = document.getElementById('arena-modal-list') as HTMLElement;
  const h1 = document.querySelector('#arena-modal-panel h1') as HTMLElement;
  h1.textContent = title;
  modal.hidden = false;
  list.textContent = 'Загрузка…';
  try {
    const rows = await load();
    sort(rows);
    if (rows.length === 0) {
      list.innerHTML = '<div id="arena-empty">Пока никто не играл</div>';
      return;
    }
    list.innerHTML = rows.map((r, i) => rowHtml(r, i + 1, r.uid === currentUid)).join('');
  } catch {
    list.innerHTML = '<div id="arena-empty">Не удалось загрузить рейтинг</div>';
  }
}

/** Модалка общего XP-рейтинга (кнопка-медальон на карте). */
export function openXpRatingModal(currentUid: string | null): Promise<void> {
  return openModal<LeaderRow>(
    'Рейтинг',
    currentUid,
    () => loadLeaderboard(50),
    rows => rows.sort((a, b) => b.defeatedCount - a.defeatedCount || b.totalReps - a.totalReps),
    xpRowHtml,
  );
}

/** Модалка арена-рейтинга по лучшему результату (кнопка-медальон в лобби арены). */
export function openArenaRatingModal(currentUid: string | null): Promise<void> {
  return openModal<ArenaLeaderRow>(
    'Рейтинг арены',
    currentUid,
    () => loadArenaLeaderboard(50),
    rows => rows.sort((a, b) => b.kills - a.kills),
    arenaRowHtml,
  );
}

/** Закрыть модалку рейтинга. */
export function closeArenaModal(): void {
  (document.getElementById('arena-modal') as HTMLElement).hidden = true;
}
```

> Примечание: заголовок модалки теперь ставится из JS, поэтому статический `<h1>Рейтинг</h1>` в разметке (Task 5) остаётся как дефолт, но будет перезаписан.

- [ ] **Step 2: tsc — по `arena-screen.ts` без новых ошибок**

Run: `app/node_modules/.bin/tsc -p web-game/tsconfig.json 2>&1 | grep "arena-screen.ts"`
Expected: пусто.

> `main.ts` пока импортирует `openArena`/`openArenaModal` — ошибки в `main.ts` ожидаемы до Task 6.

- [ ] **Step 3: Commit**

```bash
git add web-game/src/arena-screen.ts
git commit -m "refactor(web): параметризовать модалку рейтинга (XP и арена) — общий компонент"
```

---

## Task 4: Извлечь `battle-camera.ts`, перевести кампанию на него

**Files:**
- Create: `web-game/src/battle-camera.ts`
- Modify: `web-game/src/workout-screen.ts`

**Interfaces:**
- Consumes: `DEFAULT_CONFIG`, `RepDetector`, `KP`, `Pose` из `app/src/pose/*`.
- Produces:
  - `interface BattleCamera {stop(): void; setPaused(paused: boolean): void}`
  - `startBattleCamera(video, canvas, detector, onRep, onStatus): Promise<BattleCamera>` где `onRep: () => void`, `onStatus: (text: string) => void`.

- [ ] **Step 1: Создать `battle-camera.ts`**

Создать `web-game/src/battle-camera.ts`:

```ts
import {DEFAULT_CONFIG} from '../../app/src/pose/config';
import {RepDetector} from '../../app/src/pose/RepDetector';
import {KP, Pose} from '../../app/src/pose/types';

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

export interface BattleCamera {
  /** Останавливает камеру и цикл распознавания. Идемпотентно. */
  stop(): void;
  /** Пока paused=true, засчитанные повторы игнорируются (для отдыха), скелет рисуется. */
  setPaused(paused: boolean): void;
}

/**
 * Запускает фронтальную камеру + распознавание поз MoveNet. На каждый
 * засчитанный повтор (когда не на паузе) зовёт onRep(); рисует скелет на canvas.
 * onStatus сообщает текстовые статусы (камера / упор лёжа / ошибка).
 */
export async function startBattleCamera(
  video: HTMLVideoElement,
  canvas: HTMLCanvasElement,
  detector: any,
  onRep: () => void,
  onStatus: (text: string) => void,
): Promise<BattleCamera> {
  const ctx = canvas.getContext('2d')!;
  const repDetector = new RepDetector(DEFAULT_CONFIG);
  let paused = false;
  let stopped = false;

  onStatus('Запрашиваю камеру…');
  const stream = await navigator.mediaDevices.getUserMedia({
    video: {facingMode: 'user', width: 640, height: 480},
    audio: false,
  });
  video.srcObject = stream;
  await video.play();
  onStatus('Займи упор лёжа');

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

  async function loop() {
    if (stopped) {
      stream.getTracks().forEach(t => t.stop());
      return;
    }
    const poses = await detector.estimatePoses(video, {flipHorizontal: false});
    let pose: Pose | null = null;
    if (poses && poses[0]) {
      const kps = poses[0].keypoints;
      pose = [];
      for (let i = 0; i < KEYPOINT_COUNT; i++) {
        pose.push({x: kps[i].x, y: kps[i].y, score: kps[i].score ?? 0});
      }
      if (!paused) {
        const events = repDetector.process(pose, performance.now());
        for (const e of events) {
          if (e === 'repCounted') onRep();
        }
      }
    }
    draw(pose);
    requestAnimationFrame(loop);
  }
  loop();

  return {
    stop() {
      stopped = true;
      stream.getTracks().forEach(t => t.stop());
    },
    setPaused(p: boolean) {
      paused = p;
    },
  };
}
```

- [ ] **Step 2: Переписать `workout-screen.ts` поверх `battle-camera`**

Полностью заменить содержимое `web-game/src/workout-screen.ts`:

```ts
import {currentMonster} from '../../app/src/game/progression';
import {WorkoutState, newWorkout, onRep, totalTarget} from '../../app/src/game/workout';
import {startBattleCamera, BattleCamera} from './battle-camera';
import type {App} from './main';

export function startWorkout(app: App, detector: any): void {
  const found = currentMonster(app.progression);
  if (!found) return;
  const monster = found;

  const video = document.getElementById('wk-video') as HTMLVideoElement;
  const canvas = document.getElementById('wk-overlay') as HTMLCanvasElement;
  const counterEl = document.getElementById('wk-counter')!;
  const setEl = document.getElementById('wk-set')!;
  const hpEl = document.getElementById('wk-hp') as HTMLElement;
  const restEl = document.getElementById('wk-rest') as HTMLElement;
  const statusEl = document.getElementById('wk-status')!;
  const backBtn = document.getElementById('wk-back') as HTMLButtonElement;
  const monsterImg = document.getElementById('wk-monster') as HTMLImageElement;
  const monsterName = document.getElementById('wk-monster-name') as HTMLElement;
  const hpTextEl = document.getElementById('wk-hp-text')!;
  const timeEl = document.getElementById('wk-time')!;

  monsterImg.src = `./games/${monster.cardImage}`;
  monsterName.textContent = monster.name;

  const maxHp = totalTarget(monster);
  const hitSound = new Audio('./games/hit.mp3');
  hitSound.volume = 0.6;

  let wk: WorkoutState = newWorkout(monster);
  let camera: BattleCamera | null = null;

  // Таймер уровня (сколько заняло прохождение) — слева сверху, растущий.
  const startMs = performance.now();
  const fmtTime = (ms: number): string => {
    const s = Math.floor(ms / 1000);
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  };
  const timerId = window.setInterval(() => {
    timeEl.textContent = fmtTime(performance.now() - startMs);
  }, 250);
  const stopTimer = () => window.clearInterval(timerId);

  backBtn.onclick = () => {
    stopTimer();
    if (camera) camera.stop();
    app.persistProfile(); // XP из этого боя (даже без победы) уходит в облако
    app.render();
    app.show('screen-map');
  };

  const updateHud = () => {
    counterEl.textContent = String(wk.repsInSet);
    setEl.textContent =
      monster.sets > 1
        ? `Сет ${wk.setIndex + 1}/${monster.sets} · цель ${monster.repsPerSet}`
        : `Цель ${monster.repsPerSet}`;
    const hp = Math.max(0, maxHp - wk.totalReps);
    hpEl.style.width = `${(hp / maxHp) * 100}%`;
    hpTextEl.textContent = `${hp} / ${maxHp} HP`;
  };
  updateHud();

  function startRest() {
    let left = monster.restBetweenSetsSec;
    if (left <= 0) {
      if (camera) camera.setPaused(false);
      return;
    }
    if (camera) camera.setPaused(true);
    restEl.style.display = 'flex';
    restEl.textContent = `Отдых: ${left} с (нажми, чтобы продолжить)`;
    restEl.onclick = () => {
      restEl.style.display = 'none';
      if (camera) camera.setPaused(false);
    };
    const tick = () => {
      if (restEl.style.display === 'none') return; // пропущено тапом
      if (left <= 0) {
        restEl.style.display = 'none';
        if (camera) camera.setPaused(false);
        return;
      }
      restEl.textContent = `Отдых: ${left} с (нажми, чтобы продолжить)`;
      left -= 1;
      setTimeout(tick, 1000);
    };
    tick();
  }

  function handleRep() {
    try {
      hitSound.currentTime = 0;
      hitSound.play().catch(() => {});
    } catch {
      // звук не критичен
    }
    const res = onRep(wk, monster);
    wk = res.state;
    app.addRep();
    updateHud();
    if (res.event === 'monsterDefeated') {
      stopTimer();
      if (camera) camera.stop();
      app.onDefeated();
    } else if (res.event === 'setComplete') {
      startRest();
    }
  }

  startBattleCamera(video, canvas, detector, handleRep, text => {
    statusEl.textContent = text;
  }).then(
    cam => {
      camera = cam;
    },
    err => {
      statusEl.textContent = 'Ошибка: ' + (err?.message ?? String(err));
      // eslint-disable-next-line no-console
      console.error(err);
    },
  );
}
```

> Изменение поведения отдыха: раньше `resting`-флаг гейтил повторы в самом цикле; теперь пауза идёт через `camera.setPaused`. Логика «0 сек → без паузы; иначе таймер + пропуск тапом» сохранена. Победа/сет/HUD не изменились.

- [ ] **Step 3: tsc — без новых ошибок по этим файлам**

Run: `app/node_modules/.bin/tsc -p web-game/tsconfig.json 2>&1 | grep -E "battle-camera.ts|workout-screen.ts"`
Expected: пусто.

- [ ] **Step 4: Пересобрать бандл и проверить кампанию вживую**

Run (из корня): `npx --yes esbuild web-game/src/main.ts --bundle --format=esm --outfile=web-game/app.js --external:'https://*'`

> ⚠️ Сборка сейчас упадёт: `main.ts` всё ещё импортирует удалённые `openArena`/`openArenaModal` из Task 3, а `Profile` требует `bestArena`. **Этот Task 4 не собирается standalone — гейт «кампания жива» переносится в финальный Task 8** (после того как Task 6 починит main.ts). Здесь достаточно tsc-гейта по `battle-camera.ts`/`workout-screen.ts` из Step 3.

- [ ] **Step 5: Commit**

```bash
git add web-game/src/battle-camera.ts web-game/src/workout-screen.ts
git commit -m "refactor(web): извлечь battle-camera; workout-screen на общий цикл камеры"
```

---

## Task 5: Разметка и стили — лобби, экран результата, ассеты; удалить #screen-arena

**Files:**
- Modify: `web-game/index.html`
- Create: `web-game/games/arena-bg.png`, `web-game/games/arena-start-button.png`

**Interfaces:**
- Produces DOM-контракт для Task 6/7: экраны `#screen-arena-lobby` (с `#arena-lobby-start` кнопкой, `#arena-best` текстом, `#arena-lobby-back`, `#arena-lobby-rating`), `#screen-arena-result` (с `#arena-result-kills`, `#arena-result-record`, `#arena-result-again`, `#arena-result-lobby`). Модалка `#arena-modal` — без изменений (заголовок ставится из JS).

- [ ] **Step 1: Сконвертировать ассеты**

Run:

```bash
python3 - <<'PY'
from PIL import Image
def conv(src, dst, w):
    im = Image.open(src).convert("RGBA")
    h = round(im.height * w / im.width)
    im.resize((w, h), Image.LANCZOS).save(dst, "PNG", optimize=True)
    import os; print(dst, im.size, "->", (w, h), os.path.getsize(dst), "bytes")
base = "/home/keliorw/Downloads"
out = "/home/keliorw/Projects/Job/push-ups-rpg/push-up-rpg/web-game/games"
conv(f"{base}/arena-bg.png", f"{out}/arena-bg.png", 800)
conv(f"{base}/arena-start-button.png", f"{out}/arena-start-button.png", 600)
PY
```

Expected: два файла записаны в `web-game/games/`, размеры разумные (<300KB каждый).

- [ ] **Step 2: Удалить полноэкранный `#screen-arena` (разметка)**

В `web-game/index.html` удалить блок:

```html
      <section id="screen-arena" class="screen">
        <div id="arena-box">
          <button id="arena-back" class="link-btn">← В меню</button>
          <h1>Рейтинг</h1>
          <div id="arena-list">Загрузка…</div>
        </div>
      </section>
```

- [ ] **Step 3: Удалить неиспользуемые стили `#screen-arena`**

В `<style>` удалить строки (модальные `.arena-row`/`.rank`/`.who`/`.xp`/`.me`/`#arena-empty` НЕ трогать — их использует модалка):

```css
      #screen-arena { min-height: 100vh; background: #101828; }
      #arena-box { max-width: 480px; margin: 0 auto; padding: 16px; }
      #arena-box h1 { color: #F5A623; text-align: center; font-size: 26px; margin: 8px 0 16px; }
```

- [ ] **Step 4: Добавить стили лобби и экрана результата**

В `<style>` перед `/* LOADING */` добавить:

```css
      /* ARENA LOBBY */
      #screen-arena-lobby.active { display: flex; }
      #screen-arena-lobby { position: relative; height: 100vh; overflow: hidden;
        align-items: center; justify-content: center; }
      #arena-lobby-bg { position: absolute; inset: 0; z-index: 0; }
      #arena-lobby-bg img { width: 100%; height: 100%; object-fit: cover; display: block; }
      #arena-lobby-center { position: relative; z-index: 1; display: flex;
        flex-direction: column; align-items: center; gap: 16px; padding: 0 20px; }
      #arena-lobby-start { width: 78%; max-width: 340px; aspect-ratio: 1099 / 567;
        border: none; background: transparent url('./games/arena-start-button.png') center/100% 100% no-repeat;
        cursor: pointer; display: flex; align-items: center; justify-content: center;
        transition: transform .1s ease; filter: drop-shadow(0 4px 14px rgba(0,0,0,.7)); }
      #arena-lobby-start span { font-family: Georgia, 'Times New Roman', serif; font-weight: 800;
        letter-spacing: 1px; text-transform: uppercase; font-size: clamp(18px, 5.5vw, 26px);
        color: #f6e9c8; text-shadow: 0 2px 3px #3a2408, 0 0 10px rgba(0,0,0,.6); }
      #arena-lobby-start:active { transform: translateY(1px) scale(.98); }
      #arena-best { z-index: 1; color: #f6e9c8; font-size: 16px; font-weight: 800;
        text-shadow: 0 2px 6px #000; }
      /* угловые кнопки лобби — как на карте */
      #arena-lobby-back { position: absolute; top: 10px; left: 10px; z-index: 5;
        width: 56px; height: 56px; padding: 0; border: none; background: none;
        cursor: pointer; transition: transform .1s ease; filter: drop-shadow(0 2px 6px rgba(0,0,0,.6)); }
      #arena-lobby-back img { width: 100%; height: 100%; display: block; }
      #arena-lobby-back:active { transform: scale(.93); }
      #arena-lobby-rating { position: absolute; top: 10px; right: 10px; z-index: 5;
        width: 56px; height: 56px; padding: 0; border: none; background: none;
        cursor: pointer; transition: transform .1s ease; filter: drop-shadow(0 2px 6px rgba(0,0,0,.6)); }
      #arena-lobby-rating img { width: 100%; height: 100%; display: block; }
      #arena-lobby-rating:active { transform: scale(.93); }
      /* ARENA RESULT */
      #screen-arena-result { text-align: center; padding-top: 22vh; }
      #screen-arena-result h1 { color: #F5A623; font-size: 34px; font-weight: 900; margin: 0 0 8px; }
      #arena-result-kills { font-size: 22px; font-weight: 800; margin-bottom: 6px; }
      #arena-result-record { color: #9aa4b2; font-size: 15px; min-height: 20px; }
      #arena-result-actions { display: flex; flex-direction: column; align-items: center;
        gap: 12px; margin-top: 26px; }
      #arena-result-lobby { background: #24314a; color: #fff; }
```

- [ ] **Step 5: Добавить разметку экранов (внутри `#app`, рядом с `#screen-victory`)**

В `web-game/index.html` после закрывающего `</section>` экрана `#screen-victory` (перед `<div id="arena-modal" hidden>`) вставить:

```html
      <section id="screen-arena-lobby" class="screen">
        <div id="arena-lobby-bg"><img src="./games/arena-bg.png" alt="" /></div>
        <button id="arena-lobby-back" aria-label="В меню">
          <img src="./games/back-in-map.png" alt="" />
        </button>
        <button id="arena-lobby-rating" aria-label="Рейтинг арены">
          <img src="./games/rating.png" alt="" />
        </button>
        <div id="arena-lobby-center">
          <button id="arena-lobby-start"><span>Let's do it</span></button>
          <div id="arena-best" style="display:none"></div>
        </div>
      </section>

      <section id="screen-arena-result" class="screen">
        <h1>Забег окончен</h1>
        <div id="arena-result-kills"></div>
        <div id="arena-result-record"></div>
        <div id="arena-result-actions">
          <button class="btn" id="arena-result-again">Ещё раз</button>
          <button class="btn" id="arena-result-lobby">В лобби</button>
        </div>
      </section>
```

- [ ] **Step 6: Проверить, что HTML открывается (страница не падает по разметке)**

Run: `cd web-game && python3 -m http.server 8099 & sleep 1; curl -s -o /dev/null -w "html:%{http_code} bg:%{http_code}\n" http://localhost:8099/; curl -s -o /dev/null -w "bg:%{http_code}\n" http://localhost:8099/games/arena-bg.png; curl -s -o /dev/null -w "btn:%{http_code}\n" http://localhost:8099/games/arena-start-button.png; kill %1 2>/dev/null`
Expected: `html:200`, `bg:200`, `btn:200`.

(Полная визуальная проверка — Task 8.)

- [ ] **Step 7: Commit**

```bash
git add web-game/index.html web-game/games/arena-bg.png web-game/games/arena-start-button.png
git commit -m "feat(web): экраны лобби арены и результата, ассеты; удалить #screen-arena"
```

---

## Task 6: Лобби арены (`arena-lobby.ts`) + проводка `main.ts`

**Files:**
- Create: `web-game/src/arena-lobby.ts`
- Modify: `web-game/src/main.ts`

**Interfaces:**
- Consumes: `arenaMonster`, `mobHp`, `mobTimerSec` (Task 1); `openArenaRatingModal` (Task 3); `App` из `main.ts`; DOM экранов (Task 5); `#screen-card` элементы.
- Produces:
  - `openArenaLobby(app: App): void` — показать лобби, отрисовать лучший результат.
  - `showArenaPreview(app: App): void` — превью первого моба на `#screen-card` с аренными обработчиками кнопок.
  - `App` расширен: `bestArena: number` и метод `goArenaBattle(): void` (реализуется в Task 7; в Task 6 объявляем в интерфейсе и оставляем заглушку до Task 7 — см. ниже).

- [ ] **Step 1: Создать `arena-lobby.ts`**

Создать `web-game/src/arena-lobby.ts`:

```ts
import {arenaMonster, mobHp, mobTimerSec} from '../../app/src/game/arena';
import {openArenaRatingModal} from './arena-screen';
import type {App} from './main';

/** Показать лобби арены: фон, кнопка старта, лучший результат. */
export function openArenaLobby(app: App): void {
  const best = document.getElementById('arena-best') as HTMLElement;
  if (app.bestArena > 0) {
    best.textContent = `Лучший результат: ${app.bestArena}`;
    best.style.display = '';
  } else {
    best.style.display = 'none';
  }
  app.show('screen-arena-lobby');
}

/** Превью первого моба забега на экране карточки (#screen-card) с аренными кнопками. */
export function showArenaPreview(app: App): void {
  const m = arenaMonster(1);
  const img = document.getElementById('card-img') as HTMLImageElement;
  const target = document.getElementById('card-target') as HTMLElement;
  const hp = document.getElementById('card-hp') as HTMLElement;
  const startBtn = document.getElementById('card-start-btn') as HTMLButtonElement;
  const backBtn = document.getElementById('card-back-btn') as HTMLButtonElement;
  const startSpan = startBtn.querySelector('span') as HTMLElement;
  const hint = document.getElementById('hint') as HTMLElement;

  img.src = `./games/${m.cardImage}`;
  hp.style.width = '100%';
  target.textContent = `АРЕНА · ${m.name}: ${mobHp(1)} HP · ${mobTimerSec(1)} сек`;
  startSpan.textContent = 'В бой';
  startBtn.style.display = '';
  hint.textContent = '';

  // Аренные обработчики (перекрывают кампанийные onclick — см. main.ts).
  startBtn.onclick = () => app.goArenaBattle();
  backBtn.onclick = () => openArenaLobby(app);

  app.show('screen-card');
}

/** Проводка кнопок лобби. Вызывается один раз при старте. */
export function initArenaLobby(app: App): void {
  document.getElementById('arena-lobby-back')!.addEventListener('click', () => app.show('screen-start'));
  document.getElementById('arena-lobby-rating')!.addEventListener('click', () => {
    void openArenaRatingModal(app.currentUid());
  });
  document.getElementById('arena-lobby-start')!.addEventListener('click', () => showArenaPreview(app));
  document.getElementById('arena-result-lobby')!.addEventListener('click', () => openArenaLobby(app));
  document.getElementById('arena-result-again')!.addEventListener('click', () => showArenaPreview(app));
}
```

- [ ] **Step 2: Обновить `main.ts` — типы экранов, App, card-кнопки на onclick, проводка**

В `web-game/src/main.ts` внести правки:

(a) Импорты: заменить строку `import {openArena, openArenaModal, closeArenaModal} from './arena-screen';` на:

```ts
import {openXpRatingModal, closeArenaModal} from './arena-screen';
import {loadBestArena, saveBestArena} from './storage';
import {openArenaLobby, showArenaPreview, initArenaLobby} from './arena-lobby';
```

(b) `ScreenId`: заменить союз-тип на:

```ts
export type ScreenId =
  | 'screen-auth'
  | 'screen-loading'
  | 'screen-start'
  | 'screen-map'
  | 'screen-card'
  | 'screen-workout'
  | 'screen-victory'
  | 'screen-arena-lobby'
  | 'screen-arena-result';
```

(c) `App` интерфейс: добавить поля/методы:

```ts
export interface App {
  progression: Progression;
  totalReps: number;
  bestArena: number;
  show(id: ScreenId): void;
  render(): void;
  goCard(): void;
  goWorkout(): void;
  goArenaBattle(): void;
  addRep(): void;
  persistProfile(): void;
  onDefeated(): void;
  currentUid(): string | null;
}
```

(d) Объект `app`: добавить `bestArena` в инициализацию (рядом с `totalReps: loadTotalReps()`):

```ts
  totalReps: loadTotalReps(),
  bestArena: loadBestArena(),
```

и добавить методы `currentUid` и временную заглушку `goArenaBattle` в объект `app` (в Task 7 заглушка заменяется на реальную реализацию):

```ts
  currentUid() {
    return currentUser ? currentUser.uid : null;
  },
  goArenaBattle() {
    // реализуется в Task 7 (arena-battle)
  },
```

(e) `persistProfile`: включить `bestArena` в `Profile`:

```ts
  persistProfile() {
    if (!currentUser) return;
    const profile: Profile = {
      progression: this.progression,
      totalReps: this.totalReps,
      bestArena: this.bestArena,
    };
    saveRemote(currentUser.uid, profile, currentUser.nickname).catch(showSyncWarning);
  },
```

(f) `goCard()`: после `renderCard(this)` привязать кампанийные onclick (перекрывают аренные), чтобы карточка всегда имела ровно один обработчик:

```ts
  goCard() {
    renderCard(this);
    const startBtn = document.getElementById('card-start-btn') as HTMLButtonElement;
    const backBtn = document.getElementById('card-back-btn') as HTMLButtonElement;
    const startSpan = startBtn.querySelector('span') as HTMLElement;
    startSpan.textContent = 'Начать тренировку';
    startBtn.onclick = () => this.goWorkout();
    backBtn.onclick = () => {
      this.render();
      this.show('screen-map');
    };
    this.show('screen-card');
  },
```

(g) Удалить старые card-кнопочные `addEventListener` (заменены на onclick в goCard/preview):

```ts
// УДАЛИТЬ эти строки:
document.getElementById('card-back-btn')!.addEventListener('click', () => {
  app.render();
  show('screen-map');
});
document.getElementById('card-start-btn')!.addEventListener('click', () => app.goWorkout());
```

(h) Меню «Arena» → лобби; удалить старую arena-проводку. Заменить блок:

```ts
// MAIN MENU: «Arena» -> рейтинг
document.getElementById('btn-arena')!.addEventListener('click', () => {
  void openArena(currentUser ? currentUser.uid : null);
});
document.getElementById('arena-back')!.addEventListener('click', () => show('screen-start'));
document.getElementById('loading-back')!.addEventListener('click', () => show('screen-start'));
```

на:

```ts
// MAIN MENU: «Arena» -> лобби арены
document.getElementById('btn-arena')!.addEventListener('click', () => openArenaLobby(app));
document.getElementById('loading-back')!.addEventListener('click', () => show('screen-start'));
initArenaLobby(app);
```

(i) Карта: `#map-rating` теперь зовёт `openXpRatingModal`. Заменить:

```ts
document.getElementById('map-rating')!.addEventListener('click', () => {
  void openArenaModal(currentUser ? currentUser.uid : null);
});
```

на:

```ts
document.getElementById('map-rating')!.addEventListener('click', () => {
  void openXpRatingModal(currentUser ? currentUser.uid : null);
});
```

(j) `onUser`: включить `bestArena` в локальный профиль, merge и применение. Заменить создание `local` и присвоение после merge:

```ts
  const local: Profile = {
    progression: loadProgression(),
    totalReps: loadTotalReps(),
    bestArena: loadBestArena(),
  };
```

и после `const merged = ...` добавить/дополнить:

```ts
  app.progression = merged.progression;
  app.totalReps = merged.totalReps;
  app.bestArena = merged.bestArena;
  saveProgression(merged.progression);
  saveTotalReps(merged.totalReps);
  saveBestArena(merged.bestArena);
  saveRemote(user.uid, merged, user.nickname).catch(showSyncWarning);
```

- [ ] **Step 3: tsc — без новых реальных ошибок**

Run: `app/node_modules/.bin/tsc -p web-game/tsconfig.json 2>&1 | grep "error TS" | grep -vE "node:test|node:assert|allowImportingTsExtensions|gstatic.com|implicitly has an 'any'"`
Expected: пусто (структурный шум может остаться).

- [ ] **Step 4: Commit**

```bash
git add web-game/src/arena-lobby.ts web-game/src/main.ts
git commit -m "feat(web): лобби арены + превью первого моба; проводка меню/карточки"
```

---

## Task 7: Бой арены (`arena-battle.ts`) + результат + сохранение

**Files:**
- Create: `web-game/src/arena-battle.ts`
- Modify: `web-game/src/main.ts` (реализовать `goArenaBattle`)

**Interfaces:**
- Consumes: `ARENA_CONFIG`, `arenaMonster`, `mobHp`, `mobTimerSec`, `newRun`, `onRep`, `onRestDone`, `onTimeout`, `ArenaState` (Task 1); `ensureDetector` из `pose-model.ts`; `startBattleCamera`, `BattleCamera` (Task 4); `saveBestArena` (Task 2); `App`; DOM `#screen-workout`/`#screen-loading`/`#screen-arena-result`.
- Produces: `startArenaFlow(app: App): void` — экран загрузки → бой арены.

- [ ] **Step 1: Создать `arena-battle.ts`**

Создать `web-game/src/arena-battle.ts`:

```ts
import {
  ARENA_CONFIG,
  ArenaState,
  arenaMonster,
  mobHp,
  mobTimerSec,
  newRun,
  onRep,
  onRestDone,
  onTimeout,
} from '../../app/src/game/arena';
import {ensureDetector} from './pose-model';
import {startBattleCamera, BattleCamera} from './battle-camera';
import {saveBestArena} from './storage';
import type {App} from './main';

/** Экран загрузки модели → бой арены на #screen-workout. */
export function startArenaFlow(app: App): void {
  app.show('screen-loading');
  const loadingBack = document.getElementById('loading-back') as HTMLElement;
  const loadingText = document.getElementById('loading-text') as HTMLElement;
  loadingBack.style.display = 'none';
  loadingText.textContent = 'Загрузка арены…';
  ensureDetector().then(
    detector => {
      if (!document.getElementById('screen-loading')!.classList.contains('active')) return;
      app.show('screen-workout');
      runArena(app, detector);
    },
    () => {
      loadingText.textContent = 'Не удалось загрузить модель';
      loadingBack.style.display = 'inline-block';
    },
  );
}

function runArena(app: App, detector: any): void {
  const video = document.getElementById('wk-video') as HTMLVideoElement;
  const canvas = document.getElementById('wk-overlay') as HTMLCanvasElement;
  const counterEl = document.getElementById('wk-counter')!;
  const setEl = document.getElementById('wk-set')!;
  const hpEl = document.getElementById('wk-hp') as HTMLElement;
  const restEl = document.getElementById('wk-rest') as HTMLElement;
  const statusEl = document.getElementById('wk-status')!;
  const backBtn = document.getElementById('wk-back') as HTMLButtonElement;
  const monsterImg = document.getElementById('wk-monster') as HTMLImageElement;
  const monsterName = document.getElementById('wk-monster-name') as HTMLElement;
  const hpTextEl = document.getElementById('wk-hp-text')!;
  const timeEl = document.getElementById('wk-time')!;

  const hitSound = new Audio('./games/hit.mp3');
  hitSound.volume = 0.6;

  let state: ArenaState = newRun();
  let camera: BattleCamera | null = null;
  let secLeft = mobTimerSec(state.mobIndex);
  let mobTimerId = 0;
  let ended = false;

  const fmtTime = (s: number): string =>
    `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  function renderMobHud() {
    const m = arenaMonster(state.mobIndex);
    monsterImg.src = `./games/${m.cardImage}`;
    monsterName.textContent = m.name;
    const maxHp = mobHp(state.mobIndex);
    hpEl.style.width = `${(state.hpLeft / maxHp) * 100}%`;
    hpTextEl.textContent = `${state.hpLeft} / ${maxHp} HP`;
    counterEl.textContent = String(maxHp - state.hpLeft); // отжато по текущему мобу
    setEl.textContent = `Убито: ${state.kills}`;
  }

  function renderTimer() {
    timeEl.textContent = fmtTime(Math.max(0, secLeft));
    timeEl.style.color = secLeft <= 10 ? '#ff6a56' : '#fff';
  }

  function startMobTimer() {
    secLeft = mobTimerSec(state.mobIndex);
    renderTimer();
    window.clearInterval(mobTimerId);
    mobTimerId = window.setInterval(() => {
      secLeft -= 1;
      renderTimer();
      if (secLeft <= 0) {
        window.clearInterval(mobTimerId);
        state = onTimeout(state);
        endRun();
      }
    }, 1000);
  }

  function startRest() {
    if (camera) camera.setPaused(true);
    window.clearInterval(mobTimerId);
    let left = ARENA_CONFIG.restSec;
    restEl.style.display = 'flex';
    const finishRest = () => {
      restEl.style.display = 'none';
      state = onRestDone(state);
      renderMobHud();
      if (camera) camera.setPaused(false);
      startMobTimer();
    };
    restEl.onclick = finishRest;
    const tick = () => {
      if (restEl.style.display === 'none') return; // пропущено тапом
      if (left <= 0) {
        finishRest();
        return;
      }
      restEl.textContent = `Отдых: ${left} с (нажми, чтобы продолжить)`;
      left -= 1;
      setTimeout(tick, 1000);
    };
    tick();
  }

  function handleRep() {
    if (ended || state.phase !== 'fighting') return;
    try {
      hitSound.currentTime = 0;
      hitSound.play().catch(() => {});
    } catch {
      // звук не критичен
    }
    const res = onRep(state);
    state = res.state;
    app.addRep();
    renderMobHud();
    if (res.event === 'mobKilled') {
      startRest();
    }
  }

  function endRun() {
    if (ended) return;
    ended = true;
    window.clearInterval(mobTimerId);
    if (camera) camera.stop();
    const kills = state.kills;
    const isRecord = kills > app.bestArena;
    if (isRecord) {
      app.bestArena = kills;
      saveBestArena(kills);
    }
    app.persistProfile(); // XP + bestArena в облако
    (document.getElementById('arena-result-kills') as HTMLElement).textContent =
      `Убито мобов: ${kills}`;
    (document.getElementById('arena-result-record') as HTMLElement).textContent = isRecord
      ? 'Новый рекорд!'
      : `Рекорд: ${app.bestArena}`;
    app.show('screen-arena-result');
  }

  backBtn.onclick = () => endRun();

  renderMobHud();
  startMobTimer();
  startBattleCamera(video, canvas, detector, handleRep, text => {
    statusEl.textContent = text;
  }).then(
    cam => {
      camera = cam;
      if (ended) cam.stop(); // выход/таймаут во время загрузки камеры
    },
    err => {
      statusEl.textContent = 'Ошибка: ' + (err?.message ?? String(err));
      // eslint-disable-next-line no-console
      console.error(err);
    },
  );
}
```

- [ ] **Step 2: Подключить `goArenaBattle` в `main.ts`**

В `web-game/src/main.ts`:

(a) Добавить импорт рядом с другими:

```ts
import {startArenaFlow} from './arena-battle';
```

(b) Заменить заглушку `goArenaBattle` в объекте `app` на:

```ts
  goArenaBattle() {
    startArenaFlow(this);
  },
```

- [ ] **Step 3: tsc — без новых реальных ошибок**

Run: `app/node_modules/.bin/tsc -p web-game/tsconfig.json 2>&1 | grep "error TS" | grep -vE "node:test|node:assert|allowImportingTsExtensions|gstatic.com|implicitly has an 'any'"`
Expected: пусто.

- [ ] **Step 4: Commit**

```bash
git add web-game/src/arena-battle.ts web-game/src/main.ts
git commit -m "feat(web): бой арены (таймер/отдых/смена мобов), экран результата, сохранение bestArena"
```

---

## Task 8: Сборка бандла + сквозная проверка (E2E)

**Files:**
- Modify: `web-game/app.js` (пересборка)

- [ ] **Step 1: Пересобрать бандл**

Run (из корня): `npx --yes esbuild web-game/src/main.ts --bundle --format=esm --outfile=web-game/app.js --external:'https://*'`
Expected: `web-game/app.js` собран без ошибок, размер ~50KB.

- [ ] **Step 2: Прогнать все тесты**

Run: `cd app && npx jest`
Expected: PASS (44 + 10 арена = 54+).

Run (из корня): `node --test web-game/src/sync.test.ts web-game/src/nickname.test.ts`
Expected: `pass` без `fail` (было 10, +1 = 11+).

- [ ] **Step 3: E2E — арена (playwright, мобильный вьюпорт 390×780, localhost)**

Поднять сервер `cd web-game && python3 -m http.server 8099`, открыть в браузере. Сценарий (форсить экраны через `document.getElementById(...).classList` при отсутствии реального логина; клики — по реальным кнопкам):
1. Главное меню → клик `#btn-arena` → показан `#screen-arena-lobby` (фон-колизей, кнопка «Let's do it», кнопки в углах).
2. Клик `#arena-lobby-rating` → модалка `#arena-modal` с заголовком «Рейтинг арены».
3. Клик `#arena-lobby-start` → `#screen-card` с текстом «АРЕНА · … · 5 HP · 60 сек», кнопка «В бой».
4. (Камера требует доступа; при headless можно проверить переход `#screen-loading` и корректность HUD-заготовки, либо предоставить фейковый детектор через `evaluate`.) Проверить, что `#screen-arena-result` показывается при вызове `endRun` (через кнопку ✕ или таймаут — можно проэмулировать, вызвав клик по `#wk-back`).
5. На `#screen-arena-result` — «Убито мобов: N», кнопки «Ещё раз» / «В лобби» работают.
6. **Кампания не сломана:** «Кампания» → карта → карточка → «Начать тренировку» → `#screen-loading` → бой; отдых между сетами босса и победа работают (проверить хотя бы переход и HUD).

Зафиксировать скриншоты лобби и результата. Прибрать за собой (остановить сервер, удалить скриншоты вне репо).

- [ ] **Step 4: Финальный tsc-гейт**

Run: `app/node_modules/.bin/tsc -p web-game/tsconfig.json 2>&1 | grep "error TS" | grep -vE "node:test|node:assert|allowImportingTsExtensions|gstatic.com|implicitly has an 'any'"`
Expected: пусто.

- [ ] **Step 5: Commit + push + PR**

```bash
git add web-game/app.js
git commit -m "build(web): пересборка app.js — режим Арена"
git push -u origin web-arena
```

Открыть PR `web-arena` → `main` (база — main; PR #11 вольётся раньше или следом). В описании — сводка фич арены и проверок.

---

## Self-Review

**Spec coverage:**
- Лобби (фон, «Let's do it», лучший результат, назад, рейтинг) → Task 5 (разметка/стили) + Task 6 (проводка). ✓
- Превью первого моба → Task 6 (`showArenaPreview`). ✓
- Бой: таймер на моба, HP растёт, `timer=max(60, HP·4)` → Task 1 (формулы) + Task 7 (цикл). ✓
- Убийство → отдых 30с (тап-пропуск) → следующий моб без превью → Task 7. ✓
- Таймаут = конец забега; ✕ = конец с фиксацией → Task 7 (`onTimeout`/`endRun`/`backBtn`). ✓
- `bestArena` в localStorage+Firestore, merge max → Task 2. ✓
- Арена-рейтинг (топ-50 по bestArena, модалка) → Task 2 (`loadArenaLeaderboard`) + Task 3 (`openArenaRatingModal`). ✓
- XP-рейтинг остаётся на карте; `#screen-arena` удалён → Task 3 (`openXpRatingModal`) + Task 5/6 (удаление). ✓
- Мобы кампании по кругу → Task 1 (`arenaMonster`). ✓
- Извлечение общего цикла камеры → Task 4. ✓
- XP растёт на арене (нет дневного лимита) → Task 7 (`app.addRep`, `persistProfile`; dailyLock не задействован). ✓

**Placeholder scan:** заглушка `goArenaBattle` в Task 6 — намеренная, заменяется в Task 7 (явно указано). Прочих плейсхолдеров нет.

**Type consistency:** `Profile.bestArena` (Task 2) используется в `main.ts` (Task 6) и `arena-battle` (Task 7) единообразно; `ArenaState`/`onRep`/`onRestDone`/`onTimeout` сигнатуры совпадают между Task 1 и Task 7; `startBattleCamera(video,canvas,detector,onRep,onStatus)` одинаков в Task 4/7; `openXpRatingModal`/`openArenaRatingModal`/`closeArenaModal` (Task 3) совпадают с импортами в `main.ts` (Task 6). `currentUid()` добавлен в App (Task 6) и используется в `arena-lobby` (Task 6). ✓
