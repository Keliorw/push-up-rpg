# Дизайн: порт игрового лупа в React Native + сборка APK (EAS)

Дата: 2026-07-03
Статус: на ревью
Ветка: push-ups-tracking-mvp

## Контекст

Игровой луп (карта → карточка врага → бой → победа → продвижение) сейчас
реализован только в браузерном прототипе `web-game/` — своя вёрстка на
HTML/canvas поверх общего чистого-TS ядра. Нативное RN-приложение `app/`
содержит лишь экраны старта и детектора отжиманий (`WorkoutScreen`).

Причина такого разделения: камерный стек (`react-native-vision-camera` v5,
`react-native-fast-tflite`, `@shopify/react-native-skia`) — **нативный, без веб-
версии**, поэтому один RN-код не может работать и в APK, и в браузере с камерой.
Логика (детектор + игровое ядро) — общий TypeScript, дублирования нет.

Эта задача: **написать нативные RN-экраны игры** поверх готового ядра и ассетов,
чтобы игра целиком попала в APK, и **собрать APK через облачный EAS Build**
(на машине нет Android SDK).

## Скоуп

- Контент — локации 1–3 (12 монстров), как в вебе. Боссы 4–10 — вне скоупа.
- Лимита «1 бой в день» нет (решение пользователя): играть можно подряд.
- Платформа сборки — Android APK через EAS (iOS вне скоупа).
- Навигация — простая state-машина (без react-navigation, YAGNI).

## Переиспользуется без изменений

- `app/src/game/*` — `LOCATIONS`, `MONSTER_SEQUENCE`, `NODE_POSITIONS`,
  `Progression`/`currentMonster`/`defeatMonster`/`isGameComplete`,
  автомат боя `newWorkout`/`onRep`/`totalTarget`/`WorkoutState`/`WorkoutEvent`.
- `app/src/pose/*` — `RepDetector`, `DEFAULT_CONFIG`, `Pose`/`KP`.
- Камерная обвязка текущего `WorkoutScreen` (frame processor + скелет-оверлей) —
  переиспользуется как основа боевого экрана.

## Архитектура

Навигация — состояние в `app/App.tsx`:
`'start' | 'map' | 'card' | 'battle' | 'victory'` + текущий `Progression`.
Экраны получают колбэки (как `StartScreen` сейчас), без глобального роутера.

Экраны (`app/src/screens/`):
- **StartScreen** (есть) — кнопка START ведёт теперь на `map` (а не сразу в бой).
- **MapScreen** (новый) — `<Image source={require(map)}>` в контейнере с
  `onLayout` (узнаём пиксельный размер); поверх — `Pressable`-маркеры по
  `NODE_POSITIONS[i]` (доля × размер), классификация done/current/locked как в
  вебе; тап по текущему узлу → `card`.
- **CardScreen** (новый) — `<Image>` карточки текущего монстра, норма
  (миньон `N` / босс `sets×N`), HP-бар (полный), кнопка «Начать тренировку» → `battle`,
  кнопка «Назад» → `map`.
- **BattleScreen** (расширение `WorkoutScreen`) — камера + скелет (как сейчас) +
  боевой HUD (см. ниже) + привязка к автомату боя.
- **VictoryScreen** (новый) — «Повержен!», имя монстра, «На карту» → `map`.

## Боевой экран (BattleScreen)

Берёт текущего монстра из `currentMonster(progression)`. На каждый засчитанный
повтор `RepDetector` вызывает `onRep(state, monster)`:
- обновляет счётчик/HP; `setComplete` → экран отдыха (`restBetweenSetsSec`,
  для локаций 1–3 = 0 → сразу дальше); `monsterDefeated` → трек победы → `victory`.
HUD в стиле референса (как в web-game):
- слева сверху — **таймер уровня** (mm:ss, идёт с начала боя, стоп на победе);
- по центру сверху — карточка монстра (`<Image>` + имя);
- под ней — **HP-бар** с текстом «X / Y HP» (Y = `totalTarget`, X = остаток);
- справа сверху — крестик выхода → `map` (камера останавливается);
- снизу по центру — крупный золотой круг-счётчик повторов;
- для босса — индикатор «Сет i/N».
Звук: урон по мобу на каждом повторе; трек победы при `monsterDefeated`.

## Ассеты, звук, сохранение

- **Ассеты** — копируются в `app/src/assets/games/` (карта `map.png`, 12 карточек
  в `1/…`,`2/…`,`3/…`, `hit.mp3`, `victory.mp3`), подключаются через `require()`.
  Так как `Monster.cardImage` — строка-путь, а RN `require` статичен, заводим
  явный реестр `app/src/assets/cardImages.ts`: `Record<cardImage, ImageSource>`
  (карта id/пути → `require(...)`). Проверить, что metro отдаёт `mp3`
  (при необходимости добавить в `assetExts`, рядом с уже добавленным `tflite`).
- **Звук** — `react-native-sound-player` (уже в зависимостях), через
  `SoundPlayer.playAsset(require(...))`, как beep в `useWorkoutSession`.
- **Сохранение** — `@react-native-async-storage/async-storage` (новая зависимость).
  Игровое ядро остаётся storage-agnostic; в `app/src/storage/progressionStore.ts`
  — `loadProgression()`/`saveProgression(p)` поверх AsyncStorage. `App.tsx`
  загружает прогресс при старте, сохраняет после каждой победы.

## Сборка APK через EAS

- Добавить `eas.json` с профилем `preview` (Android `buildType: apk`), при
  необходимости — пакет `expo` и `expo-modules-autolinking` для bare-RN prebuild,
  и `cli.appVersionSource`.
- Пользователь: `npm i -g eas-cli` (или npx), `eas login`,
  `eas build -p android --profile preview` → готовый `.apk` по ссылке.
- **Риск:** нативная сборка стека v5 (Nitro/worklets/reanimated/skia/tflite) в
  окружении EAS ни разу не проверялась — возможны правки версий/конфигов и
  несколько итераций сборки. Тест на устройстве — за пользователем.

## Структура файлов

- Новое: `app/src/screens/MapScreen.tsx`, `CardScreen.tsx`, `VictoryScreen.tsx`;
  `app/src/assets/cardImages.ts`; `app/src/assets/games/**`;
  `app/src/storage/progressionStore.ts`; `eas.json`.
- Изменяется: `app/App.tsx` (навигация + прогресс), `app/src/screens/StartScreen.tsx`
  (START → map), `app/src/screens/WorkoutScreen.tsx` → боевой экран (принимает
  монстра, автомат, HUD), `app/package.json` (AsyncStorage, возможно expo/eas),
  `app/metro.config.js` (mp3 при необходимости).

## Тестирование

- Игровое ядро — Jest (уже 34/34; не меняется).
- Новый чистый юнит: `progressionStore` — тест с моком AsyncStorage
  (load возвращает дефолт при пустом/битом, round-trip save→load).
- RN-экраны — `tsc --noEmit` чисто; визуально и на устройстве — через APK
  (сборку/запуск здесь проверить нельзя). `web-game` остаётся браузерным
  тестером общей логики.

## Вне скоупа

- Боссы 4–10 и их контент.
- iOS-сборка.
- react-navigation, суточный лимит, онлайн-функции.

## Допущения и риски

- EAS соберёт bare-RN проект с нативными модулями New Arch; точная конфигурация
  уточняется в плане, возможны итерации из-за v5.
- `NODE_POSITIONS` откалиброваны под картинку карты; в RN используются те же доли.
- Metro по умолчанию отдаёт `mp3`; если нет — добавляется в `assetExts`.
