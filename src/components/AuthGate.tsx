// src/components/AuthGate.tsx
'use client';

import { clearTokens, isAuthed } from '@/lib/auth';
import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { apiValidate } from '@/features/auth/api';
import { refreshAccessTokenPublic } from '@/lib/http';

export default function AuthGate({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();
    const [checking, setChecking] = useState(true);

    useEffect(() => {
        let cancelled = false;
        function allow() {
            if (!cancelled) setChecking(false);
        }
        async function guard() {
            if (pathname === '/login' || pathname === '/callback') {
                allow();
                return;
            }
            if (!isAuthed()) {
                router.replace('/login');
                return;
            }
            try {
                await apiValidate();
                allow();
                return;
            } catch {
                // попробуем один раз рефрешнуться и провалидировать снова, как в Flutter коде
                const refreshed = await refreshAccessTokenPublic();
                if (refreshed) {
                    try {
                        await apiValidate();
                        allow();
                        return;
                    } catch {}
                }
                if (cancelled) return;
                clearTokens();
                router.replace('/login');
            }
        }
        guard();
        return () => {
            cancelled = true;
        };
    }, [pathname, router]);

    if (checking) {
        return (
            <div className="grid min-h-dvh place-items-center px-6">
                <div className="text-sm text-slate-300">Проверяем авторизацию…</div>
            </div>
        );
    }

    return <>{children}</>;
}
