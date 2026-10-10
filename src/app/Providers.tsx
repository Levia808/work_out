import type { ReactNode } from 'react';
import { HeroUIProvider } from '@heroui/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';
import { queryClient } from '../lib/queryClient';
import { AuthProvider } from './AuthProvider';

const persister = createSyncStoragePersister({ storage: window.localStorage, key: 'fittrack-query-cache' });
export function Providers({ children }: { children: ReactNode }) {
  return <HeroUIProvider disableAnimation><PersistQueryClientProvider client={queryClient} persistOptions={{ persister }}><AuthProvider>{children}</AuthProvider></PersistQueryClientProvider></HeroUIProvider>;
}
