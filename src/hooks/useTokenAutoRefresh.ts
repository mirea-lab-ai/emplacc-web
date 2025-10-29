'use client';

import { useEffect } from 'react';
import { isAuthed } from '@/lib/auth';
import { refreshAccessTokenPublic } from '@/lib/http';

const TEN_MINUTES_MS = 10 * 60 * 1000;

export function useTokenAutoRefresh() {
    useEffect(() => {
        let running = false;
        const interval = setInterval(async () => {
            if (running) return;
            if (!isAuthed()) return;
            running = true;
            try {
                await refreshAccessTokenPublic();
            } catch (err) {
                console.warn('Не удалось обновить access токен', err);
            } finally {
                running = false;
            }
        }, TEN_MINUTES_MS);

        return () => {
            clearInterval(interval);
        };
    }, []);
}
