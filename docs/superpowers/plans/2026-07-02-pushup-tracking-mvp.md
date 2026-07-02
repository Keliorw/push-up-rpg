# Push-Up Tracking MVP — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** React Native приложение: стартовый экран с кнопкой START → экран фронтальной камеры со счётчиком отжиманий сверху и скелетом-оверлеем, повторяющим движения человека в реальном времени.

**Architecture:** Кадры фронтальной камеры (`react-native-vision-camera`, Skia frame processor) прогоняются через MoveNet Lightning (`react-native-fast-tflite`); скелет рисуется Skia прямо на кадре в worklet-потоке; ключевые точки уходят в JS, где чистый TS-автомат `RepDetector` считает повторы по углу в локте (выпрямлены → согнуты → выпрямлены = +1, с гистерезисом).

**Tech Stack:** React Native (CLI, TypeScript), react-native-vision-camera v4, react-native-worklets-core, react-native-fast-tflite, vision-camera-resize-plugin, @shopify/react-native-skia, react-native-sound-player, Jest.

**Спека:** `docs/superpowers/specs/2026-07-02-pushup-tracking-design.md` (относительно корня репозитория).

## Global Constraints

- **Git:** проект — выделенный репозиторий `push-up-rpg` (remote `origin` → github.com/Keliorw/push-up-rpg.git), корень `/home/keliorw/Projects/Job/push-ups-rpg/push-up-rpg`. Работа идёт в ветке `push-ups-tracking-mvp`. Обычный `git add`/`git commit` безопасен. Команды коммита используют pathspec `-- <пути>` как гигиену (коммитим только то, что произвела задача) — сохраняйте их.
- Рабочая директория проекта: `/home/keliorw/Projects/Job/push-ups-rpg/push-up-rpg`. RN-приложение живёт в подпапке `app/`.
- Платформа разработки — Linux: собираем и проверяем только Android. iOS-конфиги (Info.plist) делаем, но не собираем.
- Android `minSdkVersion = 26` (требование vision-camera).
- Пакетный менеджер — npm. Язык кода — TypeScript. Никаких зависимостей сверх перечисленных в Tech Stack.
- Тексты в UI: подсказки по-русски («Займите упор лёжа»), кнопка — «START».
- Все пороги детектора — только в `app/src/pose/config.ts`, нигде больше не хардкодить.
- Вне скоупа MVP: античит, серверная часть, RPG-механика, утилита записи JSON-фикстур с устройства (в тестах используются синтетические позы).

---

### Task 1: Скаффолд RN-приложения и нативная конфигурация

**Files:**
- Create: `app/` (шаблон React Native CLI)
- Modify: `app/babel.config.js`
- Modify: `app/metro.config.js`
- Modify: `app/android/app/src/main/AndroidManifest.xml`
- Modify: `app/android/build.gradle`
- Modify: `app/ios/PushUpsRpg/Info.plist`

**Interfaces:**
- Consumes: —
- Produces: собирающийся RN-проект в `app/` со всеми зависимостями; настроенные worklets (babel) и `.tflite`-ассеты (metro). Все последующие задачи работают внутри `app/`.

- [ ] **Step 1: Инициализировать проект**

```bash
cd /home/keliorw/Projects/Job/push-ups-rpg/push-up-rpg
npx @react-native-community/cli@latest init PushUpsRpg --directory app --skip-git-init
```

Expected: папка `app/` с TypeScript-шаблоном (App.tsx, android/, ios/, __tests__/). На вопрос про установку iOS pods — отвечать «нет» (Linux).

- [ ] **Step 2: Установить зависимости**

```bash
cd /home/keliorw/Projects/Job/push-ups-rpg/push-up-rpg/app
npm install react-native-vision-camera react-native-worklets-core react-native-fast-tflite vision-camera-resize-plugin @shopify/react-native-skia react-native-sound-player
```

Expected: установка без ошибок peer-dependencies. Если npm ругается на peer conflict — прочитать сообщение и поставить совместимую мажорную версию конфликтующего пакета, не использовать `--force`.

- [ ] **Step 3: Подключить worklets-плагин в babel**

Заменить содержимое `app/babel.config.js`:

```js
module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [['react-native-worklets-core/plugin']],
};
```

- [ ] **Step 4: Добавить .tflite в ассеты metro**

Заменить содержимое `app/metro.config.js`:

```js
const {getDefaultConfig, mergeConfig} = require('@react-native/metro-config');

const defaultConfig = getDefaultConfig(__dirname);

/** .tflite должен резолвиться как ассет, чтобы require() модели работал */
const config = {
  resolver: {
    assetExts: [...defaultConfig.resolver.assetExts, 'tflite'],
  },
};

module.exports = mergeConfig(defaultConfig, config);
```

- [ ] **Step 5: Разрешение камеры (Android) и minSdk**

В `app/android/app/src/main/AndroidManifest.xml` внутрь `<manifest>` перед `<application>` добавить:

```xml
<uses-permission android:name="android.permission.CAMERA" />
```

В `app/android/build.gradle` в блоке `ext` заменить значение `minSdkVersion` на:

```groovy
minSdkVersion = 26
```

- [ ] **Step 6: Разрешение камеры (iOS)**

В `app/ios/PushUpsRpg/Info.plist` внутрь корневого `<dict>` добавить:

```xml
<key>NSCameraUsageDescription</key>
<string>Камера нужна, чтобы распознавать отжимания</string>
```

