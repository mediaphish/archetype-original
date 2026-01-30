/**
 * React Query client for Operators platform.
 * Plan: "Implement React Query or SWR for data fetching and caching"
 * Use with QueryClientProvider from @tanstack/react-query.
 */

import { QueryClient } from '@tanstack/react-query';

const defaultStaleTime = 30 * 1000; // 30 seconds
const defaultCacheTime = 5 * 60 * 1000; // 5 minutes

export const operatorsQueryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: defaultStaleTime,
      gcTime: defaultCacheTime,
      retry: 2,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
    },
  },
});

export default operatorsQueryClient;
