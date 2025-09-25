// src/components/AuthGate.tsx
'use client';

import { clearTokens, isAuthed } from '@/lib/auth';
import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { apiValidate } from '@/features/auth/api';
import { refreshAccessTokenPublic } from '@/lib/http';

export default function AuthGate({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        let cancelled = false;
        async function guard() {
            if (pathname === '/login' || pathname === '/callback') return;
            if (!isAuthed()) {
                router.replace('/login');
                return;
            }
            try {
                await apiValidate();
            } catch {
                // попробуем один раз рефрешнуться и провалидировать снова, как в Flutter коде
                const refreshed = await refreshAccessTokenPublic();
                if (refreshed) {
                    try {
                        await apiValidate();
                        return; // все ок
                    } catch {}
                }
                if (cancelled) return;
                clearTokens();
                router.replace('/login');
            }
        }
        guard();
        return () => { cancelled = true; };
    }, [pathname, router]);

    return <>{children}</>;
}