- [ ] **Step 7: Проверить, что jest работает**

```bash
cd /home/keliorw/Projects/Job/push-ups-rpg/push-up-rpg/app
npm test
```

Expected: PASS (шаблонный `__tests__/App.test.tsx`).

- [ ] **Step 8: Проверить, что Android собирается**

```bash
cd /home/keliorw/Projects/Job/push-ups-rpg/push-up-rpg/app/android
./gradlew assembleDebug
```

Expected: `BUILD SUCCESSFUL`. Если нет Android SDK — установить и задать `ANDROID_HOME`. Если сборка падает на новой архитектуре из-за одной из нативных библиотек — в `app/android/gradle.properties` выставить `newArchEnabled=false` и пересобрать.

- [ ] **Step 9: Commit**

```bash
cd /home/keliorw/Projects/Job/push-ups-rpg/push-up-rpg
git add app
git commit -m "chore: scaffold RN app with camera/tflite/skia deps" -- app
```

---

### Task 2: Ассеты — модель MoveNet и звук повтора

**Files:**
- Create: `app/src/assets/models/movenet_lightning_int8.tflite`
- Create: `app/scripts/make-beep.js`
- Create: `app/src/assets/beep.wav`

**Interfaces:**
- Consumes: —
- Produces: `require('../assets/models/movenet_lightning_int8.tflite')` и `require('../assets/beep.wav')` доступны из `app/src/**`.

- [ ] **Step 1: Скачать модель MoveNet Lightning (int8)**

```bash
cd /home/keliorw/Projects/Job/push-ups-rpg/push-up-rpg/app
mkdir -p src/assets/models
curl -L -o src/assets/models/movenet_lightning_int8.tflite \
  "https://storage.googleapis.com/tfhub-lite-models/google/lite-model/movenet/singlepose/lightning/tflite/int8/4.tflite"
ls -la src/assets/models/
```

Expected: файл ~2–3 МБ. Если размер < 1 МБ или это HTML — скачать по альтернативному URL `https://tfhub.dev/google/lite-model/movenet/singlepose/lightning/tflite/int8/4?lite-format=tflite`; если и он мёртв — найти «movenet singlepose lightning tflite int8 download» (модель хостится на Kaggle Models) и положить файл по тому же пути.

- [ ] **Step 2: Скрипт генерации звука**

Создать `app/scripts/make-beep.js`:

```js
// Генерирует короткий beep (WAV PCM16 mono 44.1kHz) без внешних зависимостей.
const fs = require('fs');

const sr = 44100;
const dur = 0.12;
const freq = 880;
const n = Math.floor(sr * dur);
const data = Buffer.alloc(n * 2);
for (let i = 0; i < n; i++) {
  const attack = Math.min(1, i / 200);
  const release = Math.min(1, ((n - i) / n) * 10);
  const s = Math.sin((2 * Math.PI * freq * i) / sr) * attack * release * 0.8;
  data.writeInt16LE(Math.round(s * 32767), i * 2);
}
const header = Buffer.alloc(44);
header.write('RIFF', 0);
header.writeUInt32LE(36 + data.length, 4);
header.write('WAVE', 8);
header.write('fmt ', 12);
header.writeUInt32LE(16, 16);
header.writeUInt16LE(1, 20); // PCM
header.writeUInt16LE(1, 22); // mono
header.writeUInt32LE(sr, 24);
header.writeUInt32LE(sr * 2, 28);
header.writeUInt16LE(2, 32);
header.writeUInt16LE(16, 34);
header.write('data', 36);
header.writeUInt32LE(data.length, 40);
fs.writeFileSync(process.argv[2], Buffer.concat([header, data]));
console.log('written', process.argv[2], 44 + data.length, 'bytes');
```

- [ ] **Step 3: Сгенерировать beep.wav**

```bash
cd /home/keliorw/Projects/Job/push-ups-rpg/push-up-rpg/app
node scripts/make-beep.js src/assets/beep.wav
```

Expected: `written src/assets/beep.wav 10628 bytes` (число может немного отличаться).

- [ ] **Step 4: Commit**

```bash
cd /home/keliorw/Projects/Job/push-ups-rpg/push-up-rpg
git add app/src/assets app/scripts
git commit -m "chore: add movenet model and rep beep sound" -- app/src/assets app/scripts
```

---

### Task 3: Типы позы и геометрия угла

**Files:**
- Create: `app/src/pose/types.ts`
- Create: `app/src/pose/geometry.ts`
- Test: `app/__tests__/geometry.test.ts`

**Interfaces:**
- Consumes: —
- Produces:
  - `interface Keypoint { x: number; y: number; score: number }`
  - `type Pose = Keypoint[]` (массив длиной ≥ 11, индексация по MoveNet)
  - `const KP` — именованные индексы MoveNet (nose=0 … rightWrist=10)
  - `angleDeg(a, b, c): number` — угол в точке `b` в градусах, 0–180

- [ ] **Step 1: Типы**

Создать `app/src/pose/types.ts`:

```ts
export interface Keypoint {
  x: number;
  y: number;
  score: number;
}

/** Массив ключевых точек, индексация по схеме MoveNet (используем 0–10). */
export type Pose = Keypoint[];

/** Индексы ключевых точек MoveNet. */
export const KP = {
  nose: 0,
  leftEye: 1,
  rightEye: 2,
  leftEar: 3,
  rightEar: 4,
  leftShoulder: 5,
  rightShoulder: 6,
  leftElbow: 7,
  rightElbow: 8,
  leftWrist: 9,
  rightWrist: 10,
} as const;
```

