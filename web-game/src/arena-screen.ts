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

/** Грузит топ-50, до-сортировывает по XP и рендерит строки в переданный контейнер. */
async function renderLeaderboard(list: HTMLElement, currentUid: string | null): Promise<void> {
  list.textContent = 'Загрузка…';
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

/** Полноэкранный экран Арены (из главного меню). */
export async function openArena(currentUid: string | null): Promise<void> {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById('screen-arena')!.classList.add('active');
  await renderLeaderboard(document.getElementById('arena-list')!, currentUid);
}

/** Рейтинг модалкой поверх текущего экрана (с карты). */
export async function openArenaModal(currentUid: string | null): Promise<void> {
  (document.getElementById('arena-modal') as HTMLElement).hidden = false;
  await renderLeaderboard(document.getElementById('arena-modal-list')!, currentUid);
}

/** Закрыть модалку рейтинга. */
export function closeArenaModal(): void {
  (document.getElementById('arena-modal') as HTMLElement).hidden = true;
}
