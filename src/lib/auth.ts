// src/lib/auth.ts
// Новая стратегия: sess_* — наши сессионные токены, emplacc_* — MCP

export type Session = {
  session_token: string;
  expires_at: string;
  absolute_expires_at: string;
  user_id: string;
};

const KEYS = {
  token:             'sess_token',
  expiresAt:         'sess_expires_at',
  absoluteExpiresAt: 'sess_absolute_expires_at',
  userId:            'sess_user_id',
} as const;

// ── Геттеры ─────────────────────────────────────────────────
export function getSessionToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(KEYS.token);
}

export function getAccessToken(): string | null {
  return getSessionToken();
}

export function getUserId(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(KEYS.userId);
}

export function getExpiresAt(): Date | null {
  if (typeof window === 'undefined') return null;
  const s = localStorage.getItem(KEYS.expiresAt);
  return s ? new Date(s) : null;
}

export function getAbsoluteExpiresAt(): Date | null {
  if (typeof window === 'undefined') return null;
  const s = localStorage.getItem(KEYS.absoluteExpiresAt);
  return s ? new Date(s) : null;
}

// ── Сеттеры ─────────────────────────────────────────────────
export function saveSession(session: Session) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(KEYS.token,             session.session_token);
  localStorage.setItem(KEYS.expiresAt,         session.expires_at);
  localStorage.setItem(KEYS.absoluteExpiresAt, session.absolute_expires_at);
  localStorage.setItem(KEYS.userId,            session.user_id);
  // Сигнал для realtime (SSE), чтобы переподключиться с новым токеном после
  // логина/ротации в этой же вкладке (storage-событие тут не срабатывает).
  try { window.dispatchEvent(new Event('emplacc:token')); } catch {}
}

export function updateSessionExpiry(expiresAt: string) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(KEYS.expiresAt, expiresAt);
}

export function clearSession() {
  if (typeof window === 'undefined') return;
  Object.values(KEYS).forEach(k => localStorage.removeItem(k));
}

// ── Проверки ─────────────────────────────────────────────────
export function isAuthed(): boolean {
  return !!getSessionToken();
}

/** Токен истёк по короткому сроку (нужна ротация) */
export function isSessionExpired(): boolean {
  const exp = getExpiresAt();
  return exp ? exp < new Date() : true;
}

/** Токен истёк по абсолютному сроку (нужен реологин) */
export function isSessionAbsolutelyExpired(): boolean {
  const abs = getAbsoluteExpiresAt();
  return abs ? abs < new Date() : true;
}

// ── Совместимость (старые места где используются старые функции) ──
export function clearTokens() { clearSession(); }
export function getRefreshToken() { return null; }
export function setTokens(_a: string, _b: string) {}
export function setSession(args: { access: string; refresh: string; userId?: string }) {
  // Старый формат — игнорируем, новый flow через saveSession
  if (args.userId) localStorage.setItem(KEYS.userId, args.userId);
}
export function setUserId(id: string) {
  localStorage.setItem(KEYS.userId, id);
}
