import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  setPersistence,
  browserLocalPersistence,
} from 'https://www.gstatic.com/firebasejs/12.15.0/firebase-auth.js';
import {auth} from './firebase';
import {nickToEmail, normalizeNick, validateNick} from './nickname';

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
    // Нормализованный ник: displayName должен побайтово совпадать с ником в
    // Firestore-доке (правило неизменяемости ника сравнивает строки строго,
    // и «Nick» ≠ «nick» молча отклоняет ВЕСЬ сейв профиля).
    await updateProfile(cred.user, {displayName: normalizeNick(rawNick)});
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
    if (!u) {
      cb(null);
      return;
    }
    // displayName может быть ещё не установлен в момент регистрации (гонка с
    // updateProfile), поэтому надёжный фолбэк — ник из технического e-mail,
    // который доступен сразу. Иначе в Firestore уйдёт пустой ник.
    // Нормализация обязательна: у старых аккаунтов displayName сохранён как
    // введён («Nick»), а в доке лежит ник из e-mail («nick») — несовпадение
    // нарушает правило неизменяемости ника и молча блокирует все сейвы.
    const nickname = normalizeNick(u.displayName || (u.email ? u.email.split('@')[0] : ''));
    cb({uid: u.uid, nickname});
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
