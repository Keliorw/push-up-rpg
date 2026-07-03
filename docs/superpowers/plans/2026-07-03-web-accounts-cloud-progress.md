# Web Accounts (login+password) & Cloud Progress — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Дать веб-версии (`web-game/`) учётные записи по логину+паролю (Firebase) и синхронизацию прогресса между устройствами через Firestore, с фундаментом под будущий рейтинг.

**Architecture:** Статический сайт на GitHub Pages, весь обмен из клиентского JS. Firebase Auth (Email/Password, логин маппится на технический e-mail) хранит сессию; Firestore хранит по документу на пользователя (`users/{uid}`). Прогресс объединяется чистой функцией `mergeProgress` так, чтобы никогда не откатываться. Аккаунт обязателен: до входа показывается экран логина/регистрации.

**Tech Stack:** TypeScript, esbuild (bundle, без `npm install`), Firebase JS SDK (модульный, с CDN gstatic, external в esbuild), Node встроенный тест-раннер (`node --test`, стрип типов по умолчанию в Node ≥22.18).

## Global Constraints

Каждая задача неявно обязана соблюдать это:

- Сборка `web-game` остаётся **без `npm install`**:
  `npx --yes esbuild web-game/src/main.ts --bundle --format=esm --outfile=web-game/app.js --external:'https://*'`
- Firebase-модули подключаются **как ESM с CDN**: `https://www.gstatic.com/firebasejs/<VER>/firebase-*.js`. Версию `<VER>` брать из CDN-сниппета в Firebase Console (на момент написания — `11.3.1`); использовать одну и ту же во всех файлах.
- Ключи Firebase-конфига публичны by design; безопасность — только в Firestore Security Rules.
- Логин (никнейм): 3–20 символов, нижний регистр, только `a-z0-9_-`. Технический e-mail: `<normalized-nick>@pushuprpg.app`.
- Пароль: минимум 6 символов (требование Firebase).
- Аккаунт обязателен. Нет гостевого режима, нет Google, нет e-mail и восстановления пароля.
- Тип прогресса (`app/src/game/progression.ts`): `{ defeatedCount: number; lastWorkoutDate: string | null }`.
- Документ Firestore `users/{uid}` = `{ nickname: string, defeatedCount: number, lastWorkoutDate: string|null, updatedAt: <serverTimestamp> }`.
- Правило слияния: `defeatedCount = max`, `lastWorkoutDate` = самая свежая (ISO-строки сравниваются лексикографически).
- Юнит-тесты чистых модулей запускаются так: `node --test web-game/src/<file>.test.ts` (из корня репозитория). Если Node ругается на стрип типов — фолбэк: `npx --yes tsx --test web-game/src/<file>.test.ts`.
- Ветка работы: `web-auth-accounts`. Коммиты — частые, по одному на задачу минимум.

---

## Task 0 (Prerequisite): Настройка Firebase-проекта — делает владелец репозитория

Это ручные действия в вебе (нужен Google-аккаунт владельца). Без них задачи 3–8 нельзя проверить в рантайме, но код писать можно.

- [ ] **Шаг 1: Создать проект.** https://console.firebase.google.com → «Add project» → имя (например `push-up-rpg`) → Analytics можно отключить.

- [ ] **Шаг 2: Включить провайдер Email/Password.** Build → Authentication → Get started → вкладка «Sign-in method» → Email/Password → Enable (только первый тумблер, «Email link» не нужен) → Save.

- [ ] **Шаг 3: Создать Firestore.** Build → Firestore Database → Create database → регион (например `eur3`) → «Start in production mode».

