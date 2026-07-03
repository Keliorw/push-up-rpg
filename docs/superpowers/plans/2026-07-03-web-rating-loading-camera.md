# Rating (Arena) + Level-Loading (MoveNet preload) + Camera Size — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Добавить в `web-game` таблицу рейтинга на Арене (локация + XP), экран загрузки уровня с предзагрузкой/кэшем MoveNet, и камеру боя на всю высоту (≤600px по ширине).

**Architecture:** Статический сайт на GitHub Pages, Firebase (Auth + Firestore) уже подключён. XP (`totalReps`) хранится в `users/{uid}` и localStorage, объединяется по `max`. Рейтинг — запрос top-50 по `defeatedCount` + клиентская до-сортировка. MoveNet-детектор кэшируется на уровне модуля и предзагружается в фоне после входа; отдельный экран загрузки ждёт готовности модели до включения камеры.

**Tech Stack:** TypeScript, esbuild (bundle, без `npm install`), Firebase JS SDK v12.15.0 (CDN, external), TF.js + pose-detection (глобалы из CDN `<script>`), Node встроенный тест-раннер.

## Global Constraints

- Сборка: `npx --yes esbuild web-game/src/main.ts --bundle --format=esm --outfile=web-game/app.js --external:'https://*'` (без `npm install`).
- Firebase CDN-модули: версия **12.15.0**, как в существующих `firebase.ts`/`auth.ts`/`remote-storage.ts`.
- Правила Firestore **не меняем**: чтение публичное; `totalReps` в create/update не валидируется.
- `Progression` (`app/src/game/progression.ts`) — общий тип с RN-приложением: `{ defeatedCount: number; lastWorkoutDate: string | null }`. **Не менять.** `totalReps` — веб-поле.
- Firestore-документ `users/{uid}` = `{ nickname, defeatedCount, lastWorkoutDate, totalReps, updatedAt }`.
- Слияние: `defeatedCount = max`, `lastWorkoutDate` = свежайшая, `totalReps = max`.
- Юнит-тесты чистых модулей: `node --test web-game/src/<file>.test.ts` из корня репо (Node ≥22.18 стрипает типы; фолбэк — `npx --yes tsx --test …`).
- Рейтинг: топ-50, сортировка по локации (`defeatedCount`), при равенстве — по `totalReps`; текущий игрок подсвечен.
- Камера: `height: 100dvh`, `width: min(100vw, 600px)`.
- Ветка: `web-rating-loading-camera`. Частые коммиты.

---

## Task 1: Камера боя — на всю высоту, ≤600px по ширине

**Files:**
- Modify: `web-game/index.html` (CSS `#screen-workout`, `#wk-stage`)

- [ ] **Step 1: Заменить CSS `#screen-workout` (полноэкранный слой) и `#wk-stage`**

Найти (строка ~106–108):
```css
      #screen-workout { position: relative; }
      /* Вертикальный (портретный) кадр: ландшафтная вебкамера обрезается по центру. */
      #wk-stage { position: relative; transform: scaleX(-1); width: 100%; aspect-ratio: 3 / 4; overflow: hidden; background: #000; }
```
Заменить на:
```css
      #screen-workout.active { position: fixed; inset: 0; z-index: 10; background: #000;
        display: flex; align-items: center; justify-content: center; }
      /* Камера: на всю высоту экрана, не шире 600px, по центру. */
      #wk-stage { position: relative; transform: scaleX(-1); width: min(100vw, 600px); height: 100dvh;
        margin: 0 auto; overflow: hidden; background: #000; }
```
(ID-специфичность `#screen-workout.active` = 1-1-0 перебивает `.screen.active` = 0-2-0, а вне активности `.screen{display:none}` прячет экран.)

- [ ] **Step 2: Пересобрать и проверить визуально**

Run (из корня): `npx --yes esbuild web-game/src/main.ts --bundle --format=esm --outfile=web-game/app.js --external:'https://*'`
Затем `python3 -m http.server 8092 --directory web-game`, открыть на узкой (390px) и широкой (1200px) ширине: камера боя занимает всю высоту, по ширине не превышает 600px и центрирована. (Логин: см. существующий поток; дойти до боя через Кампанию → узел → «Начать тренировку».)

