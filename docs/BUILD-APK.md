# Сборка APK

EAS/Expo здесь **не подходит**: React Native 0.86 новее, чем поддерживает Expo
(`install-expo-modules` отказывается — нет совместимого Expo SDK под RN 0.86).
Голому RN Expo не нужен — собираем нативно (gradle), либо локально, либо в облаке.

## Вариант A — GitHub Actions (рекомендуется, ничего не ставить локально)

Сборка идёт на серверах GitHub (там уже есть Android SDK), тебе на диск ничего
ставить не надо — качаешь готовый `.apk` файлом. Подходит, когда мало места на
компе. Работает и с приватным репозиторием (есть бесплатный лимит минут; одна
сборка ~10–20 мин).

Workflow уже в репо: `.github/workflows/android-apk.yml`. Как запустить:
1. Открой репозиторий на github.com → вкладка **Actions**.
   (Если Actions выключены — включи: Settings → Actions → General → Allow all.)
2. Слева выбери **Build Android APK** → кнопка **Run workflow** →
   выбери ветку `push-ups-tracking-mvp` → **Run workflow**.
3. Дождись зелёной галочки (~10–20 мин). Открой завершённый запуск →
   внизу блок **Artifacts** → скачай **pushupsrpg-release-apk** (это zip,
   внутри `app-release.apk`).
4. Перекинь `.apk` на телефон, установи (разреши установку из неизвестных
   источников). Это standalone-сборка, подписана debug-ключом — ставится и
   работает без компьютера.

Если сборка упадёт (стек свежий: vision-camera v5 / Nitro / NDK 27) — в том же
запуске будет артефакт **gradle-build-logs** и лог шага «Build release APK».
Пришли мне ошибку из лога — поправим версии в workflow.

## Вариант B — локально (Android Studio)

Голому RN Expo не нужен — собираем нативно через Android Studio / gradle.
Требует ~несколько ГБ на диске (Android Studio + SDK + NDK).

## Что поставить (один раз)
1. **Android Studio** (https://developer.android.com/studio) — ставит Android SDK.
2. В нём **SDK Manager** → поставить: Android SDK Platform (API 34+), Build-Tools,
   **NDK (Side by side)** и **CMake** — нужны для нативных модулей
   (vision-camera v5/Nitro, reanimated, skia).
3. **JDK 17** — Android Studio обычно приносит свой JDK (Gradle его подхватит).
4. Переменные окружения (если собираешь из терминала), напр. в `~/.zshrc`:
   ```
   export ANDROID_HOME="$HOME/Android/Sdk"
   export PATH="$PATH:$ANDROID_HOME/platform-tools"
   ```

## Установить зависимости проекта
```
cd app
npm install
```

## Вариант 1 — быстрый тест на телефоне (проще всего)
Телефон по USB, включена «Отладка по USB».
```
cd app
npx react-native run-android
```
Соберёт debug-версию, поставит на телефон и запустит (JS отдаёт Metro-сервер —
он поднимется сам). Хорошо для итераций. Это не отдельный .apk «для раздачи».

Через GUI: открой папку `app/android` в Android Studio, дождись Gradle sync,
подключи телефон, нажми **Run ▶**.

## Вариант 2 — отдельный .apk для установки (standalone)
Через Android Studio (проще всего, мастер сам создаст ключ):
**Build → Generate Signed App Bundle / APK → APK → Create new… (keystore) →
release → Finish.** Studio покажет путь к готовому `app-release.apk` — это
самодостаточный файл, ставится на любой телефон (разреши установку из
неизвестных источников).

Через терминал (нужен release-keystore и signingConfig в
`android/app/build.gradle`):
```
cd app/android
./gradlew assembleRelease
# APK: app/android/app/build/outputs/apk/release/app-release.apk
```
(`assembleDebug` даст debug-apk, но он рассчитан на запущенный Metro, поэтому
для «поставил и играешь без компьютера» бери release.)

## Первый билд — ожидаемые грабли
Стек нативный и свежий (vision-camera v5 / Nitro / New Architecture). Первый
`assembleRelease` может потребовать:
- доустановить NDK/CMake нужной версии через SDK Manager (лог укажет версию);
- иногда — `cd android && ./gradlew clean` перед повторной сборкой;
- прочитать сообщение gradle и поправить версию инструмента, на которую он ругается.
Это ожидаемо для bleeding-edge RN; смотри лог сборки.

## Проверка на устройстве
После установки APK: START → карта → узел 1 → карточка → тренировка (камера,
отжимания) → победа → следующий монстр. Прогресс сохраняется. Босс 8 — отдых 3 мин.