- [ ] **Шаг 4: Выставить Security Rules.** Firestore → вкладка Rules → вставить и Publish:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{uid} {
      // Публичное чтение — для будущего рейтинга (секретов в документе нет).
      allow read: if true;

      allow create: if request.auth != null
                    && request.auth.uid == uid
                    && request.resource.data.defeatedCount is int
                    && request.resource.data.defeatedCount >= 0;

      allow update: if request.auth != null
                    && request.auth.uid == uid
                    && request.resource.data.nickname == resource.data.nickname
                    && request.resource.data.defeatedCount is int
                    && request.resource.data.defeatedCount >= 0;
    }
  }
}
```

- [ ] **Шаг 5: Добавить Web App и скопировать конфиг.** Project settings (шестерёнка) → «Your apps» → иконка `</>` → зарегистрировать app → выбрать вариант **«Use a <script> tag» (CDN)** → скопировать объект `firebaseConfig` и версию SDK из строки `https://www.gstatic.com/firebasejs/<VER>/...`. Передать эти значения исполнителю (для Task 3).

- [ ] **Шаг 6: Авторизованные домены.** Authentication → Settings → Authorized domains → убедиться, что есть `localhost` (для локального теста) и добавить `keliorw.github.io` (для прода).

---

## Task 1: Чистая функция слияния прогресса `mergeProgress`

**Files:**
- Create: `web-game/src/sync.ts`
- Test: `web-game/src/sync.test.ts`

**Interfaces:**
- Consumes: тип `Progression` из `app/src/game/progression.ts` (только как тип).
- Produces: `mergeProgress(a: Progression, b: Progression): Progression` — используется в `main.ts` (Task 7).

- [ ] **Step 1: Написать падающий тест**

`web-game/src/sync.test.ts`:
```ts
import test from 'node:test';
import assert from 'node:assert/strict';
import {mergeProgress} from './sync.ts';

test('берёт больший defeatedCount', () => {
  assert.deepEqual(
    mergeProgress(
      {defeatedCount: 3, lastWorkoutDate: null},
      {defeatedCount: 7, lastWorkoutDate: null},
    ),
    {defeatedCount: 7, lastWorkoutDate: null},
  );
});

test('берёт самую свежую дату', () => {
  assert.deepEqual(
    mergeProgress(
      {defeatedCount: 5, lastWorkoutDate: '2026-07-01'},
      {defeatedCount: 5, lastWorkoutDate: '2026-07-03'},
    ),
    {defeatedCount: 5, lastWorkoutDate: '2026-07-03'},
  );
});

test('null-дата с одной стороны — берётся непустая', () => {
  assert.deepEqual(
    mergeProgress(
      {defeatedCount: 2, lastWorkoutDate: null},
      {defeatedCount: 1, lastWorkoutDate: '2026-06-30'},
    ),
    {defeatedCount: 2, lastWorkoutDate: '2026-06-30'},
  );
});

test('обе даты null → null', () => {
  assert.equal(
    mergeProgress(
      {defeatedCount: 0, lastWorkoutDate: null},
      {defeatedCount: 0, lastWorkoutDate: null},
    ).lastWorkoutDate,
    null,
  );
});
```

- [ ] **Step 2: Запустить тест — убедиться, что падает**

Run (из корня репо): `node --test web-game/src/sync.test.ts`
Expected: FAIL — модуль `./sync.ts` не найден / `mergeProgress` не определён.
(Если ошибка про стрип типов — использовать фолбэк `npx --yes tsx --test web-game/src/sync.test.ts` здесь и во всех тест-шагах.)

- [ ] **Step 3: Реализация**

`web-game/src/sync.ts`:
```ts
import type {Progression} from '../../app/src/game/progression';

/** Самая свежая из двух ISO-дат (YYYY-MM-DD), null-safe. */
function latestDate(a: string | null, b: string | null): string | null {
  if (a === null) return b;
  if (b === null) return a;
  return a >= b ? a : b;
}

/**
 * Объединяет локальный и облачный прогресс так, что прогресс НИКОГДА не
 * откатывается: берём максимум побед и самую свежую дату тренировки.
 */
export function mergeProgress(a: Progression, b: Progression): Progression {
  return {
    defeatedCount: Math.max(a.defeatedCount, b.defeatedCount),
    lastWorkoutDate: latestDate(a.lastWorkoutDate, b.lastWorkoutDate),
  };
}
```

