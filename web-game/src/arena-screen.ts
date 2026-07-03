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
