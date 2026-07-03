const NICK_RE = /^[a-z0-9_-]{3,20}$/;
const EMAIL_DOMAIN = 'pushuprpg.app';

export function normalizeNick(raw: string): string {
  return raw.trim().toLowerCase();
}

/** null если ник валиден, иначе текст ошибки для показа пользователю. */
export function validateNick(raw: string): string | null {
  if (!NICK_RE.test(normalizeNick(raw))) {
    return 'Логин: 3–20 символов, только латиница, цифры, _ и -';
  }
  return null;
}

export function nickToEmail(raw: string): string {
  return `${normalizeNick(raw)}@${EMAIL_DOMAIN}`;
}
