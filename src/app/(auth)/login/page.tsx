// src/app/(auth)/login/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiLogin } from '@/features/auth/api';
import { setTokens } from '@/lib/auth';
import {getErrorMessage} from "@/lib/errors";
import { setSession } from '@/lib/auth';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [err, setErr] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const router = useRouter();






    async function onSubmit(e: React.FormEvent) {
        e.preventDefault();
        setErr(null); setLoading(true);
        try {
            const res = await apiLogin({ email, password });
            const userId = res.userId;
            setSession({
                access: res.access_token!,
                refresh: res.refresh_token!,
                userId: userId ? String(userId) : undefined,
            });
            router.replace('/');
        } catch (e) {
            setErr(getErrorMessage(e));

        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="min-h-dvh grid place-items-center p-6">
            <form onSubmit={onSubmit} className="w-full max-w-sm space-y-3 rounded-xl border p-6 bg-white/5">
                <h1 className="text-2xl font-semibold">Вход в Emplacc</h1>
                <input
                    className="w-full rounded-md px-3 py-2 text-black"
                    type="email"
                    placeholder="email"
                    value={email}
                    onChange={(e)=>setEmail(e.target.value)}
                    required
                />
                <input
                    className="w-full rounded-md px-3 py-2 text-black"
                    type="password"
                    placeholder="пароль"
                    value={password}
                    onChange={(e)=>setPassword(e.target.value)}
                    required
                />
                <button
                    disabled={loading}
                    className="w-full rounded-md px-3 py-2 bg-emerald-600 hover:bg-emerald-500"
                    type="submit"
                >
                    {loading ? 'Входим…' : 'Войти'}
                </button>
                <SSOButton/>
                {err && <div className="text-red-300 text-sm">{err}</div>}
            </form>
        </div>
    );
}

function SSOButton() {
    // Сформируй значения из env по необходимости
    const authUrl = process.env.NEXT_PUBLIC_KEYCLOAK_AUTH_URL;
    const clientId = process.env.NEXT_PUBLIC_KEYCLOAK_CLIENT_ID;
    const redirectUri = typeof window !== 'undefined' ? window.location.origin + '/callback' : '';
    const realm = process.env.NEXT_PUBLIC_KEYCLOAK_REALM;
    if (!authUrl || !clientId || !realm) return null;
    const url = `${authUrl}/realms/${realm}/protocol/openid-connect/auth?response_type=code&client_id=${encodeURIComponent(clientId)}&redirect_uri=${encodeURIComponent(redirectUri)}`;
    return (
        <a href={url} className="mt-3 inline-block w-full text-center rounded-md px-3 py-2 bg-indigo-600 hover:bg-indigo-500">
            Войти через Keycloak
        </a>
    );
}