- [ ] **Step 4: Запустить тест — убедиться, что проходит**

Run: `node --test web-game/src/sync.test.ts`
Expected: PASS (4 теста).

- [ ] **Step 5: Commit**

```bash
git add web-game/src/sync.ts web-game/src/sync.test.ts
git commit -m "feat(web): mergeProgress — слияние прогресса без отката"
```

---

## Task 2: Валидация/нормализация никнейма `nickname.ts`

**Files:**
- Create: `web-game/src/nickname.ts`
- Test: `web-game/src/nickname.test.ts`

**Interfaces:**
- Produces (используются в `auth.ts`, Task 4):
  - `normalizeNick(raw: string): string`
  - `validateNick(raw: string): string | null` — `null` если ок, иначе текст ошибки
  - `nickToEmail(raw: string): string`

- [ ] **Step 1: Написать падающий тест**

`web-game/src/nickname.test.ts`:
```ts
import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeNick, validateNick, nickToEmail} from './nickname.ts';

test('нормализация: trim + нижний регистр', () => {
  assert.equal(normalizeNick('  CoolGuy '), 'coolguy');
});

test('валидный ник проходит', () => {
  assert.equal(validateNick('cool_guy-1'), null);
});

test('слишком короткий — ошибка', () => {
  assert.notEqual(validateNick('ab'), null);
});

test('недопустимые символы — ошибка', () => {
  assert.notEqual(validateNick('превед'), null);
});

test('маппинг в технический e-mail', () => {
  assert.equal(nickToEmail('CoolGuy'), 'coolguy@pushuprpg.app');
});
```

- [ ] **Step 2: Запустить тест — убедиться, что падает**

Run: `node --test web-game/src/nickname.test.ts`
Expected: FAIL — `./nickname.ts` не найден.

- [ ] **Step 3: Реализация**

`web-game/src/nickname.ts`:
```ts
const NICK_RE = /^[a-z0-9_-]{3,20}$/;
const EMAIL_DOMAIN = 'pushuprpg.app';

export function normalizeNick(raw: string): string {
  return raw.trim().toLowerCase();
}

/** null если ник валиден, иначе текст ошибки для показа пользователю. */
export function validateNick(raw: string): string | null {
  if (!NICK_RE.test(normalizeNick(raw))) {
    return 'Логин: 3–20 символов, только латиница, цифры, _ и -';
  }
  return null;
}

export function nickToEmail(raw: string): string {
  return `${normalizeNick(raw)}@${EMAIL_DOMAIN}`;
}
```

- [ ] **Step 4: Запустить тест — убедиться, что проходит**

Run: `node --test web-game/src/nickname.test.ts`
Expected: PASS (5 тестов).

- [ ] **Step 5: Commit**

```bash
git add web-game/src/nickname.ts web-game/src/nickname.test.ts
git commit -m "feat(web): валидация ника и маппинг в технический e-mail"
```

---

## Task 3: Инициализация Firebase `firebase.ts`

**Files:**
- Create: `web-game/src/firebase.ts`

**Interfaces:**
- Consumes: значения `firebaseConfig` и версию `<VER>` из Task 0 (Шаг 5).
- Produces (используются в Task 4/5): экспорт `auth` (Firebase Auth), `db` (Firestore).

> Рантайм-проверка этого модуля выполняется end-to-end в Task 8 (нужен живой проект Firebase и браузер). Отдельного автотеста нет.

- [ ] **Step 1: Создать `web-game/src/firebase.ts`**

Заменить значения `REPLACE_*` на конфиг из Task 0 (Шаг 5) и `11.3.1` — на версию из того же сниппета:
```ts
import {initializeApp} from 'https://www.gstatic.com/firebasejs/11.3.1/firebase-app.js';
import {getAuth} from 'https://www.gstatic.com/firebasejs/11.3.1/firebase-auth.js';
import {getFirestore} from 'https://www.gstatic.com/firebasejs/11.3.1/firebase-firestore.js';

// Значения из Firebase Console → Project settings → Your apps → SDK setup (CDN).
// Публичны by design; безопасность — в Firestore Security Rules.
const firebaseConfig = {
  apiKey: 'REPLACE_apiKey',
  authDomain: 'REPLACE_projectId.firebaseapp.com',
  projectId: 'REPLACE_projectId',
  storageBucket: 'REPLACE_projectId.appspot.com',
  messagingSenderId: 'REPLACE_messagingSenderId',
  appId: 'REPLACE_appId',
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
```

