import {
  Progression,
  currentMonster,
  defeatMonster,
} from '../../app/src/game/progression';
import {todayISO} from './dates';
import {loadProgression, saveProgression} from './storage';
import {renderMap} from './map';
import {renderCard} from './card';
import {startWorkout} from './workout-screen';
import {onUser, logout, GameUser} from './auth';
import {loadRemote, saveRemote} from './remote-storage';
import {mergeProfile, Profile} from './sync';
import {loadTotalReps, saveTotalReps} from './storage';
import {initAuthScreen, revealAuthForm} from './auth-screen';
import {openXpRatingModal, closeArenaModal} from './arena-screen';
import {loadBestArena, saveBestArena} from './storage';
import {openArenaLobby, showArenaPreview, initArenaLobby} from './arena-lobby';
import {ensureDetector} from './pose-model';

export type ScreenId =
  | 'screen-auth'
  | 'screen-loading'
  | 'screen-start'
  | 'screen-map'
  | 'screen-card'
  | 'screen-workout'
  | 'screen-victory'
  | 'screen-arena-lobby'
  | 'screen-arena-result';

export interface App {
  progression: Progression;
  totalReps: number;
  bestArena: number;
  show(id: ScreenId): void;
  render(): void;
  goCard(): void;
  goWorkout(): void;
  goArenaBattle(): void;
  addRep(): void; // +1 XP за отжимание (локально)
  persistProfile(): void; // синхронизировать профиль (прогресс+XP) в Firestore
  onDefeated(): void; // called by the workout screen on monster defeat
  currentUid(): string | null;
}

function show(id: ScreenId): void {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id)!.classList.add('active');
}

// Трек победы (играет на экране «Повержен!», останавливается при выходе на карту).
let victorySound: HTMLAudioElement | null = null;
function playVictory(): void {
  stopVictory();
  victorySound = new Audio('./games/victory.mp3');
  victorySound.volume = 0.8;
  victorySound.play().catch(() => {
    // автоплей может быть заблокирован — не критично
  });
}
function stopVictory(): void {
  if (victorySound) {
    victorySound.pause();
    victorySound = null;
  }
}

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

const app: App = {
  progression: loadProgression(),
  totalReps: loadTotalReps(),
  bestArena: loadBestArena(),
  show,
  render() {
    renderMap(this);
  },
  goCard() {
    renderCard(this);
    const startBtn = document.getElementById('card-start-btn') as HTMLButtonElement;
    const backBtn = document.getElementById('card-back-btn') as HTMLButtonElement;
    const startSpan = startBtn.querySelector('span') as HTMLElement;
    startSpan.textContent = 'Начать тренировку';
    startBtn.onclick = () => this.goWorkout();
    backBtn.onclick = () => {
      this.render();
      this.show('screen-map');
    };
    this.show('screen-card');
  },
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
  addRep() {
    this.totalReps += 1;
    saveTotalReps(this.totalReps);
  },
  persistProfile() {
    if (!currentUser) return;
    const profile: Profile = {
      progression: this.progression,
      totalReps: this.totalReps,
      bestArena: this.bestArena,
    };
    saveRemote(currentUser.uid, profile, currentUser.nickname).catch(showSyncWarning);
  },
  currentUid() {
    return currentUser ? currentUser.uid : null;
  },
  goArenaBattle() {
    // реализуется в Task 7 (arena-battle)
  },
  onDefeated() {
    const m = currentMonster(this.progression);
    this.progression = defeatMonster(this.progression, todayISO());
    saveProgression(this.progression);
    this.persistProfile();
    (document.getElementById('victory-name') as HTMLElement).textContent = m ? m.name : '';
    const next = currentMonster(this.progression);
    (document.getElementById('victory-next') as HTMLElement).style.display = next ? '' : 'none';
    show('screen-victory');
    playVictory();
  },
};

// MAIN MENU: «Кампания» -> карта (как раньше START).
document.getElementById('btn-campaign')!.addEventListener('click', () => {
  app.render();
  show('screen-map');
});

// MAIN MENU: «Arena» -> лобби арены
document.getElementById('btn-arena')!.addEventListener('click', () => openArenaLobby(app));
document.getElementById('loading-back')!.addEventListener('click', () => show('screen-start'));
initArenaLobby(app);

