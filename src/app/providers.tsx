// src/app/providers.tsx
'use client';

import { CacheProvider } from '@chakra-ui/next-js';
import { ChakraProvider, defaultSystem } from '@chakra-ui/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, type ComponentProps, type ReactNode } from 'react';

type ChakraProviderProps = ComponentProps<typeof ChakraProvider>;
type ChakraProviderComponent = (props: ChakraProviderProps) => ReactNode;
const ChakraProviderShim = ChakraProvider as unknown as ChakraProviderComponent;

export default function Providers({ children }: { children: ReactNode }) {
    const [qc] = useState(() => new QueryClient());

    return (
        <CacheProvider>
            {/* Chakra UI пока не обновил типы под React 19, используем шим. */}
            <ChakraProviderShim value={defaultSystem}>
                <QueryClientProvider client={qc}>{children}</QueryClientProvider>
            </ChakraProviderShim>
        </CacheProvider>
    );
}
