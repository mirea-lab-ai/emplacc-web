// src/app/(auth)/login/page.tsx
'use client';

import { useState } from 'react';
import { Logo } from '@/components/ui/Logo';
import { BRAND_NAME, IS_HSE } from '@/lib/brand';
import { generateCodeChallenge, generateCodeVerifier, generateState, saveAuthState } from '@/lib/pkce';

const FEATURES = [
  { icon: '⚡', title: 'Задачи и проекты', desc: 'Kanban-доски, статусы, дедлайны' },
  { icon: '📋', title: 'Ежедневные отчёты', desc: 'Планы, выполненные задачи, AI-улучшение' },
  { icon: '👥', title: 'Команды', desc: 'Управление составом, роли, специализации' },
  { icon: '💬', title: 'Форум проблем', desc: 'Обсуждения, помощь, прозрачность' },
];

export default function LoginPage() {
  return (
    <div className="h-dvh w-full flex overflow-hidden">
      {/* ── Left panel — Branding ── */}
      <div className="hidden lg:flex lg:w-[55%] xl:w-[60%] flex-col h-full p-14 relative overflow-hidden">
        {/* Ambient */}
        <div className="pointer-events-none absolute -top-40 -left-40 h-[700px] w-[700px] rounded-full bg-emerald-500/8 blur-[100px]" />
        <div className="pointer-events-none absolute top-1/2 right-0 -translate-y-1/2 h-[500px] w-[500px] rounded-full bg-lime-400/5 blur-[80px]" />

        {/* Logo */}
        <div className="relative z-10 flex items-center gap-3">
          {IS_HSE ? (
            <span aria-hidden className="h-9 w-9 rounded-[5px]" style={{ background: 'linear-gradient(135deg,var(--accent-start),var(--accent-end))' }} />
          ) : (
            <Logo variant="colored" className="h-9 w-auto" />
          )}
          <span className="t-accent-text text-2xl font-bold tracking-tight">{BRAND_NAME}</span>
        </div>

        {/* Main content — vertically centred */}
        <div className="relative z-10 flex-1 flex flex-col justify-center space-y-10 max-w-xl">
          <div>
            <h1 className="t-display text-app mb-5 leading-[1.08]">
              Всё рабочее —<br />
              <span className="t-accent-text">в одном месте</span>
            </h1>
            <p className="text-app-2 text-lg leading-relaxed max-w-md">
              Управляйте командами, проектами и отчётами без хаоса в мессенджерах.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {FEATURES.map(f => (
              <div key={f.title} className="stat-card">
                <div className="text-xl mb-2">{f.icon}</div>
                <div className="font-semibold text-app text-sm">{f.title}</div>
                <div className="t-caption mt-0.5">{f.desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="relative z-10 t-caption">
          © {new Date().getFullYear()} {BRAND_NAME} · Корпоративная платформа
        </div>
      </div>

      {/* ── Right panel — Login ── */}
      <div className="flex-1 h-full flex items-center justify-center p-6 lg:p-12 relative">
        {/* Subtle separator */}
        <div className="hidden lg:block absolute left-0 top-8 bottom-8 w-px bg-app-hover" />

        <div className="w-full max-w-[340px] space-y-7">
          {/* Mobile logo */}
          <div className="flex items-center gap-3 lg:hidden">
            {IS_HSE ? (
            <span aria-hidden className="h-9 w-9 rounded-[5px]" style={{ background: 'linear-gradient(135deg,var(--accent-start),var(--accent-end))' }} />
          ) : (
            <Logo variant="colored" className="h-9 w-auto" />
          )}
            <span className="t-accent-text text-2xl font-bold">{BRAND_NAME}</span>
          </div>

          <div className="t-surface-elevated rounded-2xl p-8 space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-app">Добро пожаловать</h2>
              <p className="t-body mt-1">Войдите через корпоративный аккаунт</p>
            </div>
            <div className="t-divider" />
            <SSOButton />
            <p className="text-center t-caption leading-relaxed">
              Доступ предоставляется администратором.<br />
              При проблемах — IT-поддержка.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function SSOButton() {
  const [loading, setLoading] = useState(false);
  const authUrl  = process.env.NEXT_PUBLIC_KEYCLOAK_AUTH_URL;
  const clientId = process.env.NEXT_PUBLIC_KEYCLOAK_CLIENT_ID;
  const realm    = process.env.NEXT_PUBLIC_KEYCLOAK_REALM;
  const redirectUri = typeof window !== 'undefined' ? `${window.location.origin}/callback` : '';

  if (!authUrl || !clientId || !realm) {
    return (
      <div className="rounded-xl border border-amber-400/25 bg-amber-500/8 px-4 py-3 text-sm text-amber-200 text-center">
        ⚠ Keycloak не настроен
      </div>
    );
  }

  async function goSSO() {
    setLoading(true);
    const verifier  = generateCodeVerifier();
    const challenge = await generateCodeChallenge(verifier);
    const state     = generateState();
    saveAuthState(verifier, state);
    const url = `${authUrl}/realms/${realm}/protocol/openid-connect/auth` +
      `?response_type=code&client_id=${encodeURIComponent(clientId!)}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&code_challenge=${encodeURIComponent(challenge)}&code_challenge_method=S256` +
      `&state=${encodeURIComponent(state)}`;
    window.location.href = url;
  }

  return (
    <button
      type="button"
      onClick={goSSO}
      disabled={loading}
      className="btn-primary w-full py-3 text-base rounded-xl disabled:opacity-70"
    >
      {loading ? (
        <span className="flex items-center gap-2">
          <span className="inline-block h-4 w-4 border-2 border-black/30 border-t-black rounded-full animate-spin-slow" />
          Переходим…
        </span>
      ) : (
        <span className="flex items-center gap-2">
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/>
            <polyline points="10 17 15 12 10 7"/>
            <line x1="15" y1="12" x2="3" y2="12"/>
          </svg>
          Войти через Keycloak
        </span>
      )}
    </button>
  );
}