- [ ] **Step 2: Commit**

```bash
git add web-game/src/firebase.ts
git commit -m "feat(web): инициализация Firebase (Auth + Firestore) с CDN"
```

---

## Task 4: Обёртка аутентификации `auth.ts`

**Files:**
- Create: `web-game/src/auth.ts`

**Interfaces:**
- Consumes: `auth` из `./firebase` (Task 3); `nickToEmail`, `validateNick` из `./nickname` (Task 2).
- Produces (используются в `auth-screen.ts` и `main.ts`):
  - `interface GameUser { uid: string; nickname: string }`
  - `register(rawNick: string, password: string): Promise<void>`
  - `login(rawNick: string, password: string): Promise<void>`
  - `logout(): Promise<void>`
  - `onUser(cb: (user: GameUser | null) => void): void`

> Рантайм-проверка — в Task 8.

- [ ] **Step 1: Создать `web-game/src/auth.ts`** (версию `11.3.1` синхронизировать с Task 3)

```ts
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  setPersistence,
  browserLocalPersistence,
} from 'https://www.gstatic.com/firebasejs/11.3.1/firebase-auth.js';
import {auth} from './firebase';
import {nickToEmail, validateNick} from './nickname';

export interface GameUser {
  uid: string;
  nickname: string;
}

const PASSWORD_MIN = 6;

// Держим сессию до явного выхода (по умолчанию так и есть; выставляем явно).
setPersistence(auth, browserLocalPersistence).catch(() => {});

export async function register(rawNick: string, password: string): Promise<void> {
  const nickErr = validateNick(rawNick);
  if (nickErr) throw new Error(nickErr);
  if (password.length < PASSWORD_MIN) throw new Error('Пароль: минимум 6 символов');
  try {
    const cred = await createUserWithEmailAndPassword(auth, nickToEmail(rawNick), password);
    await updateProfile(cred.user, {displayName: rawNick.trim()});
  } catch (e) {
    throw new Error(authErrorText(e));
  }
}

export async function login(rawNick: string, password: string): Promise<void> {
  try {
    await signInWithEmailAndPassword(auth, nickToEmail(rawNick), password);
  } catch (e) {
    throw new Error(authErrorText(e));
  }
}

export function logout(): Promise<void> {
  return signOut(auth);
}

export function onUser(cb: (user: GameUser | null) => void): void {
  onAuthStateChanged(auth, u => {
    cb(u ? {uid: u.uid, nickname: u.displayName ?? ''} : null);
  });
}

function authErrorText(e: unknown): string {
  const code = (e as {code?: string})?.code ?? '';
  switch (code) {
    case 'auth/email-already-in-use':
      return 'Логин уже занят';
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'Неверный логин или пароль';
    case 'auth/weak-password':
      return 'Пароль: минимум 6 символов';
    case 'auth/network-request-failed':
      return 'Нет сети. Попробуйте позже';
    default:
      return 'Ошибка входа. Попробуйте ещё раз';
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add web-game/src/auth.ts
git commit -m "feat(web): обёртка Firebase Auth (регистрация/вход/выход/подписка)"
```

---

## Task 5: Облачное хранилище прогресса `remote-storage.ts`

**Files:**
- Create: `web-game/src/remote-storage.ts`

**Interfaces:**
- Consumes: `db` из `./firebase` (Task 3); тип `Progression`.
- Produces (используются в `main.ts`, Task 7):
  - `loadRemote(uid: string): Promise<Progression | null>`
  - `saveRemote(uid: string, p: Progression, nickname: string): Promise<void>`

