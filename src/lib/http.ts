// src/lib/http.ts
import { getAccessToken, getRefreshToken, setTokens, clearTokens } from '@/lib/auth';
import { getApiBaseUrl, getKeycloakConfig } from '@/lib/publicEnv';

// чтобы параллельные запросы не дергали refresh одновременно
let refreshing: Promise<void> | null = null;

async function doFetch(path: string, init: RequestInit = {}) {
    const access = getAccessToken();
    return fetch(getApiBaseUrl() + path, {
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
    const { authUrl, realm, clientId } = getKeycloakConfig();

    const tokenEndpoint = `${authUrl}/realms/${realm}/protocol/openid-connect/token`;
    const body = new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refresh,
        client_id: clientId,
    });
    const r = await fetch(tokenEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body,
    });

    if (!r.ok) {
        clearTokens();
        return;
    }

    const j = (await r.json()) as RefreshResponse & { access_token?: string; refresh_token?: string };

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
        const detail = await extractErrorMessage(res.clone());
        throw new Error(`HTTP ${res.status}: ${detail}`);
    }
    return res.json() as Promise<T>;
}

// Публичный помощник для ручного обновления access токена (используется в guard)
export async function refreshAccessTokenPublic(): Promise<boolean> {
    const before = getAccessToken();
    await refreshAccessToken();
    const after = getAccessToken();
    return !!after && after !== before;
}

export async function extractErrorMessage(res: Response): Promise<string> {
    const contentType = res.headers.get('content-type')?.toLowerCase() ?? '';

    if (contentType.includes('application/json')) {
        try {
            const data = await res.json();
            if (typeof data === 'string' && data.trim()) {
                return data;
            }
            if (data && typeof data === 'object') {
                const maybeMessage =
                    (data as { message?: unknown }).message
                    ?? (data as { error?: unknown }).error
                    ?? (data as { detail?: unknown }).detail;

                if (typeof maybeMessage === 'string' && maybeMessage.trim()) {
                    return maybeMessage;
                }

                if (Array.isArray((data as { errors?: unknown }).errors)) {
                    const joined = (data as { errors: unknown[] }).errors
                        .map((item) => {
                            if (typeof item === 'string') return item;
                            if (item && typeof item === 'object' && 'message' in item) {
                                const value = (item as { message?: unknown }).message;
                                if (typeof value === 'string') return value;
                            }
                            try {
                                return JSON.stringify(item);
                            } catch {
                                return String(item);
                            }
                        })
                        .filter(Boolean)
                        .join('\n');

                    if (joined.trim()) {
                        return joined;
                    }
                }

                try {
                    const serialized = JSON.stringify(data);
                    if (serialized && serialized !== '{}') {
                        return serialized;
                    }
                } catch {}
            }
        } catch (jsonError) {
            // Попробуем fallback на текст, если JSON разобрать не удалось
            const text = await tryReadText(res);
            if (text) return text;
            return String(jsonError instanceof Error ? jsonError.message : jsonError ?? `HTTP ${res.status}`);
        }
    }

    const text = await tryReadText(res);
    return text || `HTTP ${res.status}`;
}

async function tryReadText(res: Response): Promise<string> {
    try {
        const text = await res.text();
        return text.trim();
    } catch {
        return '';
    }
}
