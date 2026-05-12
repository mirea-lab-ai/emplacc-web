'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { saveSession, type Session } from '@/lib/auth';
import { readAndClearAuthState } from '@/lib/pkce';
import { getKeycloakConfig, getApiBaseUrl } from '@/lib/publicEnv';

function CallbackContent() {
  const router = useRouter();
  const params = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const code = params.get('code');
    if (!code) { setError('Missing code in URL'); return; }

    (async () => {
      try {
        const { verifier, state } = readAndClearAuthState();
        if (!verifier || !state || params.get('state') !== state) {
          throw new Error('State mismatch — попробуйте войти заново');
        }

        const redirectUri = `${window.location.origin}/callback`;

        // 1. Обмениваем code на Keycloak-токен
        const keycloakToken = await exchangeCode(code, redirectUri, verifier);

        // 2. Отправляем Keycloak-токен на наш API → получаем sess_* токен
        const session = await createSession(keycloakToken);

        // 3. Сохраняем нашу сессию
        saveSession(session);

        router.replace('/');
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error('OAuth callback error:', msg);
        setError(msg);
      }
    })();
  }, [params, router]);

  if (error) {
    return (
      <div className="min-h-dvh grid place-items-center p-6 text-white">
        <div className="max-w-md text-center space-y-4">
          <div className="text-4xl">⚠️</div>
          <h2 className="text-xl font-semibold text-red-300">Ошибка входа</h2>
          <p className="text-sm text-slate-400 font-mono bg-white/5 rounded-lg px-4 py-3">{error}</p>
          <a href="/login" className="btn-primary inline-flex mx-auto">← Вернуться к входу</a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh grid place-items-center p-6 text-white">
      <div className="flex items-center gap-3 text-slate-300">
        <span className="inline-block h-5 w-5 border-2 border-emerald-400/30 border-t-emerald-400 rounded-full animate-spin-slow"/>
        Завершаем вход…
      </div>
    </div>
  );
}

async function exchangeCode(code: string, redirectUri: string, verifier: string): Promise<string> {
  const { authUrl, realm, clientId } = getKeycloakConfig();
  const r = await fetch(`${authUrl}/realms/${realm}/protocol/openid-connect/token`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type:    'authorization_code',
      code,
      redirect_uri:  redirectUri,
      client_id:     clientId,
      code_verifier: verifier,
    }),
  });
  if (!r.ok) throw new Error(`Keycloak error ${r.status}`);
  const j = await r.json();
  if (!j.access_token) throw new Error('No Keycloak token received');
  return j.access_token as string;
}

async function createSession(keycloakToken: string): Promise<Session> {
  const r = await fetch(`${getApiBaseUrl()}/auth/session`, {
    method:  'POST',
    headers: { Authorization: `Bearer ${keycloakToken}` },
  });
  if (!r.ok) {
    const body = await r.text().catch(() => '');
    throw new Error(`Session create failed ${r.status}: ${body}`);
  }
  return r.json() as Promise<Session>;
}

export default function OAuthCallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-dvh grid place-items-center p-6 text-white">
        <div className="flex items-center gap-3 text-slate-300">
          <span className="inline-block h-5 w-5 border-2 border-emerald-400/30 border-t-emerald-400 rounded-full animate-spin-slow"/>
          Загружаем…
        </div>
      </div>
    }>
      <CallbackContent />
    </Suspense>
  );
}