> Рантайм-проверка — в Task 8.

- [ ] **Step 1: Создать `web-game/src/remote-storage.ts`** (версию `11.3.1` синхронизировать с Task 3)

```ts
import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
} from 'https://www.gstatic.com/firebasejs/11.3.1/firebase-firestore.js';
import {db} from './firebase';
import type {Progression} from '../../app/src/game/progression';

export async function loadRemote(uid: string): Promise<Progression | null> {
  const snap = await getDoc(doc(db, 'users', uid));
  if (!snap.exists()) return null;
  const d = snap.data();
  return {
    defeatedCount: typeof d.defeatedCount === 'number' ? d.defeatedCount : 0,
    lastWorkoutDate: typeof d.lastWorkoutDate === 'string' ? d.lastWorkoutDate : null,
  };
}

export async function saveRemote(
  uid: string,
  p: Progression,
  nickname: string,
): Promise<void> {
  await setDoc(
    doc(db, 'users', uid),
    {
      nickname,
      defeatedCount: p.defeatedCount,
      lastWorkoutDate: p.lastWorkoutDate,
      updatedAt: serverTimestamp(),
    },
    {merge: true},
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add web-game/src/remote-storage.ts
git commit -m "feat(web): чтение/запись прогресса в Firestore users/{uid}"
```

---

## Task 6: Экран логина/регистрации + чип аккаунта (UI)

**Files:**
- Modify: `web-game/index.html` (добавить `#screen-auth`, чип аккаунта, стили; снять `active` со `screen-start`)
- Create: `web-game/src/auth-screen.ts`

**Interfaces:**
- Consumes: `register`, `login` из `./auth` (Task 4).
- Produces (используются в `main.ts`, Task 7):
  - `initAuthScreen(): void` — навешивает обработчики на форму
  - `revealAuthForm(): void` — прячет «Загрузка…», показывает форму

- [ ] **Step 1: В `web-game/index.html` снять `active` со `screen-start`**

Найти (строка ~158):
```html
<section id="screen-start" class="screen active">
```
Заменить на:
```html
<section id="screen-start" class="screen">
```

- [ ] **Step 2: Добавить экран `#screen-auth` перед `#screen-start`**

Сразу после открытия `<div id="app">` (строка ~157) вставить:
```html
      <section id="screen-auth" class="screen active">
        <div id="auth-box">
          <div id="auth-loading">Загрузка…</div>
          <div id="auth-form" style="display:none">
            <h1 id="auth-title">Вход</h1>
            <input id="auth-nick" autocomplete="username" placeholder="Логин" />
            <input id="auth-pass" type="password" autocomplete="current-password" placeholder="Пароль" />
            <button class="btn" id="auth-submit">Войти</button>
            <div id="auth-error"></div>
            <button id="auth-toggle" class="link-btn">Нет аккаунта? Регистрация</button>
          </div>
        </div>
      </section>
```

- [ ] **Step 3: Добавить чип аккаунта в `#screen-start`**

Внутри `<section id="screen-start" ...>`, сразу после `<div id="menu-bg">...</div>` (перед `<div id="menu-buttons">`, строка ~168) вставить:
```html
        <div id="account-chip" style="display:none">
          <span id="account-nick"></span>
          <button id="btn-logout" class="link-btn">Выйти</button>
        </div>
```

- [ ] **Step 4: Добавить стили**

