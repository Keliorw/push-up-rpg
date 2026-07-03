# web-game — играбельный прототип

Прототип игрового лупа (карта → карточка → тренировка → победа) на общем ядре
`app/src/game/*` и детекторе `app/src/pose/*`. НЕ боевое приложение.

## Запуск
Нужны интернет (CDN: TF.js + Firebase) и веб-камера. Камера/`getUserMedia`
работает только в secure context — на `localhost` или по HTTPS (GitHub Pages):
```
cd web-game
python3 -m http.server 8081
```
Открой http://localhost:8081/ . При первом входе — регистрация (логин + пароль);
прогресс сохраняется в аккаунт и синхронизируется между устройствами.

Требуется настроенный проект Firebase (Auth Email/Password + Firestore) и
заполненный `web-game/src/firebase.ts`. Подробности —
`docs/superpowers/plans/2026-07-03-web-accounts-cloud-progress.md` (Task 0).

## Пересборка после правок
```
cd ..   # корень репозитория
npx --yes esbuild web-game/src/main.ts --bundle --format=esm --outfile=web-game/app.js --external:'https://*'
```
Флаг `--external:'https://*'` оставляет CDN-импорты (Firebase) внешними — сборка
без `npm install`.

## Тесты (чистая логика)
```
node --test web-game/src/sync.test.ts web-game/src/nickname.test.ts
```

Внизу есть DEV-панель (сбросить день/прогресс, перейти к монстру) — правило
«1 бой в день» иначе не протестировать.