- [ ] **Step 2: Написать падающий тест на angleDeg**

Создать `app/__tests__/geometry.test.ts`:

```ts
import {angleDeg} from '../src/pose/geometry';

test('прямая рука — 180°', () => {
  expect(angleDeg({x: 0, y: 0}, {x: 0, y: 1}, {x: 0, y: 2})).toBeCloseTo(180);
});

test('прямой угол — 90°', () => {
  expect(angleDeg({x: 0, y: 0}, {x: 0, y: 1}, {x: 1, y: 1})).toBeCloseTo(90);
});

test('вырожденный случай (совпадающие точки) — 180', () => {
  expect(angleDeg({x: 0, y: 1}, {x: 0, y: 1}, {x: 1, y: 1})).toBe(180);
});
```

- [ ] **Step 3: Убедиться, что тест падает**

```bash
cd /home/keliorw/Projects/Job/push-ups-rpg/push-up-rpg/app
npm test -- geometry
```

Expected: FAIL — `Cannot find module '../src/pose/geometry'`.

- [ ] **Step 4: Реализация**

Создать `app/src/pose/geometry.ts`:

```ts
interface Point {
  x: number;
  y: number;
}

/** Угол в точке b между лучами b→a и b→c, в градусах (0–180). */
export function angleDeg(a: Point, b: Point, c: Point): number {
  const v1x = a.x - b.x;
  const v1y = a.y - b.y;
  const v2x = c.x - b.x;
  const v2y = c.y - b.y;
  const norm = Math.hypot(v1x, v1y) * Math.hypot(v2x, v2y);
  if (norm === 0) {
    return 180;
  }
  const cos = Math.min(1, Math.max(-1, (v1x * v2x + v1y * v2y) / norm));
  return (Math.acos(cos) * 180) / Math.PI;
}
```

- [ ] **Step 5: Убедиться, что тесты проходят**

```bash
npm test -- geometry
```

Expected: PASS, 3 теста.

- [ ] **Step 6: Commit**

```bash
cd /home/keliorw/Projects/Job/push-ups-rpg/push-up-rpg
git add app/src/pose app/__tests__/geometry.test.ts
git commit -m "feat: pose types and elbow angle geometry" -- app/src/pose app/__tests__/geometry.test.ts
```

---

### Task 4: RepDetector — автомат подсчёта повторов

**Files:**
- Create: `app/src/pose/config.ts`
- Create: `app/src/pose/RepDetector.ts`
- Test: `app/__tests__/RepDetector.test.ts`

**Interfaces:**
- Consumes: `Pose`, `KP` из `../src/pose/types`; `angleDeg` из `../src/pose/geometry`
- Produces:
  - `type DetectorEvent = 'positionAcquired' | 'positionLost' | 'repCounted'`
  - `class RepDetector { constructor(cfg?: DetectorConfig); process(pose: Pose, tMs: number): DetectorEvent[] }`
  - `interface DetectorConfig` и `DEFAULT_CONFIG` из `config.ts`

- [ ] **Step 1: Конфиг порогов**

Создать `app/src/pose/config.ts`:

```ts
export interface DetectorConfig {
  /** Минимальный score ключевой точки, чтобы считать её видимой. */
  minKeypointScore: number;
  /** Сколько мс поза должна стабильно держаться до positionAcquired. */
  positionHoldMs: number;
  /** Угол локтя, при котором руки считаются выпрямленными. */
  elbowExtendedDeg: number;
  /** Угол локтя, при котором руки считаются согнутыми. */
  elbowFlexedDeg: number;
  /** Минимум мс между засчитанными повторами (защита от дребезга). */
  minRepDurationMs: number;
  /** EMA-коэффициент нового замера угла (1 = без сглаживания). */
  angleSmoothing: number;
}

export const DEFAULT_CONFIG: DetectorConfig = {
  minKeypointScore: 0.3,
  positionHoldMs: 1000,
  elbowExtendedDeg: 155,
  elbowFlexedDeg: 95,
  minRepDurationMs: 700,
  angleSmoothing: 0.4,
};
```

- [ ] **Step 2: Написать падающие тесты**

Создать `app/__tests__/RepDetector.test.ts`:

