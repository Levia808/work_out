declare module '@heroui/react' {
  import type { ComponentType, ReactNode } from 'react';
  export const HeroUIProvider: ComponentType<{ children?: ReactNode; disableAnimation?: boolean }>;
  export const Button: ComponentType<Record<string, unknown>>;
  export const Input: ComponentType<Record<string, unknown>>;
}
declare module 'react-router-dom' {
  import type { ComponentType, ReactNode } from 'react';
  export function createBrowserRouter(routes: unknown[], opts?: unknown): unknown;
  export const RouterProvider: ComponentType<{ router: unknown }>;
  export const Outlet: ComponentType;
  export const Link: ComponentType<Record<string, unknown>>;
  export const NavLink: ComponentType<Record<string, unknown>>;
  export function useLocation(): { pathname: string; state?: unknown };
  export function useNavigate(): (to: string, options?: Record<string, unknown>) => void;
  export function useParams<T extends Record<string, string | undefined> = Record<string, string | undefined>>(): T;
  export function Navigate(props: { to: string; replace?: boolean; state?: unknown }): ReactNode;
}
declare module '@tanstack/react-query' {
  export class QueryClient { constructor(options?: unknown); }
  export function QueryClientProvider(props: { client: QueryClient; children?: unknown }): unknown;
  export function useQuery(options: unknown): any;
  export function useMutation(options: unknown): any;
  export function useQueryClient(): any;
}
declare module '@tanstack/react-query-persist-client' {
  export function PersistQueryClientProvider(props: { client: unknown; persistOptions?: unknown; children?: import('react').ReactNode }): import('react').ReactNode;
}
declare module '@tanstack/query-sync-storage-persister' {
  export function createSyncStoragePersister(options: unknown): unknown;
}
declare module '@supabase/supabase-js' {
  export type Session = { user?: { id: string; email?: string; user_metadata?: Record<string, unknown> } };
  export function createClient<T>(url: string, key: string, options?: unknown): any;
}
declare var describe: (name: string, fn: () => void) => void;
declare var it: (name: string, fn: () => void) => void;
declare var expect: (value: unknown) => { toBe(expected: unknown): void };