- [ ] **Step 3: Commit**
```bash
git add web-game/index.html web-game/app.js
git commit -m "feat(web): камера боя на всю высоту, max 600px по ширине"
```

---

## Task 2: `sync.ts` — Profile + mergeProfile

**Files:**
- Modify: `web-game/src/sync.ts`
- Test: `web-game/src/sync.test.ts` (дополнить)

**Interfaces:**
- Produces: `interface Profile { progression: Progression; totalReps: number }`, `mergeProfile(a: Profile, b: Profile): Profile`. `mergeProgress` остаётся.

- [ ] **Step 1: Дополнить тест** — добавить в конец `web-game/src/sync.test.ts`:
```ts
import {mergeProfile} from './sync.ts';

test('mergeProfile: прогресс и XP не откатываются', () => {
  assert.deepEqual(
    mergeProfile(
      {progression: {defeatedCount: 3, lastWorkoutDate: '2026-07-01'}, totalReps: 120},
      {progression: {defeatedCount: 5, lastWorkoutDate: '2026-06-30'}, totalReps: 90},
    ),
    {progression: {defeatedCount: 5, lastWorkoutDate: '2026-07-01'}, totalReps: 120},
  );
});
```

- [ ] **Step 2: Запустить — падает**

Run: `node --test web-game/src/sync.test.ts`
Expected: FAIL (`mergeProfile` не экспортирован).

- [ ] **Step 3: Реализация** — добавить в конец `web-game/src/sync.ts`:
```ts
export interface Profile {
  progression: Progression;
  totalReps: number;
}

/** Объединяет полный профиль (прогресс + XP), ничего не откатывая. */
export function mergeProfile(a: Profile, b: Profile): Profile {
  return {
    progression: mergeProgress(a.progression, b.progression),
    totalReps: Math.max(a.totalReps, b.totalReps),
  };
}
```

- [ ] **Step 4: Запустить — проходит**

Run: `node --test web-game/src/sync.test.ts`
Expected: PASS (5 тестов).

- [ ] **Step 5: Commit**
```bash
git add web-game/src/sync.ts web-game/src/sync.test.ts
git commit -m "feat(web): Profile + mergeProfile (XP = max)"
```

---

## Task 3: `levels.ts` — локация из defeatedCount

**Files:**
- Create: `web-game/src/levels.ts`
- Test: `web-game/src/levels.test.ts`

**Interfaces:**
- Consumes: `MONSTER_SEQUENCE`, `LOCATIONS` из `app/src/game/monsters`.
- Produces: `locationLabel(defeatedCount: number): { index: number | null; name: string }`.

- [ ] **Step 1: Написать тест** `web-game/src/levels.test.ts`:
```ts
import test from 'node:test';
import assert from 'node:assert/strict';
import {locationLabel} from './levels.ts';

test('начало кампании → локация 1', () => {
  assert.equal(locationLabel(0).index, 1);
});
test('4-й монстр (босс loc1) всё ещё локация 1', () => {
  assert.equal(locationLabel(3).index, 1);
});
test('5-й монстр → локация 2', () => {
  assert.equal(locationLabel(4).index, 2);
});
test('последний монстр → локация 10', () => {
  assert.equal(locationLabel(39).index, 10);
});
test('кампания пройдена → index null', () => {
  const r = locationLabel(40);
  assert.equal(r.index, null);
  assert.equal(r.name, 'Кампания пройдена');
});
test('name непустой для валидной локации', () => {
  assert.ok(locationLabel(0).name.length > 0);
});
```

- [ ] **Step 2: Запустить — падает**

Run: `node --test web-game/src/levels.test.ts`
Expected: FAIL (`./levels.ts` не найден).

