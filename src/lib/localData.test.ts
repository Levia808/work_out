import { describe, expect, it } from 'vitest';
import { getSettings, isPreviewMode, seedPreviewData } from './localData';

const values = new Map<string, string>();
const storage = {
  getItem: (key: string) => values.get(key) ?? null,
  setItem: (key: string, value: string) => { values.set(key, value); },
  removeItem: (key: string) => { values.delete(key); },
};

function restoreGlobal(name: string, descriptor: PropertyDescriptor | undefined) {
  if (descriptor) Object.defineProperty(globalThis, name, descriptor);
  else Reflect.deleteProperty(globalThis, name);
}

describe('preview data isolation', () => {
  it('seeds demo records in a separate namespace without reading or changing real settings', () => {
    const oldStorage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
    const oldWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
    const oldCustomEvent = Object.getOwnPropertyDescriptor(globalThis, 'CustomEvent');
    const location = { search: '?demo=1' };
    const fakeWindow = { location, dispatchEvent: () => true } as unknown as Window;
    const FakeCustomEvent = class { constructor(public type: string) {} } as unknown as typeof CustomEvent;
    values.clear();
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: storage as Storage });
    Object.defineProperty(globalThis, 'window', { configurable: true, value: fakeWindow });
    Object.defineProperty(globalThis, 'CustomEvent', { configurable: true, value: FakeCustomEvent });

    try {
      const realSettings = JSON.stringify({ calorieGoal: 1890, targetWeightKg: 68 });
      values.set('fittrack:settings', realSettings);

      expect(isPreviewMode()).toBe(true);
      expect(seedPreviewData()).toBe(true);
      expect(values.get('fittrack:settings')).toBe(realSettings);
      expect(values.has('fittrack:demo:settings')).toBe(true);
      expect(getSettings().calorieGoal).toBe(2200);
      expect(getSettings().targetWeightKg).toBe(70);

      location.search = '';
      expect(isPreviewMode()).toBe(false);
      expect(getSettings().calorieGoal).toBe(1890);
      expect(getSettings().targetWeightKg).toBe(68);
    } finally {
      restoreGlobal('localStorage', oldStorage);
      restoreGlobal('window', oldWindow);
      restoreGlobal('CustomEvent', oldCustomEvent);
    }
  });
});
