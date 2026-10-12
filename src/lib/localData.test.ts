import { describe, expect, it } from 'vitest';
import { dateKey, getSettings, getTrainingAnalytics, isPreviewMode, seedPreviewData } from './localData';

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


describe('day-level analysis source records', () => {
  it('includes exact meals, sleep, workouts, body entries, and missing habit states per date', () => {
    const oldStorage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
    const oldWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
    const oldCustomEvent = Object.getOwnPropertyDescriptor(globalThis, 'CustomEvent');
    const today = dateKey(new Date());
    const fakeWindow = { location: { search: '' }, dispatchEvent: () => true } as unknown as Window;
    const FakeCustomEvent = class { constructor(public type: string) {} } as unknown as typeof CustomEvent;
    values.clear();
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: storage as Storage });
    Object.defineProperty(globalThis, 'window', { configurable: true, value: fakeWindow });
    Object.defineProperty(globalThis, 'CustomEvent', { configurable: true, value: FakeCustomEvent });

    try {
      const planId = 'plan';
      const exerciseId = 'bench';
      const habitId = 'water';
      const uncheckedHabitId = 'stretch';
      const unloggedHabitId = 'read';
      values.set('fittrack:settings', JSON.stringify({ calorieGoal: 2100, sleepGoalMinutes: 480 }));
      values.set('fittrack:workout-plans', JSON.stringify([{
        id: planId, title: '上肢', weekday: new Date().getDay(), weekMode: 'every', active: true,
        createdAt: `${today}T00:00:00.000Z`, updatedAt: `${today}T00:00:00.000Z`,
        exercises: [{ id: exerciseId, name: '杠铃卧推', muscleGroup: '胸', instructions: '肩胛稳定', todos: [{ id: 'todo', label: '完成热身', completed: true }] }],
        items: [{ id: 'item', exerciseId, sortOrder: 0, targetSets: 3, targetReps: 8, targetWeightKg: 40 }],
      }]));
      values.set('fittrack:workout-sessions', JSON.stringify([{
        id: 'session', planId, startedAt: `${today}T08:00:00.000Z`, endedAt: `${today}T08:45:00.000Z`,
        sets: [{ id: 'set', exerciseId, setNumber: 1, weightKg: 40, reps: 8, completed: true }],
      }]));
      values.set('fittrack:meal-logs', JSON.stringify([
        { id: 'meal1', loggedOn: today, meal: 'breakfast', name: '燕麦', grams: 80, kcal: 300, protein: 12, carbs: 50, fat: 6, notes: '训练前' },
        { id: 'meal2', loggedOn: today, meal: 'lunch', name: '鸡肉饭', grams: 350, kcal: 620, protein: 42, carbs: 70, fat: 12, source: 'manual' },
      ]));
      values.set('fittrack:sleep-logs', JSON.stringify([{ id: 'sleep', loggedOn: today, fellAsleepAt: `${today}T23:00`, wokeAt: `${today}T07:00`, durationMinutes: 480, quality: 4 }]));
      values.set('fittrack:body-metrics', JSON.stringify([{ id: 'body', measuredOn: today, weightKg: 70.5, bodyFatPercent: 18, waistCm: 78, notes: '晨起测量' }]));
      values.set('fittrack:habits', JSON.stringify([
        { id: habitId, name: '喝水', icon: 'Droplets', createdAt: `${today}T00:00:00.000Z` },
        { id: uncheckedHabitId, name: '拉伸', icon: 'Check', createdAt: `${today}T00:00:00.000Z` },
        { id: unloggedHabitId, name: '阅读', icon: 'Book', createdAt: `${today}T00:00:00.000Z` },
      ]));
      values.set('fittrack:habit-logs', JSON.stringify([
        { id: 'habit-log', habitId, loggedOn: today, completed: true },
        { id: 'unchecked-log', habitId: uncheckedHabitId, loggedOn: today, completed: false },
      ]));

      const analytics = getTrainingAnalytics(1);
      const record = analytics.dailyRecords[0];
      expect(record.date).toBe(today);
      expect(JSON.stringify(record.plannedWorkouts[0].exercises[0])).toBe(JSON.stringify({ name: '杠铃卧推', muscleGroup: '胸', instructions: '肩胛稳定', checklist: [{ label: '完成热身', completed: true }], targetSets: 3, targetReps: 8, targetWeightKg: 40 }));
      expect(JSON.stringify(record.plannedWorkouts[0].exercises[0].checklist[0])).toBe(JSON.stringify({ label: '完成热身', completed: true }));
      expect(JSON.stringify(record.sessions[0].sets[0])).toBe(JSON.stringify({ exercise: '杠铃卧推', setNumber: 1, weightKg: 40, reps: 8, completed: true }));
      expect(JSON.stringify(record.meals.map(meal => meal.name))).toBe(JSON.stringify(['燕麦', '鸡肉饭']));
      expect(record.meals[0].notes).toBe('训练前');
      expect(record.sleep?.durationMinutes).toBe(480);
      expect(JSON.stringify(record.body)).toBe(JSON.stringify({ weightKg: 70.5, bodyFatPercent: 18, waistCm: 78, notes: '晨起测量' }));
      expect(JSON.stringify(record.habits)).toBe(JSON.stringify([
        { name: '喝水', logged: true, completed: true },
        { name: '拉伸', logged: true, completed: false },
        { name: '阅读', logged: false, completed: null },
      ]));
      expect(analytics.habits.completedLogs).toBe(1);
      expect(analytics.habits.loggedEntries).toBe(2);
      expect(analytics.habits.checkInCompletionRate).toBe(50);
      expect(analytics.habits.loggingCoverageRate).toBe(67);
    } finally {
      restoreGlobal('localStorage', oldStorage);
      restoreGlobal('window', oldWindow);
      restoreGlobal('CustomEvent', oldCustomEvent);
    }
  });
});