- [ ] **Step 3: Реализация** `web-game/src/levels.ts`:
```ts
import {LOCATIONS, MONSTER_SEQUENCE} from '../../app/src/game/monsters';

/**
 * По числу побеждённых монстров возвращает локацию текущего (следующего) монстра.
 * Если кампания пройдена — index null.
 */
export function locationLabel(defeatedCount: number): {index: number | null; name: string} {
  const m = MONSTER_SEQUENCE[defeatedCount];
  if (!m) return {index: null, name: 'Кампания пройдена'};
  const match = /^loc(\d+)-/.exec(m.id);
  const index = match ? Number(match[1]) : null;
  const loc = index != null ? LOCATIONS.find(l => l.index === index) : undefined;
  return {index, name: loc ? loc.name : `Локация ${index ?? '?'}`};
}
```

- [ ] **Step 4: Запустить — проходит**

Run: `node --test web-game/src/levels.test.ts`
Expected: PASS (6 тестов).

- [ ] **Step 5: Commit**
```bash
git add web-game/src/levels.ts web-game/src/levels.test.ts
git commit -m "feat(web): locationLabel — локация из defeatedCount"
```

---

## Task 4: Хранилище XP + профиль в Firestore + рейтинг-запрос

**Files:**
- Modify: `web-game/src/storage.ts` (добавить totalReps)
- Modify: `web-game/src/remote-storage.ts` (Profile load/save + loadLeaderboard)

**Interfaces:**
- Consumes: `Profile` из `./sync`.
- Produces:
  - storage: `loadTotalReps(): number`, `saveTotalReps(n: number): void`
  - remote: `loadRemote(uid: string): Promise<Profile | null>`, `saveRemote(uid: string, profile: Profile, nickname: string): Promise<void>`, `loadLeaderboard(max: number): Promise<LeaderRow[]>`, `interface LeaderRow { uid: string; nickname: string; defeatedCount: number; totalReps: number }`

> Firebase-модули проверяются E2E в Task 9.

- [ ] **Step 1: storage.ts — добавить totalReps.** В конец `web-game/src/storage.ts` добавить:
```ts
const XP_KEY = 'pushuprpg.totalReps';

export function loadTotalReps(): number {
  const raw = localStorage.getItem(XP_KEY);
  const n = raw != null ? Number(raw) : 0;
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0;
}

export function saveTotalReps(n: number): void {
  localStorage.setItem(XP_KEY, String(Math.max(0, Math.floor(n))));
}
```

- [ ] **Step 2: remote-storage.ts — заменить на профиль + рейтинг.** Полностью заменить содержимое `web-game/src/remote-storage.ts` на:
```ts
import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
  collection,
  query,
  orderBy,
  limit,
  getDocs,
} from 'https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js';
import {db} from './firebase';
import type {Profile} from './sync';

export interface LeaderRow {
  uid: string;
  nickname: string;
  defeatedCount: number;
  totalReps: number;
}

export async function loadRemote(uid: string): Promise<Profile | null> {
  const snap = await getDoc(doc(db, 'users', uid));
  if (!snap.exists()) return null;
  const d = snap.data();
  return {
    progression: {
      defeatedCount: typeof d.defeatedCount === 'number' ? d.defeatedCount : 0,
      lastWorkoutDate: typeof d.lastWorkoutDate === 'string' ? d.lastWorkoutDate : null,
    },
    totalReps: typeof d.totalReps === 'number' ? d.totalReps : 0,
  };
}

export async function saveRemote(uid: string, profile: Profile, nickname: string): Promise<void> {
  await setDoc(
    doc(db, 'users', uid),
    {
      nickname,
      defeatedCount: profile.progression.defeatedCount,
      lastWorkoutDate: profile.progression.lastWorkoutDate,
      totalReps: profile.totalReps,
      updatedAt: serverTimestamp(),
    },
    {merge: true},
  );
}

/** Топ игроков по прогрессу кампании; до-сортировку по XP делает вызывающий. */
export async function loadLeaderboard(max: number): Promise<LeaderRow[]> {
  const q = query(collection(db, 'users'), orderBy('defeatedCount', 'desc'), limit(max));
  const snap = await getDocs(q);
  const rows: LeaderRow[] = [];
  snap.forEach(docSnap => {
    const d = docSnap.data();
    rows.push({
      uid: docSnap.id,
      nickname: typeof d.nickname === 'string' && d.nickname ? d.nickname : '—',
      defeatedCount: typeof d.defeatedCount === 'number' ? d.defeatedCount : 0,
      totalReps: typeof d.totalReps === 'number' ? d.totalReps : 0,
    });
  });
  return rows;
}
```

