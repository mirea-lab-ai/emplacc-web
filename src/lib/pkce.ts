// Client-side PKCE helpers for Keycloak SSO

function toBase64Url(bytes: Uint8Array): string {
    let binary = '';
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
    const base64 = typeof btoa === 'function' ? btoa(binary) : Buffer.from(binary, 'binary').toString('base64');
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

export function generateCodeVerifier(length = 64): string {
    const l = Math.max(43, Math.min(128, length));
    const bytes = new Uint8Array(l);
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
        crypto.getRandomValues(bytes);
    } else {
        // fallback for non-browser; should not happen on client
        const nodeCrypto = require('crypto');
        const buf: Buffer = nodeCrypto.randomBytes(l);
        for (let i = 0; i < l; i++) bytes[i] = buf[i];
    }
    return toBase64Url(bytes);
}

export async function generateCodeChallenge(verifier: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(verifier);
    const digest = await crypto.subtle.digest('SHA-256', data);
    return toBase64Url(new Uint8Array(digest));
}

export function generateState(length = 32): string {
    return generateCodeVerifier(length);
}

const KEY_VERIFIER = 'kc_pkce_verifier';
const KEY_STATE = 'kc_oauth_state';

export function saveAuthState(verifier: string, state: string) {
    try {
        sessionStorage.setItem(KEY_VERIFIER, verifier);
        sessionStorage.setItem(KEY_STATE, state);
    } catch {}
}

export function readAndClearAuthState(): { verifier: string | null; state: string | null } {
    let verifier: string | null = null;
    let state: string | null = null;
    try {
        verifier = sessionStorage.getItem(KEY_VERIFIER);
        state = sessionStorage.getItem(KEY_STATE);
        sessionStorage.removeItem(KEY_VERIFIER);
        sessionStorage.removeItem(KEY_STATE);
    } catch {}
    return { verifier, state };
}


