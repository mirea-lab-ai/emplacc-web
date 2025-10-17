// src/app/(auth)/login/page.tsx
'use client';

import { Logo } from '@/components/ui/Logo';
import { generateCodeChallenge, generateCodeVerifier, generateState, saveAuthState } from '@/lib/pkce';

export default function LoginPage() {
    return (
        <div className="min-h-dvh grid place-items-center p-6">
            <div className="w-full max-w-sm space-y-6 rounded-xl border border-white/10 bg-white/5 p-6 text-slate-100 backdrop-blur">
                <Logo variant="colored" className="mx-auto h-12 w-auto" />
                <h1 className="text-2xl font-semibold">Вход в Emplacc</h1>
                <p className="text-sm text-slate-300">
                    Войти можно только через корпоративную учётную запись Keycloak.
                </p>
                <SSOButton/>
            </div>
        </div>
    );
}

function SSOButton() {
    const authUrl = process.env.NEXT_PUBLIC_KEYCLOAK_AUTH_URL;
    const clientId = process.env.NEXT_PUBLIC_KEYCLOAK_CLIENT_ID;
    const redirectUri = typeof window !== 'undefined' ? `${window.location.origin}/callback` : '';
    const realm = process.env.NEXT_PUBLIC_KEYCLOAK_REALM;

    if (!authUrl || !clientId || !realm) {
        return (
            <div className="rounded-lg border border-amber-400/30 bg-amber-500/10 p-3 text-sm text-amber-200">
                Настройте переменные окружения Keycloak, чтобы включить вход.
            </div>
        );
    }

    const safeAuthUrl = authUrl!;
    const safeClientId = clientId!;
    const safeRealm = realm!;

    async function goSSO() {
        const verifier = generateCodeVerifier();
        const challenge = await generateCodeChallenge(verifier);
        const state = generateState();
        saveAuthState(verifier, state);
        const url = `${safeAuthUrl}/realms/${safeRealm}/protocol/openid-connect/auth?response_type=code&client_id=${encodeURIComponent(safeClientId)}&redirect_uri=${encodeURIComponent(redirectUri)}&code_challenge=${encodeURIComponent(challenge)}&code_challenge_method=S256&state=${encodeURIComponent(state)}`;
        window.location.href = url;
    }

    return (
        <button
            type="button"
            onClick={goSSO}
            className="mt-3 inline-block w-full rounded-md bg-indigo-600 px-3 py-2 text-center hover:bg-indigo-500"
        >
            Войти через Keycloak
        </button>
    );
}