В конец блока `<style>` (перед `</style>`, строка ~154) вставить:
```css
      /* AUTH */
      #screen-auth { min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 24px; }
      #auth-box { width: 100%; max-width: 320px; text-align: center; }
      #auth-loading { color: #9aa4b2; font-size: 16px; }
      #auth-form h1 { color: #F5A623; font-size: 28px; margin: 0 0 20px; }
      #auth-form input { display: block; width: 100%; margin: 0 0 12px; padding: 14px 16px;
        border-radius: 10px; border: 1px solid #3a4a67; background: #17202f; color: #fff; font-size: 16px; }
      #auth-form .btn { width: 100%; padding: 14px; border-radius: 10px; margin-top: 4px; }
      #auth-error { color: #ff6a56; font-size: 14px; min-height: 18px; margin: 10px 0; }
      .link-btn { background: none; border: none; color: #9aa4b2; text-decoration: underline;
        cursor: pointer; font-size: 14px; padding: 6px; }
      /* ACCOUNT CHIP */
      #account-chip { position: absolute; top: 10px; right: 10px; z-index: 2;
        display: flex; align-items: center; gap: 8px; background: rgba(11,17,31,.8);
        border: 1px solid #3a4a67; border-radius: 20px; padding: 4px 6px 4px 12px; }
      #account-nick { font-size: 13px; font-weight: 700; color: #fff; }
```

- [ ] **Step 5: Создать контроллер `web-game/src/auth-screen.ts`**

```ts
import {register, login} from './auth';

type Mode = 'login' | 'register';
let mode: Mode = 'login';

function el<T extends HTMLElement = HTMLElement>(id: string): T {
  return document.getElementById(id) as T;
}

export function initAuthScreen(): void {
  const nick = el<HTMLInputElement>('auth-nick');
  const pass = el<HTMLInputElement>('auth-pass');
  const submit = el<HTMLButtonElement>('auth-submit');
  const err = el('auth-error');
  const toggle = el('auth-toggle');
  const title = el('auth-title');

  function applyMode(): void {
    title.textContent = mode === 'login' ? 'Вход' : 'Регистрация';
    submit.textContent = mode === 'login' ? 'Войти' : 'Создать аккаунт';
    toggle.textContent = mode === 'login'
      ? 'Нет аккаунта? Регистрация'
      : 'Уже есть аккаунт? Войти';
    err.textContent = '';
  }

  toggle.addEventListener('click', () => {
    mode = mode === 'login' ? 'register' : 'login';
    applyMode();
  });

  submit.addEventListener('click', async () => {
    err.textContent = '';
    submit.disabled = true;
    try {
      if (mode === 'register') await register(nick.value, pass.value);
      else await login(nick.value, pass.value);
      // Маршрутизацию выполнит onUser в main.ts.
    } catch (e) {
      err.textContent = (e as Error).message;
    } finally {
      submit.disabled = false;
    }
  });

  applyMode();
}

/** Прячет «Загрузка…» и показывает форму (когда сессии нет). */
export function revealAuthForm(): void {
  el('auth-loading').style.display = 'none';
  el('auth-form').style.display = 'block';
}
```

- [ ] **Step 6: Проверка вёрстки (без Firebase)**

Временный ручной тест, что верстка не сломана: `cd web-game && python3 -m http.server 8081`, открыть http://localhost:8081/ — должен показаться экран `screen-auth` с текстом «Загрузка…» (форма и меню скрыты; интеграция появится в Task 7). Остановить сервер (Ctrl+C).

- [ ] **Step 7: Commit**

```bash
git add web-game/index.html web-game/src/auth-screen.ts
git commit -m "feat(web): экран логина/регистрации и чип аккаунта (UI)"
```

---

## Task 7: Интеграция в `main.ts` (гейт входа + синхрон + выход)

**Files:**
- Modify: `web-game/src/main.ts`

**Interfaces:**
- Consumes: `onUser`, `logout`, `GameUser` (`./auth`); `loadRemote`, `saveRemote` (`./remote-storage`); `mergeProgress` (`./sync`); `initAuthScreen`, `revealAuthForm` (`./auth-screen`); существующие `loadProgression`, `saveProgression` (`./storage`).
- Produces: рабочая оркестрация; тип `ScreenId` расширяется значением `'screen-auth'`.

- [ ] **Step 1: Добавить импорты**

В начало `web-game/src/main.ts`, после существующих импортов (после строки 10 `import {startWorkout} from './workout-screen';`) добавить:
```ts
import {onUser, logout, GameUser} from './auth';
import {loadRemote, saveRemote} from './remote-storage';
import {mergeProgress} from './sync';
import {initAuthScreen, revealAuthForm} from './auth-screen';
```

