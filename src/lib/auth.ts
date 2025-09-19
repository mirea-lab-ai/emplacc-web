// src/lib/auth.ts
export type TokenSupplier = () => string | null;

let supplier: TokenSupplier = () =>
    (typeof window !== 'undefined' ? localStorage.getItem('access') : null);

export const setTokenSupplier = (fn: TokenSupplier) => (supplier = fn);
export const getAccessToken = () => supplier();

export const getRefreshToken = () =>
    (typeof window !== 'undefined' ? localStorage.getItem('refresh') : null);

export function getUserId(): string | null {
    return typeof window !== 'undefined' ? localStorage.getItem('userId') : null;
}

export function setTokens(access: string, refresh: string) {
    if (typeof window === 'undefined') return;
    localStorage.setItem('access', access);
    localStorage.setItem('refresh', refresh);
}

export function setUserId(userId: string) {
    if (typeof window === 'undefined') return;
    localStorage.setItem('userId', userId);
}

// удобно вызывать из логина
export function setSession(args: { access: string; refresh: string; userId?: string }) {
    setTokens(args.access, args.refresh);
    if (args.userId) setUserId(args.userId);
}

export function clearTokens() {
    if (typeof window === 'undefined') return;
    localStorage.removeItem('access');
    localStorage.removeItem('refresh');
    localStorage.removeItem('userId');
}

export function isAuthed() {
    return !!getAccessToken();
}