```ts
import {DEFAULT_CONFIG} from '../src/pose/config';
import {RepDetector} from '../src/pose/RepDetector';
import {KP, Pose} from '../src/pose/types';

// В тестах отключаем сглаживание, чтобы угол применялся мгновенно.
const CFG = {...DEFAULT_CONFIG, angleSmoothing: 1};

/** Поза с заданным углом в обоих локтях; запястья гарантированно ниже плеч. */
function armPose(angle: number, score = 0.9): Pose {
  const rad = (angle * Math.PI) / 180;
  const pose: Pose = Array.from({length: 11}, () => ({x: 0.5, y: 0.1, score}));
  const L = 0.2;
  const mk = (sx: number, dir: number) => {
    const shoulder = {x: sx, y: 0.3, score};
    const elbow = {x: sx, y: 0.3 + L, score};
    const wrist = {
      x: sx + dir * L * Math.sin(rad),
      y: 0.3 + L - L * Math.cos(rad),
      score,
    };
    return {shoulder, elbow, wrist};
  };
  const l = mk(0.35, -1);
  const r = mk(0.65, 1);
  pose[KP.leftShoulder] = l.shoulder;
  pose[KP.leftElbow] = l.elbow;
  pose[KP.leftWrist] = l.wrist;
  pose[KP.rightShoulder] = r.shoulder;
  pose[KP.rightElbow] = r.elbow;
  pose[KP.rightWrist] = r.wrist;
  return pose;
}

function emptyPose(): Pose {
  return Array.from({length: 11}, () => ({x: 0, y: 0, score: 0}));
}

function feed(d: RepDetector, angle: number, t: number) {
  return d.process(armPose(angle), t);
}

test('пустая поза — нет событий', () => {
  const d = new RepDetector(CFG);
  expect(d.process(emptyPose(), 0)).toEqual([]);
});

test('positionAcquired после удержания позиции 1 секунду', () => {
  const d = new RepDetector(CFG);
  expect(feed(d, 170, 0)).toEqual([]);
  expect(feed(d, 170, 500)).toEqual([]);
  expect(feed(d, 170, 1000)).toEqual(['positionAcquired']);
});

test('полный цикл вниз-вверх — один repCounted', () => {
  const d = new RepDetector(CFG);
  feed(d, 170, 0);
  feed(d, 170, 1000);
  expect(feed(d, 80, 1400)).toEqual([]);
  expect(feed(d, 170, 2200)).toEqual(['repCounted']);
});

test('дрожание угла между порогами не считается повтором', () => {
  const d = new RepDetector(CFG);
  feed(d, 170, 0);
  feed(d, 170, 1000);
  feed(d, 120, 1400);
  feed(d, 150, 1800);
  feed(d, 120, 2200);
  expect(feed(d, 170, 2600)).toEqual([]);
});

test('слишком быстрый повтор игнорируется', () => {
  const d = new RepDetector(CFG);
  feed(d, 170, 0);
  feed(d, 170, 1000);
  feed(d, 80, 1400);
  expect(feed(d, 170, 2200)).toEqual(['repCounted']);
  feed(d, 80, 2300);
  expect(feed(d, 170, 2400)).toEqual([]); // 200 мс после прошлого повтора
  feed(d, 80, 2600);
  expect(feed(d, 170, 3000)).toEqual(['repCounted']); // 800 мс — уже честно
});

test('потеря позиции даёт positionLost, возврат — заново positionAcquired', () => {
  const d = new RepDetector(CFG);
  feed(d, 170, 0);
  feed(d, 170, 1000);
  expect(d.process(emptyPose(), 1500)).toEqual(['positionLost']);
  expect(feed(d, 170, 2000)).toEqual([]);
  expect(feed(d, 170, 3000)).toEqual(['positionAcquired']);
});

test('потеря во время удержания не даёт positionLost', () => {
  const d = new RepDetector(CFG);
  feed(d, 170, 0);
  expect(d.process(emptyPose(), 500)).toEqual([]);
});

test('запястья выше плеч — не упор лёжа', () => {
  const d = new RepDetector(CFG);
  const p = armPose(170);
  p[KP.leftWrist] = {...p[KP.leftWrist], y: 0.1};
  p[KP.rightWrist] = {...p[KP.rightWrist], y: 0.1};
  expect(d.process(p, 0)).toEqual([]);
  expect(d.process(p, 1500)).toEqual([]);
});
```

- [ ] **Step 3: Убедиться, что тесты падают**

```bash
cd /home/keliorw/Projects/Job/push-ups-rpg/push-up-rpg/app
npm test -- RepDetector
```

Expected: FAIL — `Cannot find module '../src/pose/RepDetector'`.

- [ ] **Step 4: Реализация**

Создать `app/src/pose/RepDetector.ts`:

```ts
import {DEFAULT_CONFIG, DetectorConfig} from './config';
import {angleDeg} from './geometry';
import {KP, Pose} from './types';

export type DetectorEvent = 'positionAcquired' | 'positionLost' | 'repCounted';

type State = 'noPosition' | 'holding' | 'up' | 'down';

const ARMS = [
  {shoulder: KP.leftShoulder, elbow: KP.leftElbow, wrist: KP.leftWrist},
  {shoulder: KP.rightShoulder, elbow: KP.rightElbow, wrist: KP.rightWrist},
] as const;

export class RepDetector {
  private state: State = 'noPosition';
  private holdStartMs = 0;
  private lastRepMs = Number.NEGATIVE_INFINITY;
  private smoothedAngle: number | null = null;

  constructor(private readonly cfg: DetectorConfig = DEFAULT_CONFIG) {}

  process(pose: Pose, tMs: number): DetectorEvent[] {
    const angle = this.meanElbowAngle(pose);
    if (angle === null) {
      return this.dropPosition();
    }
    this.smoothedAngle =
      this.smoothedAngle === null
        ? angle
        : this.cfg.angleSmoothing * angle +
          (1 - this.cfg.angleSmoothing) * this.smoothedAngle;
    const a = this.smoothedAngle;

    switch (this.state) {
      case 'noPosition':
        this.state = 'holding';
        this.holdStartMs = tMs;
        return [];
      case 'holding':
        if (tMs - this.holdStartMs >= this.cfg.positionHoldMs) {
          this.state = 'up';
          return ['positionAcquired'];
        }
        return [];
      case 'up':
        if (a <= this.cfg.elbowFlexedDeg) {
          this.state = 'down';
        }
        return [];
      case 'down':
        if (a >= this.cfg.elbowExtendedDeg) {
          this.state = 'up';
          if (tMs - this.lastRepMs >= this.cfg.minRepDurationMs) {
            this.lastRepMs = tMs;
            return ['repCounted'];
          }
        }
        return [];
    }
  }

  private dropPosition(): DetectorEvent[] {
    const wasAcquired = this.state === 'up' || this.state === 'down';
    this.state = 'noPosition';
    this.smoothedAngle = null;
    return wasAcquired ? ['positionLost'] : [];
  }

  /**
   * Средний угол в локтях по рукам, у которых плечо, локоть и запястье
   * видны (score выше порога) и запястье ниже плеча в кадре.
   * null — пользователь не в положении для отжиманий.
   */
  private meanElbowAngle(pose: Pose): number | null {
    const min = this.cfg.minKeypointScore;
    const angles: number[] = [];
    for (const arm of ARMS) {
      const s = pose[arm.shoulder];
      const e = pose[arm.elbow];
      const w = pose[arm.wrist];
      if (!s || !e || !w) {
        continue;
      }
      if (s.score < min || e.score < min || w.score < min) {
        continue;
      }
      if (w.y <= s.y) {
        continue;
      }
      angles.push(angleDeg(s, e, w));
    }
    if (angles.length === 0) {
      return null;
    }
    return angles.reduce((sum, v) => sum + v, 0) / angles.length;
  }
}
```

