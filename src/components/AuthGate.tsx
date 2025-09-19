// src/components/AuthGate.tsx
'use client';

import { isAuthed } from '@/lib/auth';
import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';

export default function AuthGate({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        if (!isAuthed() && pathname !== '/login') {
            router.replace('/login');
        }
    }, [pathname, router]);

    return <>{children}</>;
}
