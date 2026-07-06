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