- [ ] **Step 5: Убедиться, что тесты проходят**

```bash
npm test -- RepDetector
```

Expected: PASS, 8 тестов.

- [ ] **Step 6: Commit**

```bash
cd /home/keliorw/Projects/Job/push-ups-rpg/push-up-rpg
git add app/src/pose app/__tests__/RepDetector.test.ts
git commit -m "feat: rep detector state machine with hysteresis" -- app/src/pose app/__tests__/RepDetector.test.ts
```

---

### Task 5: Состояние сессии и хук useWorkoutSession

**Files:**
- Create: `app/src/session/sessionState.ts`
- Create: `app/src/session/useWorkoutSession.ts`
- Test: `app/__tests__/sessionState.test.ts`

**Interfaces:**
- Consumes: `RepDetector`, `DetectorEvent` из `../pose/RepDetector`; `Pose` из `../pose/types`; ассет `../assets/beep.wav` (Task 2)
- Produces:
  - `interface SessionState { reps: number; inPosition: boolean }`, `INITIAL_SESSION`
  - `applyEvent(s: SessionState, e: DetectorEvent): SessionState`
  - `useWorkoutSession(): { reps: number; inPosition: boolean; onPose: (pose: Pose) => void }`

- [ ] **Step 1: Написать падающий тест на applyEvent**

Создать `app/__tests__/sessionState.test.ts`:

```ts
import {applyEvent, INITIAL_SESSION} from '../src/session/sessionState';

test('начальное состояние — ноль повторов, вне позиции', () => {
  expect(INITIAL_SESSION).toEqual({reps: 0, inPosition: false});
});

test('repCounted увеличивает счёт', () => {
  expect(applyEvent({reps: 2, inPosition: true}, 'repCounted')).toEqual({
    reps: 3,
    inPosition: true,
  });
});

test('positionAcquired и positionLost переключают inPosition', () => {
  const acquired = applyEvent(INITIAL_SESSION, 'positionAcquired');
  expect(acquired.inPosition).toBe(true);
  expect(applyEvent(acquired, 'positionLost').inPosition).toBe(false);
});
```

- [ ] **Step 2: Убедиться, что тест падает**

```bash
cd /home/keliorw/Projects/Job/push-ups-rpg/push-up-rpg/app
npm test -- sessionState
```

Expected: FAIL — `Cannot find module '../src/session/sessionState'`.

- [ ] **Step 3: Реализация sessionState**

Создать `app/src/session/sessionState.ts`:

```ts
import {DetectorEvent} from '../pose/RepDetector';

export interface SessionState {
  reps: number;
  inPosition: boolean;
}

export const INITIAL_SESSION: SessionState = {reps: 0, inPosition: false};

export function applyEvent(s: SessionState, e: DetectorEvent): SessionState {
  switch (e) {
    case 'repCounted':
      return {...s, reps: s.reps + 1};
    case 'positionAcquired':
      return {...s, inPosition: true};
    case 'positionLost':
      return {...s, inPosition: false};
  }
}
```

- [ ] **Step 4: Убедиться, что тесты проходят**

```bash
npm test -- sessionState
```

Expected: PASS, 3 теста.

- [ ] **Step 5: Хук useWorkoutSession**

Создать `app/src/session/useWorkoutSession.ts` (логика — в протестированных RepDetector/applyEvent, хук только склеивает, поэтому отдельного юнит-теста нет):

```ts
import {useCallback, useRef, useState} from 'react';
import SoundPlayer from 'react-native-sound-player';
import {RepDetector} from '../pose/RepDetector';
import {Pose} from '../pose/types';
import {applyEvent, INITIAL_SESSION, SessionState} from './sessionState';

const BEEP = require('../assets/beep.wav');

export function useWorkoutSession() {
  const [session, setSession] = useState<SessionState>(INITIAL_SESSION);
  const detectorRef = useRef<RepDetector | null>(null);
  if (detectorRef.current === null) {
    detectorRef.current = new RepDetector();
  }

  const onPose = useCallback((pose: Pose) => {
    const events = detectorRef.current!.process(pose, Date.now());
    if (events.length === 0) {
      return;
    }
    setSession(s => events.reduce(applyEvent, s));
    if (events.includes('repCounted')) {
      try {
        SoundPlayer.playAsset(BEEP);
      } catch {
        // звук не критичен — счёт важнее
      }
    }
  }, []);

  return {reps: session.reps, inPosition: session.inPosition, onPose};
}
```

