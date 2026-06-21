// src/app/providers.tsx
'use client';

import { QueryClient, QueryClientProvider, QueryCache } from '@tanstack/react-query';
import { useState } from 'react';
import { useTokenAutoRefresh } from '@/hooks/useTokenAutoRefresh';
import { useUserCache } from '@/hooks/useUserCache';
import { useRealtime } from '@/lib/realtime';
import { useIsClient } from '@/hooks/useIsClient';
import { isAuthed } from '@/lib/auth';
import { useBrowserNotificationBridge } from '@/features/notifications/hooks';
import { ToastProvider, notifyGlobalError } from '@/components/ui/Toast';
import { ConfirmProvider } from '@/components/ui/ConfirmDialog';
import { getErrorMessage } from '@/lib/errors';

function TokenRefreshInitializer() {
    useTokenAutoRefresh();
    return null;
}

function UserCacheInitializer() {
    useUserCache();
    return null;
}

function RealtimeInitializer() {
    useRealtime();
    return null;
}

function NotificationsInitializer() {
    const isClient = useIsClient();
    useBrowserNotificationBridge(isClient && isAuthed());
    return null;
}

export default function Providers({ children }: { children: React.ReactNode }) {
    const [qc] = useState(() => new QueryClient({
        // Глобально показываем ошибку запроса тостом — иначе упавший fetch выглядит как пустой экран («сломано»).
        queryCache: new QueryCache({
            onError: (err) => notifyGlobalError(getErrorMessage(err) || 'Не удалось загрузить данные'),
        }),
        defaultOptions: {
            queries: {
                retry: 1,
                refetchOnWindowFocus: false,
                staleTime: 30_000,
            },
        },
    }));
    return (
        <QueryClientProvider client={qc}>
            <ToastProvider>
              <ConfirmProvider>
                <TokenRefreshInitializer />
                <UserCacheInitializer />
                <RealtimeInitializer />
                <NotificationsInitializer />
                {children}
              </ConfirmProvider>
            </ToastProvider>
        </QueryClientProvider>
    );
}
