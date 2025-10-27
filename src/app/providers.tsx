// src/app/providers.tsx
'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { useTokenAutoRefresh } from '@/hooks/useTokenAutoRefresh';

function TokenRefreshInitializer() {
    useTokenAutoRefresh();
    return null;
}

export default function Providers({ children }: { children: React.ReactNode }) {
    const [qc] = useState(() => new QueryClient());
    return (
        <QueryClientProvider client={qc}>
            <TokenRefreshInitializer />
            {children}
        </QueryClientProvider>
    );
}