- [ ] **Step 3: Проверка компиляции сборкой** (call sites main.ts обновятся в Task 5 — до этого сборка может ругаться на использование старой сигнатуры `saveRemote`; это ожидаемо, зафиксируется в Task 5). Здесь просто коммитим модуль.

- [ ] **Step 4: Commit**
```bash
git add web-game/src/storage.ts web-game/src/remote-storage.ts
git commit -m "feat(web): хранение XP (totalReps) локально и в Firestore + loadLeaderboard"
```

---

## Task 5: Подсчёт XP и профиль в main.ts / workout-screen.ts

**Files:**
- Modify: `web-game/src/main.ts`
- Modify: `web-game/src/workout-screen.ts`

**Interfaces:**
- App получает: `totalReps: number`, `addRep(): void`.
- Consumes: `loadTotalReps/saveTotalReps` (`./storage`), `mergeProfile`, `Profile` (`./sync`), обновлённые `loadRemote/saveRemote` (`./remote-storage`).

- [ ] **Step 1: main.ts — обновить импорты.** Заменить строки 12–13:
```ts
import {loadRemote, saveRemote} from './remote-storage';
import {mergeProgress} from './sync';
```
на:
```ts
import {loadRemote, saveRemote} from './remote-storage';
import {mergeProfile, Profile} from './sync';
import {loadTotalReps, saveTotalReps} from './storage';
```
(`loadProgression, saveProgression` уже импортированы строкой 7.)

- [ ] **Step 2: main.ts — расширить App.** Заменить интерфейс `App` (строки 24–31):
```ts
export interface App {
  progression: Progression;
  show(id: ScreenId): void;
  render(): void;
  goCard(): void;
  goWorkout(): void;
  onDefeated(): void; // called by the workout screen on monster defeat
}
```
на:
```ts
export interface App {
  progression: Progression;
  totalReps: number;
  show(id: ScreenId): void;
  render(): void;
  goCard(): void;
  goWorkout(): void;
  addRep(): void; // +1 XP за отжимание (локально)
  onDefeated(): void; // called by the workout screen on monster defeat
}
```

- [ ] **Step 3: main.ts — реализовать поля/методы в объекте app.** Заменить объект `app` (строки 74–102) на:
```ts
const app: App = {
  progression: loadProgression(),
  totalReps: loadTotalReps(),
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
  addRep() {
    this.totalReps += 1;
    saveTotalReps(this.totalReps);
  },
  onDefeated() {
    const m = currentMonster(this.progression);
    this.progression = defeatMonster(this.progression, todayISO());
    saveProgression(this.progression);
    if (currentUser) {
      const profile: Profile = {progression: this.progression, totalReps: this.totalReps};
      saveRemote(currentUser.uid, profile, currentUser.nickname).catch(showSyncWarning);
    }
    (document.getElementById('victory-name') as HTMLElement).textContent = m ? m.name : '';
    const next = currentMonster(this.progression);
    (document.getElementById('victory-next') as HTMLElement).style.display = next ? '' : 'none';
    show('screen-victory');
    playVictory();
  },
};
```
(`goWorkout` здесь оставляем как есть — экран загрузки добавит Task 8.)

- [ ] **Step 4: main.ts — обновить bootstrap на профиль.** Заменить тело обработчика `onUser` (строки 191–203, от `const local = loadProgression();` до `show('screen-start');`) на:
```ts
  const local: Profile = {progression: loadProgression(), totalReps: loadTotalReps()};
  let remote: Profile | null = null;
  try {
    remote = await loadRemote(user.uid);
  } catch {
    showSyncWarning();
  }
  const merged = remote ? mergeProfile(local, remote) : local;
  app.progression = merged.progression;
  app.totalReps = merged.totalReps;
  saveProgression(merged.progression);
  saveTotalReps(merged.totalReps);
  saveRemote(user.uid, merged, user.nickname).catch(showSyncWarning);
  showAccountChip(user.nickname);
  show('screen-start');
```

