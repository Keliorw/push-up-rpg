# Дизайн: кнопка рейтинга на карте (модалка)

Дата: 2026-07-06 · web-game

## Задача
На экране карты уровней (`#screen-map`) добавить кнопку в правом верхнем углу,
открывающую рейтинг игроков. Рейтинг показывается **модалкой поверх карты** и
закрывается по крестику (а также по клику на затемнённый фон и по `Esc`).

## Решения
- **Вид кнопки:** кастомная иконка-медальон `games/rating.png` (золотой кубок в
  лавровом венке на каменном медальоне, прозрачный фон), 56×56, image-кнопка —
  зеркально существующей кнопке «назад» (`#map-back`) слева.
- **Охват:** модалка **только с карты**. Кнопка Arena в главном меню оставлена
  как есть — полноэкранный `#screen-arena` со ссылкой «← В меню».

## Реализация

**`web-game/index.html`**
- В `#map-wrap` — `<button id="map-rating" aria-label="Рейтинг">🏆</button>`;
  CSS `#map-rating` (позиция/круг/`:active{scale(.93)}`).
- Оверлей модалки в конце `#app`:
  `#arena-modal` (`position:fixed; inset:0; z-index:30`, затемнение) →
  `#arena-modal-panel` (панель max-width 480, max-height 85vh, скролл) →
  `#arena-modal-close` (✕), заголовок «Рейтинг», `#arena-modal-list`.
  Переиспользуются глобальные стили строк `.arena-row/.rank/.who/.xp/.me`.

**`web-game/src/arena-screen.ts`**
- Общий `renderLeaderboard(listEl, uid)` (загрузка топ-50 + сортировка + рендер
  строк + пустой/ошибка) — извлечён из текущего `openArena`.
- `openArena(uid)` (меню, полноэкранный) — вызывает общий рендер в `#arena-list`.
- `openArenaModal(uid)` — показать `#arena-modal` + рендер в `#arena-modal-list`.
- `closeArenaModal()` — скрыть оверлей (`hidden`).

**`web-game/src/main.ts`**
- `#map-rating` click → `openArenaModal(currentUser?.uid ?? null)`.
- `#arena-modal-close` click → `closeArenaModal()`.
- Клик по фону оверлея (`e.target === overlay`) и `Escape` → `closeArenaModal()`.

**Сборка:** пересобрать `web-game/app.js` (esbuild, `--external:'https://*'`).

## Тестирование
Чистой логики нет (разметка + проводка событий) — новые unit-тесты не нужны.
Проверка: app jest 44/44, web-game `node --test` sync+nickname 10/10 не ломаются;
`app.js` пересобран.

## Вне скоупа
RN-версия (там лидерборда нет); превращение меню-Arena в модалку.