- [ ] **Step 2: Расширить тип `ScreenId`**

Заменить (строки 12–17):
```ts
export type ScreenId =
  | 'screen-start'
  | 'screen-map'
  | 'screen-card'
  | 'screen-workout'
  | 'screen-victory';
```
на:
```ts
export type ScreenId =
  | 'screen-auth'
  | 'screen-start'
  | 'screen-map'
  | 'screen-card'
  | 'screen-workout'
  | 'screen-victory';
```

- [ ] **Step 3: Добавить состояние пользователя и хелперы UI**

Сразу перед `const app: App = {` (строка ~50) вставить:
```ts
let currentUser: GameUser | null = null;

function showAccountChip(nickname: string | null): void {
  const chip = document.getElementById('account-chip') as HTMLElement;
  const nick = document.getElementById('account-nick') as HTMLElement;
  if (nickname) {
    nick.textContent = nickname;
    chip.style.display = 'flex';
  } else {
    chip.style.display = 'none';
  }
}

// Ненавязчивое уведомление, что синхронизация не удалась (прогресс сохранён локально).
function showSyncWarning(): void {
  const nick = document.getElementById('account-nick') as HTMLElement;
  if (currentUser) nick.textContent = `${currentUser.nickname} (оффлайн)`;
}
```

- [ ] **Step 4: Писать прогресс и в облако при победе**

В методе `onDefeated` (строки ~64–74), сразу после `saveProgression(this.progression);` (строка 67) добавить:
```ts
    if (currentUser) {
      saveRemote(currentUser.uid, this.progression, currentUser.nickname).catch(showSyncWarning);
    }
```

- [ ] **Step 5: Добавить bootstrap входа в конец файла**

В самый конец `web-game/src/main.ts` (после строки 145 `...('map-back')...`) добавить:
```ts
// LOGOUT
document.getElementById('btn-logout')!.addEventListener('click', () => {
  void logout(); // onUser вернёт null и покажет экран входа
});

// AUTH BOOTSTRAP: аккаунт обязателен. До входа — экран логина/регистрации.
initAuthScreen();
onUser(async user => {
  currentUser = user;
  if (!user) {
    showAccountChip(null);
    revealAuthForm();
    show('screen-auth');
    return;
  }
  // Вошли: тянем облако, мёржим с локальным (прогресс не откатывается),
  // пишем результат в оба хранилища.
  const local = loadProgression();
  let remote = null;
  try {
    remote = await loadRemote(user.uid);
  } catch {
    showSyncWarning();
  }
  const merged = remote ? mergeProgress(local, remote) : local;
  app.progression = merged;
  saveProgression(merged);
  saveRemote(user.uid, merged, user.nickname).catch(showSyncWarning);
  showAccountChip(user.nickname);
  show('screen-start');
});
```

- [ ] **Step 6: Commit**

```bash
git add web-game/src/main.ts
git commit -m "feat(web): гейт входа, синхрон прогресса при входе/победе, выход"
```

---

## Task 8: Сборка, README и end-to-end проверка

**Files:**
- Modify: `web-game/app.js` (пересборка), `web-game/README.md`

- [ ] **Step 1: Пересобрать бандл с external для CDN**

Run (из корня репо):
```bash
npx --yes esbuild web-game/src/main.ts --bundle --format=esm --outfile=web-game/app.js --external:'https://*'
```
Expected: сборка без ошибок.
Если ошибка `Could not resolve "https://..."` — значит wildcard не сработал; тогда перечислить URL'ы явно, по одному на модуль:
`--external:'https://www.gstatic.com/firebasejs/11.3.1/firebase-app.js' --external:'https://www.gstatic.com/firebasejs/11.3.1/firebase-auth.js' --external:'https://www.gstatic.com/firebasejs/11.3.1/firebase-firestore.js'`

- [ ] **Step 2: Проверить, что импорты Firebase остались внешними в бандле**

