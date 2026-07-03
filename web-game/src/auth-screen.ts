import {register, login} from './auth';

type Mode = 'login' | 'register';
let mode: Mode = 'login';

function el<T extends HTMLElement = HTMLElement>(id: string): T {
  return document.getElementById(id) as T;
}

export function initAuthScreen(): void {
  const nick = el<HTMLInputElement>('auth-nick');
  const pass = el<HTMLInputElement>('auth-pass');
  const submit = el<HTMLButtonElement>('auth-submit');
  const err = el('auth-error');
  const toggle = el('auth-toggle');
  const title = el('auth-title');
  // Текст лежит в <span> кнопок-картинок (у них стилизуется именно span).
  const submitLabel = submit.querySelector('span') as HTMLElement;
  const toggleLabel = toggle.querySelector('span') as HTMLElement;

  function applyMode(): void {
    title.textContent = mode === 'login' ? 'Вход' : 'Регистрация';
    submitLabel.textContent = mode === 'login' ? 'Войти' : 'Создать';
    toggleLabel.textContent = mode === 'login' ? 'Регистрация' : 'Войти';
    err.textContent = '';
  }

  toggle.addEventListener('click', () => {
    mode = mode === 'login' ? 'register' : 'login';
    applyMode();
  });

  submit.addEventListener('click', async () => {
    err.textContent = '';
    submit.disabled = true;
    try {
      if (mode === 'register') await register(nick.value, pass.value);
      else await login(nick.value, pass.value);
      // Маршрутизацию выполнит onUser в main.ts.
    } catch (e) {
      err.textContent = (e as Error).message;
    } finally {
      submit.disabled = false;
    }
  });

  applyMode();
}

/** Прячет «Загрузка…» и показывает форму (когда сессии нет). */
export function revealAuthForm(): void {
  el('auth-loading').style.display = 'none';
  el('auth-form').style.display = 'block';
}
