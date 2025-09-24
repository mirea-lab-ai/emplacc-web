'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { apiValidate } from '@/features/auth/api';
import { setSession, clearTokens } from '@/lib/auth';

export default function OAuthCallbackPage() {
    const router = useRouter();
    const params = useSearchParams();
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const code = params.get('code');
        const redirectUri = window.location.origin + '/callback';
        if (!code) {
            setError('Missing code');
            return;
        }
        (async () => {
            try {
                const { access_token, refresh_token } = await exchangeCodeForTokens(code, redirectUri);
                setSession({ access: access_token!, refresh: refresh_token! });
                await apiValidate();
                router.replace('/');
            } catch (e) {
                setError('OAuth failed');
                clearTokens();
            }
        })();
    }, [params, router]);

    return (
        <div className="min-h-dvh grid place-items-center p-6 text-white">
            <div>Завершаем вход… {error && <span className="text-red-300">{error}</span>}</div>
        </div>
    );
}

async function exchangeCodeForTokens(code: string, redirectUri: string): Promise<{ access_token: string; refresh_token: string }> {
    const KC_BASE = process.env.NEXT_PUBLIC_KEYCLOAK_AUTH_URL!.replace(/\/+$/, '');
    const REALM = process.env.NEXT_PUBLIC_KEYCLOAK_REALM!;
    const CLIENT_ID = process.env.NEXT_PUBLIC_KEYCLOAK_CLIENT_ID!;
    const tokenEndpoint = `${KC_BASE}/realms/${REALM}/protocol/openid-connect/token`;

    const params = new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
        client_id: CLIENT_ID,
        // Если используется PKCE, добавь code_verifier
    });

    const r = await fetch(tokenEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params,
    });
    if (!r.ok) throw new Error('Token exchange failed');
    const json = await r.json();
    if (!json.access_token || !json.refresh_token) throw new Error('Missing tokens');
    return { access_token: json.access_token as string, refresh_token: json.refresh_token as string };
}