Run: `grep -c "gstatic.com/firebasejs" web-game/app.js`
Expected: число > 0 (импорты сохранены как есть, не заинлайнены).

- [ ] **Step 3: Обновить `web-game/README.md`**

В разделе «Пересборка после правок» заменить команду esbuild на версию с `--external:'https://*'` (как в Step 1). Добавить строку: «Требуется настроенный проект Firebase (см. `docs/superpowers/plans/2026-07-03-web-accounts-cloud-progress.md`, Task 0) и заполненный `web-game/src/firebase.ts`.»

- [ ] **Step 4: E2E — регистрация и базовый бой** (нужен Task 0 выполненным)

```bash
cd web-game && python3 -m http.server 8081
```
Открыть http://localhost:8081/ в браузере A:
- Expected: экран входа (после «Загрузка…» показывается форма).
- Нажать «Нет аккаунта? Регистрация», ввести логин (например `tester1`) и пароль (≥6), «Создать аккаунт».
- Expected: попадаем в главное меню, справа сверху чип с ником `tester1`.
- Кампания → карта → узел → «Начать тренировку» → пройти бой (или проверить победу). После победы — экран «Повержен!».
- Открыть Firebase Console → Firestore → коллекция `users` → документ с `defeatedCount: 1`, `nickname: "tester1"`.

- [ ] **Step 5: E2E — синхронизация между «устройствами»**

- В браузере B (или профиль/инкогнито) открыть тот же http://localhost:8081/.
- Войти под `tester1` тем же паролем.
- Expected: прогресс подтянулся (на карте текущий узел соответствует `defeatedCount` из облака; не начинается с нуля).

- [ ] **Step 6: E2E — выход/вход и ошибки**

- В меню нажать «Выйти» → Expected: снова экран входа.
- Ввести неверный пароль → Expected: сообщение «Неверный логин или пароль».
- Регистрация с занятым логином `tester1` → Expected: «Логин уже занят».
- Короткий пароль (`123`) при регистрации → Expected: «Пароль: минимум 6 символов».
- Остановить сервер (Ctrl+C).

- [ ] **Step 7: Прогнать юнит-тесты ещё раз (регресс)**

Run: `node --test web-game/src/sync.test.ts web-game/src/nickname.test.ts`
Expected: все тесты PASS.

- [ ] **Step 8: Commit**

```bash
git add web-game/app.js web-game/README.md
git commit -m "build(web): пересборка с Firebase (external CDN) + README"
```

---

## Финализация (после всех задач)

- [ ] Запушить ветку и открыть PR в `main` (как в прежнем флоу): `git push -u origin web-auth-accounts` → `gh pr create --base main`. Мёрж PR запустит автодеплой Pages (workflow уже на месте после PR #3).
- [ ] После деплоя проверить вход/синхрон на проде https://keliorw.github.io/push-up-rpg/ (домен `keliorw.github.io` должен быть в authorized domains — Task 0, Шаг 6).

---

## Self-Review (проведён при написании плана)

**Покрытие спеки:** §5 Auth → Tasks 2,4,6; §6 модель+правила → Task 0 (правила) + Task 5; §7 модули → Tasks 1–7; §8 потоки → Task 7; §9 merge → Task 1; §10 ошибки/оффлайн → Task 4 (тексты) + Task 7 (`showSyncWarning`); §11 сборка → Task 8; §12 настройка Firebase → Task 0; §14 тесты → Tasks 1,2 (юнит) + Task 8 (E2E). §13 рейтинг — сознательно вне скоупа (модель данных уже готова).

**Плейсхолдеры:** значения `REPLACE_*` и `<VER>` в `firebase.ts` — это конфиг, поставляемый владельцем в Task 0 (внешние данные, а не недописанная логика); везде указано, откуда их взять.

**Согласованность типов:** `Progression {defeatedCount, lastWorkoutDate}`, `GameUser {uid, nickname}`, сигнатуры `mergeProgress/loadRemote/saveRemote/register/login/logout/onUser/initAuthScreen/revealAuthForm` — единообразны между задачами, где объявлены и где используются.