- [ ] **Step 6: Проверить типы и все тесты**

```bash
npx tsc --noEmit
npm test
```

Expected: tsc без ошибок; все тесты PASS.

- [ ] **Step 7: Commit**

```bash
cd /home/keliorw/Projects/Job/push-ups-rpg/push-up-rpg
git add app/src/session app/__tests__/sessionState.test.ts
git commit -m "feat: workout session state and hook" -- app/src/session app/__tests__/sessionState.test.ts
```

---

### Task 6: Стартовый экран и переключение экранов

**Files:**
- Create: `app/src/screens/StartScreen.tsx`
- Modify: `app/App.tsx` (полная замена)
- Delete: `app/__tests__/App.test.tsx`
- Test: `app/__tests__/StartScreen.test.tsx`

**Interfaces:**
- Consumes: —
- Produces:
  - `StartScreen({onStart}: {onStart: () => void})`
  - `App` рендерит StartScreen, по нажатию START переключается на `WorkoutScreen` из `./src/screens/WorkoutScreen` с пропсом `onExit: () => void` (реализуется в Task 7)

- [ ] **Step 1: Написать падающий тест**

Создать `app/__tests__/StartScreen.test.tsx`:

```tsx
import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import {StartScreen} from '../src/screens/StartScreen';

test('кнопка START вызывает onStart', () => {
  const onStart = jest.fn();
  let tree!: ReactTestRenderer.ReactTestRenderer;
  ReactTestRenderer.act(() => {
    tree = ReactTestRenderer.create(<StartScreen onStart={onStart} />);
  });
  const button = tree.root.findAllByProps({accessibilityRole: 'button'})[0];
  ReactTestRenderer.act(() => {
    button.props.onPress();
  });
  expect(onStart).toHaveBeenCalledTimes(1);
});
```

- [ ] **Step 2: Убедиться, что тест падает**

```bash
cd /home/keliorw/Projects/Job/push-ups-rpg/push-up-rpg/app
npm test -- StartScreen
```

Expected: FAIL — `Cannot find module '../src/screens/StartScreen'`.

- [ ] **Step 3: Реализация StartScreen**

Создать `app/src/screens/StartScreen.tsx`:

```tsx
import React from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';

export function StartScreen({onStart}: {onStart: () => void}) {
  return (
    <View style={styles.root}>
      <Text style={styles.title}>Push-Ups RPG</Text>
      <Pressable
        accessibilityRole="button"
        style={styles.button}
        onPress={onStart}>
        <Text style={styles.buttonText}>START</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#101828',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 48,
  },
  title: {color: '#FFFFFF', fontSize: 32, fontWeight: '800'},
  button: {
    backgroundColor: '#F5A623',
    paddingHorizontal: 64,
    paddingVertical: 20,
    borderRadius: 40,
  },
  buttonText: {
    color: '#101828',
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: 2,
  },
});
```

- [ ] **Step 4: Убедиться, что тест проходит**

```bash
npm test -- StartScreen
```

Expected: PASS.

- [ ] **Step 5: App.tsx — переключение экранов**

Заменить содержимое `app/App.tsx`:

```tsx
import React, {useState} from 'react';
import {StatusBar} from 'react-native';
import {StartScreen} from './src/screens/StartScreen';
import {WorkoutScreen} from './src/screens/WorkoutScreen';

export default function App() {
  const [screen, setScreen] = useState<'start' | 'workout'>('start');
  return (
    <>
      <StatusBar barStyle="light-content" />
      {screen === 'start' ? (
        <StartScreen onStart={() => setScreen('workout')} />
      ) : (
        <WorkoutScreen onExit={() => setScreen('start')} />
      )}
    </>
  );
}
```

Создать заглушку `app/src/screens/WorkoutScreen.tsx` (полная реализация — Task 7):

```tsx
import React from 'react';
import {StyleSheet, Text, View} from 'react-native';

export function WorkoutScreen({onExit: _onExit}: {onExit: () => void}) {
  return (
    <View style={styles.root}>
      <Text style={styles.text}>Workout — в разработке (Task 7)</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {color: '#FFF'},
});
```

- [ ] **Step 6: Удалить шаблонный App.test**

```bash
rm /home/keliorw/Projects/Job/push-ups-rpg/push-up-rpg/app/__tests__/App.test.tsx
```

Причина: после Task 7 `App` транзитивно импортирует нативные модули камеры, которые jest не загружает; поведение экранов покрывается их собственными тестами.

- [ ] **Step 7: Проверить типы и тесты**

```bash
cd /home/keliorw/Projects/Job/push-ups-rpg/push-up-rpg/app
npx tsc --noEmit
npm test
```

Expected: без ошибок, все тесты PASS.

- [ ] **Step 8: Commit**

```bash
cd /home/keliorw/Projects/Job/push-ups-rpg/push-up-rpg
git add app/App.tsx app/src/screens app/__tests__
git commit -m "feat: start screen and screen switching" -- app/App.tsx app/src/screens app/__tests__
```

