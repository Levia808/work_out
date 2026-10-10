declare module 'vitest/config' {
  export function defineConfig(config: Record<string, unknown>): Record<string, unknown>;
}
declare module 'vitest' {
  export function describe(name: string, fn: () => void): void;
  export function it(name: string, fn: () => void): void;
  export function expect(value: unknown): { toBe(expected: unknown): void };
}
