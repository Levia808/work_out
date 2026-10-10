declare module 'vite-plugin-pwa' {
  export function VitePWA(options?: Record<string, unknown>): import('vite').Plugin;
}
declare module 'virtual:pwa-register' {
  export function registerSW(options?: { immediate?: boolean }): () => void;
}