---

### Task 7: Экран тренировки — камера, скелет, счётчик

**Files:**
- Modify: `app/src/screens/WorkoutScreen.tsx` (полная замена заглушки)

**Interfaces:**
- Consumes: `useWorkoutSession` (Task 5), `Pose`/`KP` (Task 3), модель и beep (Task 2), `WorkoutScreen({onExit})` контракт из Task 6
- Produces: готовый экран тренировки; юнит-тестов нет (worklets и нативная камера не работают в jest) — проверка на устройстве в Task 8

- [ ] **Step 1: Реализация WorkoutScreen**

Заменить содержимое `app/src/screens/WorkoutScreen.tsx`:

```tsx
import React, {useEffect} from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {
  Camera,
  useCameraDevice,
  useCameraPermission,
  useSkiaFrameProcessor,
} from 'react-native-vision-camera';
import {useTensorflowModel} from 'react-native-fast-tflite';
import {useResizePlugin} from 'vision-camera-resize-plugin';
import {PaintStyle, Skia} from '@shopify/react-native-skia';
import {useRunOnJS} from 'react-native-worklets-core';
import {useWorkoutSession} from '../session/useWorkoutSession';
import {Pose} from '../pose/types';

const MODEL_INPUT = 192; // вход MoveNet Lightning: 192x192 RGB uint8
const MIN_DRAW_SCORE = 0.3;
const UPPER_BODY_POINTS = 11; // MoveNet индексы 0–10: голова, плечи, локти, запястья

// Пары индексов, между которыми рисуются линии скелета.
const EDGES: Array<[number, number]> = [
  [5, 6], // плечи
  [5, 7],
  [7, 9], // левая рука
  [6, 8],
  [8, 10], // правая рука
  [0, 5],
  [0, 6], // голова → плечи
];

export function WorkoutScreen({onExit}: {onExit: () => void}) {
  const {hasPermission, requestPermission} = useCameraPermission();
  const device = useCameraDevice('front');
  const modelPlugin = useTensorflowModel(
    require('../assets/models/movenet_lightning_int8.tflite'),
  );
  const {resize} = useResizePlugin();
  const {reps, inPosition, onPose} = useWorkoutSession();

  useEffect(() => {
    if (!hasPermission) {
      requestPermission();
    }
  }, [hasPermission, requestPermission]);

  const onPoseJS = useRunOnJS(
    (pose: Pose) => {
      onPose(pose);
    },
    [onPose],
  );

  const model = modelPlugin.state === 'loaded' ? modelPlugin.model : undefined;

  const frameProcessor = useSkiaFrameProcessor(
    frame => {
      'worklet';
      frame.render();
      if (model == null) {
        return;
      }
      const resized = resize(frame, {
        scale: {width: MODEL_INPUT, height: MODEL_INPUT},
        pixelFormat: 'rgb',
        dataType: 'uint8',
      });
      // Выход MoveNet: [1,1,17,3] → 51 число, тройки (y, x, score) в 0..1.
      const output = model.runSync([resized])[0];
      const pose: Pose = [];
      for (let i = 0; i < UPPER_BODY_POINTS; i++) {
        pose.push({
          x: Number(output[i * 3 + 1]) * frame.width,
          y: Number(output[i * 3]) * frame.height,
          score: Number(output[i * 3 + 2]),
        });
      }

      const line = Skia.Paint();
      line.setColor(Skia.Color('#FFFFFF'));
      line.setStyle(PaintStyle.Stroke);
      line.setStrokeWidth(frame.width * 0.008);
      for (const [a, b] of EDGES) {
        if (pose[a].score < MIN_DRAW_SCORE || pose[b].score < MIN_DRAW_SCORE) {
          continue;
        }
        frame.drawLine(pose[a].x, pose[a].y, pose[b].x, pose[b].y, line);
      }
      const dot = Skia.Paint();
      dot.setColor(Skia.Color('#F5A623'));
      for (const p of pose) {
        if (p.score < MIN_DRAW_SCORE) {
          continue;
        }
        frame.drawCircle(p.x, p.y, frame.width * 0.012, dot);
      }

      onPoseJS(pose);
    },
    [model, onPoseJS, resize],
  );

  if (!hasPermission) {
    return (
      <View style={styles.center}>
        <Text style={styles.hint}>
          Нужен доступ к камере, чтобы считать отжимания
        </Text>
        <Pressable
          accessibilityRole="button"
          style={styles.smallButton}
          onPress={requestPermission}>
          <Text style={styles.smallButtonText}>Разрешить</Text>
        </Pressable>
      </View>
    );
  }
  if (device == null) {
    return (
      <View style={styles.center}>
        <Text style={styles.hint}>Фронтальная камера не найдена</Text>
      </View>
    );
  }
  if (modelPlugin.state === 'error') {
    return (
      <View style={styles.center}>
        <Text style={styles.hint}>
          Не удалось загрузить модель распознавания. Перезапустите приложение.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <Camera
        style={StyleSheet.absoluteFill}
        device={device}
        isActive={true}
        frameProcessor={frameProcessor}
      />
      <View style={styles.counterWrap} pointerEvents="none">
        <Text style={styles.counter}>{reps}</Text>
        {!inPosition && <Text style={styles.hint}>Займите упор лёжа</Text>}
      </View>
      <Pressable accessibilityRole="button" style={styles.exit} onPress={onExit}>
        <Text style={styles.exitText}>✕</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {flex: 1, backgroundColor: '#000'},
  center: {
    flex: 1,
    backgroundColor: '#101828',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
    padding: 24,
  },
  counterWrap: {
    position: 'absolute',
    top: 64,
    left: 0,
    right: 0,
    alignItems: 'center',
    gap: 8,
  },
  counter: {
    color: '#F5A623',
    fontSize: 96,
    fontWeight: '900',
    textShadowColor: '#000000',
    textShadowRadius: 8,
  },
  hint: {
    color: '#FFFFFF',
    fontSize: 18,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    overflow: 'hidden',
    textAlign: 'center',
  },
  smallButton: {
    backgroundColor: '#F5A623',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 24,
  },
  smallButtonText: {color: '#101828', fontSize: 18, fontWeight: '800'},
  exit: {
    position: 'absolute',
    top: 64,
    right: 24,
    backgroundColor: 'rgba(0,0,0,0.5)',
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  exitText: {color: '#FFFFFF', fontSize: 20},
});
```

