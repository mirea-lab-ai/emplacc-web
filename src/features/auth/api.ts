// src/features/auth/api.ts
import { http } from '@/lib/http';
import type { components } from '@/types/openapi';


// Типы из openapi.d.ts (у тебя уже сгенерены)
type LoginReq   = components['schemas']['request.LoginRequest'];
type AuthResp   = components['schemas']['response.AuthResponse'];
type RefreshReq = components['schemas']['request.RefreshRequest'];
type RefreshResp= components['schemas']['response.RefreshResponse'];
export type UserInfo   = components['schemas']['response.UserInfo'];
type OAuthReq  = components['schemas']['request.OAuthRequest'];
export type TokenValidationResponse = components['schemas']['response.TokenValidationResponse'];

export async function apiLogin(payload: LoginReq): Promise<AuthRespStrict> {
    const r = await http('/auth/login', { method: 'POST', body: JSON.stringify(payload) });
    if (!r.ok) throw new Error('Login failed');

    const data = (await r.json()) as AuthResp;

    // Рантайм-проверка, чтобы отловить кривые ответы
    if (!data.access_token || !data.refresh_token) {
        throw new Error('Login response is missing tokens');
    }

    // Теперь типы жёсткие: токены обязательны
    return data as AuthRespStrict;
}

export async function apiRefresh(payload: RefreshReq): Promise<RefreshResp> {
    const r = await http('/auth/refresh', { method: 'POST', body: JSON.stringify(payload) });
    if (!r.ok) throw new Error('Refresh failed');
    return r.json();
}

export async function apiMe(): Promise<UserInfo> {
    const r = await http('/auth/me', { method: 'GET' });
    if (!r.ok) throw new Error('Unauthorized');
    return r.json();
}

export async function apiOauth(payload: OAuthReq): Promise<AuthRespStrict> {
    const r = await http('/auth/oauth', { method: 'POST', body: JSON.stringify(payload) });
    if (!r.ok) throw new Error('OAuth failed');
    const data = (await r.json()) as AuthResp;
    if (!data.access_token || !data.refresh_token) {
        throw new Error('OAuth response is missing tokens');
    }
    return data as AuthRespStrict;
}

export async function apiValidate(): Promise<TokenValidationResponse> {
    const r = await http('/auth/validate', { method: 'GET' });
    console.log('apiValidate');
    console.log(r);
    if (!r.ok) throw new Error('Token invalid');
    return r.json();
}

// В doc.json logout просит header Authorization = refresh token — странный контракт.
// Реализуем как в спеках.
export async function apiLogout(refreshToken: string): Promise<void> {
    const r = await fetch(process.env.NEXT_PUBLIC_API_BASE_URL!.replace(/\/+$/,'') + '/auth/logout', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            // Внимание: по спецификации "Authorization" содержит сам refresh токен:
            Authorization: refreshToken,
        },
    });
    if (!r.ok) throw new Error('Logout failed');
}
// src/features/auth/api.ts

type AuthRespStrict = AuthResp & {
    access_token: string;
    refresh_token: string;
};