- [ ] **Step 5: workout-screen.ts — считать XP.** В функции `handleRep` (после `updateHud();`, строка ~137) добавить первой строкой тела (сразу после `const res = onRep(...)`/`updateHud()` — вставить `app.addRep();` перед проверкой `res.event`):

Найти:
```ts
    const res = onRep(wk, monster);
    wk = res.state;
    updateHud();
    if (res.event === 'monsterDefeated') {
```
Заменить на:
```ts
    const res = onRep(wk, monster);
    wk = res.state;
    app.addRep();
    updateHud();
    if (res.event === 'monsterDefeated') {
```

- [ ] **Step 6: Сборка + юнит-регресс**

Run:
```bash
npx --yes esbuild web-game/src/main.ts --bundle --format=esm --outfile=web-game/app.js --external:'https://*'
node --test web-game/src/sync.test.ts web-game/src/levels.test.ts web-game/src/nickname.test.ts
```
Expected: сборка без ошибок; тесты PASS.

- [ ] **Step 7: Commit**
```bash
git add web-game/src/main.ts web-game/src/workout-screen.ts web-game/app.js
git commit -m "feat(web): подсчёт XP (totalReps) и синхрон профиля в Firestore"
```

---

## Task 6: Экран Арены (таблица рейтинга)

**Files:**
- Modify: `web-game/index.html` (секция `#screen-arena` + стили; тип экрана уже добавим в main)
- Create: `web-game/src/arena-screen.ts`
- Modify: `web-game/src/main.ts` (тип ScreenId, импорт, обработчик `btn-arena`, кнопка «назад»)

**Interfaces:**
- Consumes: `loadLeaderboard`, `LeaderRow` (`./remote-storage`); `locationLabel` (`./levels`).
- Produces: `openArena(currentUid: string | null): Promise<void>` (грузит, рендерит, показывает экран).

- [ ] **Step 1: index.html — добавить экран Арены.** Перед `<section id="screen-victory"` (строка ~264) вставить:
```html
      <section id="screen-arena" class="screen">
        <div id="arena-box">
          <button id="arena-back" class="link-btn">← В меню</button>
          <h1>Рейтинг</h1>
          <div id="arena-list">Загрузка…</div>
        </div>
      </section>
```

- [ ] **Step 2: index.html — стили Арены.** Перед `</style>` (после блока ACCOUNT CHIP) вставить:
```css
      /* ARENA */
      #screen-arena { min-height: 100vh; background: #101828; }
      #arena-box { max-width: 480px; margin: 0 auto; padding: 16px; }
      #arena-box h1 { color: #F5A623; text-align: center; font-size: 26px; margin: 8px 0 16px; }
      .arena-row { display: grid; grid-template-columns: 32px 1fr auto; gap: 10px; align-items: center;
        padding: 10px 12px; border-bottom: 1px solid #24314a; font-size: 14px; }
      .arena-row .rank { color: #9aa4b2; font-weight: 800; text-align: right; }
      .arena-row .who { display: flex; flex-direction: column; }
      .arena-row .who b { color: #fff; }
      .arena-row .who span { color: #9aa4b2; font-size: 12px; }
      .arena-row .xp { color: #F5A623; font-weight: 800; white-space: nowrap; }
      .arena-row.me { background: rgba(245,166,35,.14); border-radius: 8px; }
      #arena-empty { color: #9aa4b2; text-align: center; padding: 24px; }
```

- [ ] **Step 3: Создать `web-game/src/arena-screen.ts`:**
```ts
import {loadLeaderboard, LeaderRow} from './remote-storage';
import {locationLabel} from './levels';

function esc(s: string): string {
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

function rowHtml(row: LeaderRow, rank: number, isMe: boolean): string {
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

/** Грузит топ-50, до-сортировывает по XP, рендерит и показывает экран Арены. */
export async function openArena(currentUid: string | null): Promise<void> {
  const list = document.getElementById('arena-list')!;
  list.textContent = 'Загрузка…';
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById('screen-arena')!.classList.add('active');
  try {
    const rows = await loadLeaderboard(50);
    rows.sort((a, b) => b.defeatedCount - a.defeatedCount || b.totalReps - a.totalReps);
    if (rows.length === 0) {
      list.innerHTML = '<div id="arena-empty">Пока никто не играл</div>';
      return;
    }
    list.innerHTML = rows
      .map((r, i) => rowHtml(r, i + 1, r.uid === currentUid))
      .join('');
  } catch {
    list.innerHTML = '<div id="arena-empty">Не удалось загрузить рейтинг</div>';
  }
}
```

