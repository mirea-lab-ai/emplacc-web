// src/lib/http.ts
import { getSessionToken, saveSession, clearSession, updateSessionExpiry, type Session } from '@/lib/auth';
import { getApiBaseUrl, getKeycloakConfig } from '@/lib/publicEnv';

let rotating: Promise<boolean> | null = null;

// Уводим на логин, когда восстановить сессию не удалось. Без редиректа на самих
// страницах логина/коллбэка, чтобы не зациклиться.
function redirectToLogin() {
  if (typeof window === 'undefined') return;
  const p = window.location.pathname;
  if (p.startsWith('/login') || p.startsWith('/callback')) return;
  window.location.href = '/login';
}

async function doFetch(path: string, init: RequestInit = {}) {
  const token = getSessionToken();
  return fetch(getApiBaseUrl() + path, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.headers || {}),
    },
    cache: 'no-store',
  });
}

/**
 * Ротируем сессионный токен через наш API (не Keycloak).
 * Продлевает short-lived TTL, абсолютный срок не меняется.
 */
async function rotateSession(): Promise<boolean> {
  const token = getSessionToken();
  if (!token) return false;
  try {
    const res = await fetch(getApiBaseUrl() + '/auth/session/rotate', {
      method:  'POST',
      headers: { Authorization: `Bearer ${token}` },
      cache:   'no-store',
    });
    if (!res.ok) return false;
    const data: Session = await res.json();
    updateSessionExpiry(data.expires_at);
    return true;
  } catch {
    return false;
  }
}

export async function refreshAccessTokenPublic(): Promise<boolean> {
  return rotateSession();
}

/**
 * Базовый HTTP-запрос:
 * - при 401 с reason="" → ротируем сессию и повторяем
 * - при 401 с reason="user_exit" | "long_absence" → сбрасываем сессию
 */
export async function http(path: string, init: RequestInit = {}) {
  const res = await doFetch(path, init);
  if (res.status !== 401) return res;

  // Читаем причину
  let reason = '';
  try {
    const clone = res.clone();
    const body = await clone.json();
    reason = body?.reason ?? '';
  } catch {}

  // Принудительный выход или долгое отсутствие → очищаем сессию
  if (reason === 'user_exit' || reason === 'long_absence') {
    clearSession();
    return res;
  }

  // Обычное истечение → ротируем (один общий промис на все параллельные запросы)
  if (!rotating) {
    rotating = rotateSession().finally(() => { rotating = null; });
  }
  const rotated = await rotating;

  // Ротация не удалась — токен мёртв. Чистим сессию и уводим на логин,
  // иначе повтор с тем же токеном даёт бесконечные 401 и тихий сбой.
  if (!rotated || !getSessionToken()) {
    clearSession();
    redirectToLogin();
    return res;
  }

  return doFetch(path, init);
}

export async function httpJson<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await http(path, init);
  if (!res.ok) {
    const detail = await extractErrorMessage(res.clone());
    throw new Error(`HTTP ${res.status}: ${detail}`);
  }
  return res.json() as Promise<T>;
}

export async function extractErrorMessage(res: Response): Promise<string> {
  const ct = res.headers.get('content-type')?.toLowerCase() ?? '';
  if (ct.includes('application/json')) {
    try {
      const d = await res.json();
      if (typeof d === 'string') return d;
      if (d && typeof d === 'object') {
        const m = (d as any).message ?? (d as any).error ?? (d as any).detail;
        if (typeof m === 'string') return m;
      }
    } catch {}
  }
  try { return (await res.text()).trim() || `HTTP ${res.status}`; } catch {}
  return `HTTP ${res.status}`;
}

async function tryReadText(res: Response): Promise<string> {
  try { return (await res.text()).trim(); } catch { return ''; }
}
