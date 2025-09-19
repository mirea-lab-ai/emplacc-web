// src/lib/http.ts
import { getAccessToken, getRefreshToken, setTokens, clearTokens } from '@/lib/auth';

const BASE = process.env.NEXT_PUBLIC_API_BASE_URL!.replace(/\/+$/, '');

// чтобы параллельные запросы не дергали refresh одновременно
let refreshing: Promise<void> | null = null;

async function doFetch(path: string, init: RequestInit = {}) {
    const access = getAccessToken();
    return fetch(BASE + path, {
        ...init,
        headers: {
            'Content-Type': 'application/json',
            ...(access ? { Authorization: `Bearer ${access}` } : {}),
            ...(init.headers || {}),
        },
        // credentials: 'include', // включай, если у вас куки; для Bearer не нужно
        cache: 'no-store',
    });
}

type RefreshResponse = {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    refresh_exp?: number;
    token_type?: string;
    expires_at?: string;
};

async function refreshAccessToken() {
    const refresh = getRefreshToken();
    if (!refresh) {
        clearTokens();
        return;
    }
    const r = await fetch(BASE + '/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refresh }),
    });

    if (!r.ok) {
        clearTokens();
        return;
    }

    const j = (await r.json()) as RefreshResponse;

    if (!j.access_token) {
        clearTokens();
        return;
    }
    // если вдруг refresh_token не прислали — оставим старый
    setTokens(j.access_token, j.refresh_token ?? refresh);
}

/**
 * Базовый HTTP-запрос:
 *  - подставляет Bearer
 *  - при 401 делает refresh и повторяет запрос
 *  - возвращает Response (как обычный fetch)
 */
export async function http(path: string, init: RequestInit = {}) {
    const res = await doFetch(path, init);
    if (res.status !== 401) return res;

    // один общий refresh на все параллельные запросы
    if (!refreshing) refreshing = refreshAccessToken().finally(() => (refreshing = null));
    await refreshing;

    return doFetch(path, init);
}

/**
 * Удобняшка: сразу парсит JSON и кидает Error при не-OK статусах.
 */
export async function httpJson<T>(path: string, init: RequestInit = {}): Promise<T> {
    const res = await http(path, init);
    if (!res.ok) {
        let detail: unknown;
        try { detail = await res.clone().json(); } catch { detail = await res.text().catch(() => undefined); }
        throw new Error(`HTTP ${res.status}: ${typeof detail === 'string' ? detail : JSON.stringify(detail)}`);
    }
    return res.json() as Promise<T>;
}