- [ ] **Step 4: main.ts — тип экрана + импорт + текущий uid.** В `ScreenId` (строки 16–22) добавить `'screen-arena'` и `'screen-loading'` (последний понадобится в Task 8):
```ts
export type ScreenId =
  | 'screen-auth'
  | 'screen-loading'
  | 'screen-arena'
  | 'screen-start'
  | 'screen-map'
  | 'screen-card'
  | 'screen-workout'
  | 'screen-victory';
```
После строки импорта `import {initAuthScreen, revealAuthForm} from './auth-screen';` добавить:
```ts
import {openArena} from './arena-screen';
```

- [ ] **Step 5: main.ts — подключить кнопку Арены и «назад».** После обработчика `btn-campaign` (после строки 108 `});`) добавить:
```ts
// MAIN MENU: «Arena» -> рейтинг
document.getElementById('btn-arena')!.addEventListener('click', () => {
  void openArena(currentUser ? currentUser.uid : null);
});
document.getElementById('arena-back')!.addEventListener('click', () => show('screen-start'));
```

- [ ] **Step 6: Сборка**

Run: `npx --yes esbuild web-game/src/main.ts --bundle --format=esm --outfile=web-game/app.js --external:'https://*'`
Expected: без ошибок.

- [ ] **Step 7: Commit**
```bash
git add web-game/index.html web-game/src/arena-screen.ts web-game/src/main.ts web-game/app.js
git commit -m "feat(web): экран рейтинга на Арене (локация + XP, подсветка себя)"
```

---

## Task 7: `pose-model.ts` — кэш и предзагрузка MoveNet

**Files:**
- Create: `web-game/src/pose-model.ts`

**Interfaces:**
- Produces: `ensureDetector(): Promise<any>` — инициализирует tf-бэкенд и создаёт MoveNet один раз; повторные вызовы возвращают тот же промис/экземпляр.

> Проверяется E2E в Task 9 (нужен браузер + TF.js).

- [ ] **Step 1: Создать `web-game/src/pose-model.ts`:**
```ts
declare const tf: any;
declare const poseDetection: any;

let detectorPromise: Promise<any> | null = null;

/**
 * Возвращает MoveNet-детектор, создавая его один раз. Промис кэшируется, поэтому
 * параллельные и повторные вызовы переиспользуют одну модель (и одну загрузку).
 */
export function ensureDetector(): Promise<any> {
  if (!detectorPromise) {
    detectorPromise = (async () => {
      await tf.setBackend('webgl');
      await tf.ready();
      return poseDetection.createDetector(poseDetection.SupportedModels.MoveNet, {
        modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING,
      });
    })().catch(err => {
      detectorPromise = null; // разрешить повтор после ошибки
      throw err;
    });
  }
  return detectorPromise;
}
```

- [ ] **Step 2: Сборка**

Run: `npx --yes esbuild web-game/src/main.ts --bundle --format=esm --outfile=web-game/app.js --external:'https://*'`
Expected: без ошибок (модуль ещё не используется — это нормально).

- [ ] **Step 3: Commit**
```bash
git add web-game/src/pose-model.ts web-game/app.js
git commit -m "feat(web): ensureDetector — кэш и однократная загрузка MoveNet"
```

---

## Task 8: Экран загрузки уровня + рефактор старта боя + фоновая предзагрузка

**Files:**
- Modify: `web-game/index.html` (секция `#screen-loading` + стили)
- Modify: `web-game/src/workout-screen.ts` (принимать готовый детектор)
- Modify: `web-game/src/main.ts` (goWorkout через загрузку, фоновая предзагрузка)