// Анимированный фон меню: статичная картинка -> видео, когда догрузится.
// Бесшовный цикл через два ролика (double-buffer): пока играет активный,
// второй уже стоит на кадре 0 (декодирован), и на стыке эстафета передаётся
// мгновенно — без перемотки к 0, которая на нативном loop даёт микро-фриз.
// Видео muted/playsinline, pointer-events:none, без контролов и паузы.
const menuVids = [
  document.getElementById('menu-bg-video'),
  document.getElementById('menu-bg-video-b'),
].filter(Boolean) as HTMLVideoElement[];
if (menuVids.length === 2) {
  let active = 0;
  const advance = () => {
    const incoming = menuVids[active ^ 1]; // уже на кадре 0 и декодирован
    const outgoing = menuVids[active];
    incoming.classList.add('ready');
    void incoming.play().catch(() => {});
    outgoing.classList.remove('ready');
    active ^= 1;
    // Готовим ушедший ролик к следующему показу заранее, пока он скрыт.
    outgoing.pause();
    outgoing.currentTime = 0;
  };
  menuVids.forEach(v => {
    v.loop = false;
    v.addEventListener('ended', advance);
  });
  const first = menuVids[0];
  // Проявляем видео, как только оно РЕАЛЬНО пошло. На мобильных браузерах
  // canplaythrough часто не срабатывает (нет предзагрузки), поэтому ловим
  // 'playing' / первый 'timeupdate' — они наступают, когда кадры уже идут.
  const reveal = () => first.classList.add('ready');
  first.addEventListener('playing', reveal, {once: true});
  first.addEventListener('timeupdate', reveal, {once: true});
  // Пытаемся запустить сразу (muted-видео можно проигрывать программно).
  const tryPlay = () => {
    void first.play().catch(() => {});
  };
  tryPlay();
  // Запасной вариант для мобильных: если автоплей заблокирован политикой,
  // стартуем по первому касанию/клику пользователя.
  const kick = () => tryPlay();
  document.addEventListener('touchstart', kick, {once: true, passive: true});
  document.addEventListener('click', kick, {once: true});
}
// VICTORY: сразу к следующему монстру (его превью) или выйти на карту.
document.getElementById('victory-next')!.addEventListener('click', () => {
  stopVictory();
  app.render(); // обновить прогресс на карте (на фоне)
  app.goCard(); // превью следующего монстра
});
document.getElementById('victory-map')!.addEventListener('click', () => {
  stopVictory();
  app.render();
  show('screen-map');
});
// MAP: возврат в главное меню
document.getElementById('map-back')!.addEventListener('click', () => show('screen-start'));

// MAP: рейтинг модалкой (правый верхний угол). Закрытие — крестик / фон / Esc.
document.getElementById('map-rating')!.addEventListener('click', () => {
  void openXpRatingModal(currentUser ? currentUser.uid : null);
});
const arenaModal = document.getElementById('arena-modal')!;
document.getElementById('arena-modal-close')!.addEventListener('click', closeArenaModal);
arenaModal.addEventListener('click', e => {
  if (e.target === arenaModal) closeArenaModal();
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && !(arenaModal as HTMLElement).hidden) closeArenaModal();
});

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
  const local: Profile = {
    progression: loadProgression(),
    totalReps: loadTotalReps(),
    bestArena: loadBestArena(),
  };
  let remote: Profile | null = null;
  try {
    remote = await loadRemote(user.uid);
  } catch {
    showSyncWarning();
  }
  const merged = remote ? mergeProfile(local, remote) : local;
  app.progression = merged.progression;
  app.totalReps = merged.totalReps;
  app.bestArena = merged.bestArena;
  saveProgression(merged.progression);
  saveTotalReps(merged.totalReps);
  saveBestArena(merged.bestArena);
  saveRemote(user.uid, merged, user.nickname).catch(showSyncWarning);
  showAccountChip(user.nickname);
  show('screen-start');
  // Предзагружаем MoveNet в фоне, чтобы к началу боя модель была готова.
  void ensureDetector().catch(() => {});
});