- [ ] **Step 2: Проверить типы, тесты, сборку**

```bash
cd /home/keliorw/Projects/Job/push-ups-rpg/push-up-rpg/app
npx tsc --noEmit
npm test
cd android && ./gradlew assembleDebug
```

Expected: tsc чисто, тесты PASS, `BUILD SUCCESSFUL`. Если tsc ругается на типы `useSkiaFrameProcessor`/`useRunOnJS` — проверить, что установлены свежие мажорные версии vision-camera (v4+) и worklets-core (v1+), и свериться с актуальной документацией vision-camera по Skia Frame Processors — API мог переименоваться.

- [ ] **Step 3: Commit**

```bash
cd /home/keliorw/Projects/Job/push-ups-rpg/push-up-rpg
git add app/src/screens/WorkoutScreen.tsx
git commit -m "feat: workout screen with camera, skeleton overlay and rep counter" -- app/src/screens/WorkoutScreen.tsx
```

---

### Task 8: Проверка на устройстве и тюнинг порогов

**Files:**
- Modify (по результатам): `app/src/pose/config.ts`
- Modify (если потребуется ориентация): `app/src/screens/WorkoutScreen.tsx`

**Interfaces:**
- Consumes: всё предыдущее
- Produces: подтверждённо работающее приложение на физическом Android-устройстве

- [ ] **Step 1: Запуск на устройстве**

Нужен физический Android-телефон по USB с включённой отладкой (эмулятор не годится — нет реальной камеры и производительности).

```bash
cd /home/keliorw/Projects/Job/push-ups-rpg/push-up-rpg/app
adb devices        # устройство должно быть в списке
npm run android
```

Expected: приложение установилось, открылся стартовый экран с кнопкой START.

- [ ] **Step 2: Чек-лист ручной проверки**

Пройти по пунктам, телефон положить на пол перед собой экраном вверх (как в спеке):

1. START → системный запрос камеры → превью фронтальной камеры.
2. Помахать рукой перед камерой — скелет (точки + линии) следует за движением без заметной задержки и совпадает с телом на экране.
3. Встать в упор лёжа — через ~1 с подсказка «Займите упор лёжа» исчезает.
4. Сделать 5 отжиманий — счётчик показывает 5, на каждый повтор — звуковой сигнал.
5. Сделать «половинчатое» сгибание (чуть согнуть локти) — счётчик не растёт.
6. Встать и выйти из кадра — подсказка вернулась; вернуться в упор — счёт продолжается с прежнего значения.
7. ✕ — возврат на стартовый экран; повторный START — счётчик снова с нуля.

- [ ] **Step 3: Известные проблемы и что делать**

- **Скелет повёрнут на 90° или зеркален относительно тела.** Кадры с сенсора могут приходить в ландшафтной ориентации. Исправление: в frame processor учесть `frame.orientation` и при необходимости поменять местами x/y (`x' = y * frame.width / frame.height`-стиль ремапа) до отрисовки и до отправки в `onPoseJS`. Сверяться с актуальной документацией vision-camera → «Frame orientation».
- **Повторы не засчитываются или двоятся.** Крутить только `app/src/pose/config.ts`: `elbowExtendedDeg` вниз (например 145), `elbowFlexedDeg` вверх (например 105), `angleSmoothing` вниз (0.3) при дрожании. После каждого изменения — перезапуск и повтор пунктов 4–5 чек-листа.
- **Низкий FPS / телефон греется.** Снизить частоту инференса: пропускать кадры (запускать модель на каждом втором кадре, скелет рисовать по последней позе).
- **`useSkiaFrameProcessor` падает на конкретном устройстве.** Запасной план из спеки: обычный `useFrameProcessor` + отдельный Skia `<Canvas>` поверх превью, координаты передавать через shared value; см. документацию vision-camera и worklets-core.

- [ ] **Step 4: Финальные проверки и коммит тюнинга**

```bash
cd /home/keliorw/Projects/Job/push-ups-rpg/push-up-rpg/app
npx tsc --noEmit && npm test
cd /home/keliorw/Projects/Job/push-ups-rpg/push-up-rpg
git add app/src
git commit -m "fix: tune detector thresholds after on-device testing" -- app/src
```

Expected: тесты PASS; коммит только если были изменения после тюнинга.