**Interfaces:**
- `startWorkout(app: App, detector: any): void` (сигнатура меняется — добавлен `detector`).
- Consumes: `ensureDetector` (`./pose-model`).

- [ ] **Step 1: index.html — экран загрузки.** Перед `<section id="screen-start"` (строка ~196) вставить:
```html
      <section id="screen-loading" class="screen">
        <div id="loading-box">
          <div class="spinner"></div>
          <div id="loading-text">Загрузка уровня…</div>
          <button id="loading-back" class="link-btn" style="display:none">← В меню</button>
        </div>
      </section>
```

- [ ] **Step 2: index.html — стили загрузки.** Перед `</style>` вставить:
```css
      /* LOADING */
      #screen-loading { min-height: 100vh; display: none; }
      #screen-loading.active { display: flex; align-items: center; justify-content: center; }
      #loading-box { text-align: center; color: #e6e0cf; }
      #loading-text { margin-top: 16px; font-size: 16px; }
      .spinner { width: 44px; height: 44px; margin: 0 auto; border-radius: 50%;
        border: 4px solid #24314a; border-top-color: #F5A623; animation: spin 0.9s linear infinite; }
      @keyframes spin { to { transform: rotate(360deg); } }
```

- [ ] **Step 3: workout-screen.ts — принимать детектор.** Изменить сигнатуру и убрать создание модели.

Заменить строку 35:
```ts
export function startWorkout(app: App): void {
```
на:
```ts
export function startWorkout(app: App, detector: any): void {
```

Заменить тело `async function run()` (строки 176–191, от `statusEl.textContent = 'Запрашиваю камеру…';` до `statusEl.textContent = 'Займи упор лёжа';`) на:
```ts
  async function run() {
    statusEl.textContent = 'Запрашиваю камеру…';
    stream = await navigator.mediaDevices.getUserMedia({
      video: {facingMode: 'user', width: 640, height: 480},
      audio: false,
    });
    video.srcObject = stream;
    await video.play();
    const det = detector; // модель уже загружена (экран загрузки)
    statusEl.textContent = 'Займи упор лёжа';
```
(Строки `await tf.setBackend...`, `await tf.ready()`, `const det = await poseDetection.createDetector(...)` удаляются — модель приходит готовой.)

- [ ] **Step 4: workout-screen.ts — убрать неиспользуемые глобалы.** Строки 13–14:
```ts
declare const tf: any;
declare const poseDetection: any;
```
удалить (создание детектора переехало в `pose-model.ts`; `tf`/`poseDetection` тут больше не используются).

- [ ] **Step 5: main.ts — goWorkout через экран загрузки + импорт.** После `import {openArena} from './arena-screen';` добавить:
```ts
import {ensureDetector} from './pose-model';
```
Заменить метод `goWorkout` в объекте app:
```ts
  goWorkout() {
    show('screen-workout');
    startWorkout(this);
  },
```
на:
```ts
  goWorkout() {
    show('screen-loading');
    const loadingBack = document.getElementById('loading-back') as HTMLElement;
    const loadingText = document.getElementById('loading-text') as HTMLElement;
    loadingBack.style.display = 'none';
    loadingText.textContent = 'Загрузка уровня…';
    ensureDetector().then(
      detector => {
        // Если пользователь ушёл с экрана загрузки — не перебиваем.
        if (!document.getElementById('screen-loading')!.classList.contains('active')) return;
        show('screen-workout');
        startWorkout(this, detector);
      },
      () => {
        loadingText.textContent = 'Не удалось загрузить модель';
        loadingBack.style.display = 'inline-block';
      },
    );
  },
```

- [ ] **Step 6: main.ts — «назад» с экрана загрузки + фоновая предзагрузка после входа.** После обработчика `arena-back` (из Task 6) добавить:
```ts
document.getElementById('loading-back')!.addEventListener('click', () => show('screen-start'));
```
В обработчике `onUser`, сразу после `show('screen-start');` (конец успешной ветки входа) добавить фоновую предзагрузку:
```ts
  // Предзагружаем MoveNet в фоне, чтобы к началу боя модель была готова.
  void ensureDetector().catch(() => {});
```

