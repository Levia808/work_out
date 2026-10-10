import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 60_000, gcTime: 1000 * 60 * 60 * 24 * 7, retry: 2, refetchOnWindowFocus: false },
    mutations: { retry: 2 }
  }
});