- [ ] **Step 7: Сборка**

Run: `npx --yes esbuild web-game/src/main.ts --bundle --format=esm --outfile=web-game/app.js --external:'https://*'`
Expected: без ошибок.

- [ ] **Step 8: Commit**
```bash
git add web-game/index.html web-game/src/workout-screen.ts web-game/src/main.ts web-game/app.js
git commit -m "feat(web): экран загрузки уровня + предзагрузка/кэш MoveNet до камеры"
```

---

## Task 9: README + E2E-проверка в браузере

**Files:**
- Modify: `web-game/README.md`

- [ ] **Step 1: README — отметить Арену и предзагрузку.** В `web-game/README.md` в раздел запуска добавить строку: «На главном экране кнопка Arena открывает рейтинг (локация + XP). Модель MoveNet предзагружается после входа; бой открывается через экран загрузки.» (одно-два предложения, без изменения команд сборки).

- [ ] **Step 2: Собрать и поднять сервер**
```bash
npx --yes esbuild web-game/src/main.ts --bundle --format=esm --outfile=web-game/app.js --external:'https://*'
python3 -m http.server 8092 --directory web-game
```

- [ ] **Step 3: E2E — камера.** Войти, дойти до боя. Expected: перед камерой показывается экран «Загрузка уровня…» со спиннером; затем камера на всю высоту, шириной ≤600px, по центру.

- [ ] **Step 4: E2E — предзагрузка/кэш.** Выйти из боя (✕) и зайти в бой повторно. Expected: второй раз экран загрузки мгновенный (детектор закэширован). В консоли нет ошибок Firebase/модели.

- [ ] **Step 5: E2E — XP растёт.** Сделать несколько отжиманий (или в DevTools проверить `localStorage['pushuprpg.totalReps']` растёт). После победы/входа заново — в Firestore `users/{uid}.totalReps` соответствует.

- [ ] **Step 6: E2E — Арена.** Открыть Arena. Expected: список игроков, сортировка по локации затем XP, строка текущего игрока подсвечена, показаны «Локация N · <name>» и «XP». Остановить сервер (Ctrl+C).

- [ ] **Step 7: Юнит-регресс**

Run: `node --test web-game/src/sync.test.ts web-game/src/levels.test.ts web-game/src/nickname.test.ts`
Expected: все PASS.

- [ ] **Step 8: Commit**
```bash
git add web-game/README.md web-game/app.js
git commit -m "docs(web): README — рейтинг и предзагрузка модели"
```

---

## Финализация

- [ ] Запушить ветку и открыть PR в `main`: `git push -u origin web-rating-loading-camera` → `gh pr create --base main`. Мёрж запустит автодеплой Pages.

---

## Self-Review (проведён при написании плана)

**Покрытие спеки:** §2 рейтинг+XP → Tasks 2,3,4,5,6; §3 экран загрузки/предзагрузка → Tasks 7,8; §4 камера → Task 1; §5 модули → все; §6 тесты → Tasks 2,3 (юнит) + 9 (E2E). §7 non-goals соблюдены (правила Firestore не трогаем, одиночный orderBy + клиентская до-сортировка, без пагинации, `Progression` неизменён).

**Плейсхолдеров нет:** весь код приведён; версия Firebase 12.15.0 везде; тестовые команды конкретны.

**Согласованность типов:** `Profile {progression, totalReps}`, `LeaderRow {uid, nickname, defeatedCount, totalReps}`, `mergeProfile`, `loadRemote→Profile|null`, `saveRemote(uid, profile, nickname)`, `loadLeaderboard(max)`, `locationLabel(defeatedCount)→{index,name}`, `ensureDetector()`, `startWorkout(app, detector)`, `openArena(uid)`, App `.totalReps/.addRep()` — согласованы между задачами. Порядок задач учитывает, что Task 5 обновляет вызовы `saveRemote`/bootstrap под новую сигнатуру из Task 4, а Task 8 — сигнатуру `startWorkout` (в Task 5 `goWorkout` временно вызывает `startWorkout(this)` со старой сигнатурой; Task 8 приводит обе стороны к `startWorkout(this, detector)`).
