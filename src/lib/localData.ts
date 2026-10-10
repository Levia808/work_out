import { format, getWeek, subDays } from 'date-fns';
import type { BodyMetric, FoodLog, Habit, HabitLog, MealType, SleepLog, UserSettings, WeekMode, WorkoutPlan, WorkoutPlanImport, WorkoutSession, WorkoutSet } from './types';

const PREFIX = 'fittrack:';
const keys = {
  settings: 'settings', plans: 'workout-plans', sessions: 'workout-sessions', meals: 'meal-logs', sleep: 'sleep-logs', body: 'body-metrics', habits: 'habits', habitLogs: 'habit-logs',
} as const;

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(`${PREFIX}${key}`);
    return raw ? JSON.parse(raw) as T : fallback;
  } catch { return fallback; }
}
function write<T>(key: string, value: T) { localStorage.setItem(`${PREFIX}${key}`, JSON.stringify(value)); window.dispatchEvent(new CustomEvent('fittrack:data')); }
export function makeId() { return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`; }
export const dateKey = (date = new Date()) => format(date, 'yyyy-MM-dd');
export const formatWeekday = (weekday: number) => ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][weekday] ?? '未设置';
export const weekModeLabel = (mode: WeekMode) => ({ every: '每周', odd: '单周', even: '双周' })[mode];

export function isPlanScheduledOn(plan: WorkoutPlan, date: Date) {
  if (!plan.active) return false;
  if (plan.weekday !== date.getDay()) return false;
  const week = getWeek(date, { weekStartsOn: 1 });
  return plan.weekMode === 'every' || (plan.weekMode === 'odd' ? week % 2 === 1 : week % 2 === 0);
}

export function getSettings(): UserSettings { return read<UserSettings>(keys.settings, {}); }
export function saveSettings(next: UserSettings) { write(keys.settings, { ...getSettings(), ...next }); }

export function getPlans(): WorkoutPlan[] { return read<WorkoutPlan[]>(keys.plans, []).sort((a, b) => a.weekday - b.weekday || a.title.localeCompare(b.title)); }
export function getPlan(id: string) { return getPlans().find(plan => plan.id === id); }
export function savePlan(plan: WorkoutPlan) { write(keys.plans, [...getPlans().filter(item => item.id !== plan.id), { ...plan, updatedAt: new Date().toISOString() }]); }
export function createPlan(input: { title: string; weekday: number; weekMode: WeekMode; exerciseName?: string; muscleGroup?: string; targetSets?: number; targetReps?: number }): WorkoutPlan {
  const now = new Date().toISOString();
  const exercises = input.exerciseName?.trim() ? [{ id: makeId(), name: input.exerciseName.trim(), muscleGroup: input.muscleGroup?.trim() ?? '', instructions: '', todos: [] }] : [];
  const items = exercises.map((exercise, index) => ({ id: makeId(), exerciseId: exercise.id, sortOrder: index, targetSets: input.targetSets ?? 3, targetReps: input.targetReps ?? 10 }));
  const plan: WorkoutPlan = { id: makeId(), title: input.title.trim(), weekday: input.weekday, weekMode: input.weekMode, active: true, exercises, items, createdAt: now, updatedAt: now };
  savePlan(plan); return plan;
}
export function deletePlan(id: string) { write(keys.plans, getPlans().filter(plan => plan.id !== id)); }

export function createPlanFromImport(input: WorkoutPlanImport): WorkoutPlan {
  const now = new Date().toISOString();
  const exercises = input.exercises.map(item => ({
    id: makeId(),
    name: item.name.trim(),
    muscleGroup: item.muscleGroup?.trim() ?? '',
    instructions: item.instructions?.trim() ?? '',
    todos: (item.todos ?? []).map(label => ({ id: makeId(), label: label.trim(), completed: false })).filter(todo => todo.label),
  }));
  const items = input.exercises.map((item, index) => ({
    id: makeId(),
    exerciseId: exercises[index].id,
    sortOrder: index,
    targetSets: item.targetSets,
    targetReps: item.targetReps,
    ...(item.targetWeightKg === undefined ? {} : { targetWeightKg: item.targetWeightKg }),
  }));
  const plan: WorkoutPlan = {
    id: makeId(),
    title: input.title.trim(),
    weekday: input.weekday,
    weekMode: input.weekMode,
    active: true,
    exercises,
    items,
    createdAt: now,
    updatedAt: now,
  };
  savePlan(plan);
  return plan;
}
export function addExerciseToPlan(planId: string, input: { name: string; muscleGroup?: string; instructions?: string; targetSets: number; targetReps: number }) {
  const plan = getPlan(planId); if (!plan) throw new Error('训练计划不存在');
  const exercise = { id: makeId(), name: input.name.trim(), muscleGroup: input.muscleGroup?.trim() ?? '', instructions: input.instructions?.trim() ?? '', todos: [] };
  plan.exercises.push(exercise); plan.items.push({ id: makeId(), exerciseId: exercise.id, sortOrder: plan.items.length, targetSets: input.targetSets, targetReps: input.targetReps }); savePlan(plan); return plan;
}
export function addTodoToExercise(planId: string, exerciseId: string, label: string) { const plan = getPlan(planId); const exercise = plan?.exercises.find(item => item.id === exerciseId); if (!plan || !exercise) throw new Error('动作不存在'); exercise.todos.push({ id: makeId(), label: label.trim(), completed: false }); savePlan(plan); return plan; }
export function toggleTodo(planId: string, exerciseId: string, todoId: string) { const plan = getPlan(planId); const exercise = plan?.exercises.find(item => item.id === exerciseId); const todo = exercise?.todos.find(item => item.id === todoId); if (!plan || !todo) throw new Error('检查项不存在'); todo.completed = !todo.completed; savePlan(plan); return plan; }
export function createSession(planId: string): WorkoutSession { const session: WorkoutSession = { id: makeId(), planId, startedAt: new Date().toISOString(), sets: [] }; write(keys.sessions, [...getSessions(), session]); return session; }
export function getSessions(): WorkoutSession[] { return read<WorkoutSession[]>(keys.sessions, []); }
export function getActiveSession(planId: string) { return getSessions().find(session => session.planId === planId && !session.endedAt); }
export function saveWorkoutSet(sessionId: string, input: Omit<WorkoutSet, 'id'>) { const sessions = getSessions(); const session = sessions.find(item => item.id === sessionId); if (!session) throw new Error('训练记录不存在'); const existing = session.sets.find(item => item.exerciseId === input.exerciseId && item.setNumber === input.setNumber); if (existing) Object.assign(existing, input); else session.sets.push({ ...input, id: makeId() }); write(keys.sessions, sessions); return session; }
export function finishSession(sessionId: string) { const sessions = getSessions(); const session = sessions.find(item => item.id === sessionId); if (!session) throw new Error('训练记录不存在'); session.endedAt = new Date().toISOString(); write(keys.sessions, sessions); return session; }
export function planProgress(plan: WorkoutPlan) { const sessions = getSessions().filter(session => session.planId === plan.id); const latest = sessions.sort((a, b) => b.startedAt.localeCompare(a.startedAt))[0]; if (!latest || plan.items.length === 0) return 0; const doneExerciseIds = new Set(latest.sets.filter(set => set.completed).map(set => set.exerciseId)); return Math.round(doneExerciseIds.size / plan.items.length * 100); }

export function getMeals(loggedOn = dateKey()) { return read<FoodLog[]>(keys.meals, []).filter(item => item.loggedOn === loggedOn); }
export function getAllMeals() { return read<FoodLog[]>(keys.meals, []); }
export function saveMeal(input: Omit<FoodLog, 'id'>) { const item = { ...input, id: makeId() }; write(keys.meals, [...getAllMeals(), item]); return item; }
export function deleteMeal(id: string) { write(keys.meals, getAllMeals().filter(item => item.id !== id)); }

export function getSleepLogs() { return read<SleepLog[]>(keys.sleep, []); }
export function getSleepLog(loggedOn = dateKey()) { return getSleepLogs().find(item => item.loggedOn === loggedOn); }
export function saveSleepLog(input: Omit<SleepLog, 'id'>) { const next = { ...input, id: getSleepLog(input.loggedOn)?.id ?? makeId() }; write(keys.sleep, [...getSleepLogs().filter(item => item.loggedOn !== input.loggedOn), next]); return next; }

export function getBodyMetrics() { return read<BodyMetric[]>(keys.body, []).sort((a, b) => a.measuredOn.localeCompare(b.measuredOn)); }
export function getBodyMetric(measuredOn = dateKey()) { return getBodyMetrics().find(item => item.measuredOn === measuredOn); }
export function saveBodyMetric(input: Omit<BodyMetric, 'id'>) { const next = { ...input, id: getBodyMetric(input.measuredOn)?.id ?? makeId() }; write(keys.body, [...getBodyMetrics().filter(item => item.measuredOn !== input.measuredOn), next]); return next; }

export function getHabits() { return read<Habit[]>(keys.habits, []); }
export function saveHabit(name: string) { const habit: Habit = { id: makeId(), name: name.trim(), icon: 'Check', createdAt: new Date().toISOString() }; write(keys.habits, [...getHabits(), habit]); return habit; }
export function getHabitLogs() { return read<HabitLog[]>(keys.habitLogs, []); }
export function getHabitLog(habitId: string, loggedOn = dateKey()) { return getHabitLogs().find(item => item.habitId === habitId && item.loggedOn === loggedOn); }
export function toggleHabitLog(habitId: string, loggedOn = dateKey()) { const logs = getHabitLogs(); const existing = logs.find(item => item.habitId === habitId && item.loggedOn === loggedOn); if (existing) existing.completed = !existing.completed; else logs.push({ id: makeId(), habitId, loggedOn, completed: true }); write(keys.habitLogs, logs); return logs.find(item => item.habitId === habitId && item.loggedOn === loggedOn)!; }
export function habitStreak(habitId: string) { const logs = new Set(getHabitLogs().filter(item => item.habitId === habitId && item.completed).map(item => item.loggedOn)); let current = new Date(); let count = 0; while (logs.has(dateKey(current))) { count += 1; current = subDays(current, 1); } return count; }
export function habitHeatmap(days = 98) { const byDay = new Map<string, number>(); getHabitLogs().filter(item => item.completed).forEach(item => byDay.set(item.loggedOn, (byDay.get(item.loggedOn) ?? 0) + 1)); return Array.from({ length: days }, (_, index) => { const day = subDays(new Date(), days - index - 1); const key = dateKey(day); return { date: key, level: Math.min(4, byDay.get(key) ?? 0) }; }); }

export type TrainingAnalytics = {
  period: { days: number; start: string; end: string };
  training: {
    plannedSessions: number;
    completedSessions: number;
    completionRate?: number;
    sessions: number;
    completedSets: number;
    totalVolume: number;
    exerciseStats: Array<{ name: string; sets: number; volume: number; maxWeightKg: number; reps: number }>;
  };
  sleep: { loggedDays: number; avgHours?: number; goalRate?: number; goalHours?: number };
  nutrition: { loggedDays: number; avgKcal?: number; avgProtein?: number; avgCarbs?: number; avgFat?: number; calorieGoal?: number };
  body: { loggedDays: number; latestWeightKg?: number; weightChangeKg?: number; latestBodyFatPercent?: number; bodyFatChangePercent?: number; targetWeightKg?: number };
  habits: { habitCount: number; completedLogs: number; completionRate?: number; currentStreaks: Array<{ name: string; days: number }> };
  goals: { calorieGoal?: number; sleepGoalHours?: number; targetWeightKg?: number };
  missingData: string[];
};

export function getTrainingAnalytics(days = 28): TrainingAnalytics {
  const endDate = new Date();
  const startDate = subDays(endDate, Math.max(0, days - 1));
  const start = dateKey(startDate);
  const end = dateKey(endDate);
  const settings = getSettings();
  const plans = getPlans().filter(plan => plan.active && plan.items.length > 0);
  const sessions = getSessions().filter(session => session.startedAt.slice(0, 10) >= start && session.startedAt.slice(0, 10) <= end);
  const completedSessions = sessions.filter(session => Boolean(session.endedAt));
  const completedSets = sessions.reduce((total, session) => total + session.sets.filter(set => set.completed).length, 0);
  const totalVolume = sessions.reduce((total, session) => total + session.sets.filter(set => set.completed).reduce((volume, set) => volume + set.weightKg * set.reps, 0), 0);
  const completedDays = new Set(completedSessions.map(session => `${session.planId}:${session.startedAt.slice(0, 10)}`));
  let plannedSessions = 0;
  for (let offset = 0; offset < days; offset += 1) {
    const date = subDays(endDate, days - offset - 1);
    plans.forEach(plan => { if (isPlanScheduledOn(plan, date)) plannedSessions += 1; });
  }
  const completionRate = plannedSessions ? Math.round(completedDays.size / plannedSessions * 100) : undefined;
  const exerciseNames = new Map<string, string>();
  getPlans().forEach(plan => plan.exercises.forEach(exercise => exerciseNames.set(`${plan.id}:${exercise.id}`, exercise.name)));
  const exerciseMap = new Map<string, { name: string; sets: number; volume: number; maxWeightKg: number; reps: number }>();
  sessions.flatMap(session => session.sets.filter(set => set.completed).map(set => ({ session, set }))).forEach(({ session, set }) => {
    const name = exerciseNames.get(`${session.planId}:${set.exerciseId}`) ?? '未命名动作';
    const current = exerciseMap.get(name) ?? { name, sets: 0, volume: 0, maxWeightKg: 0, reps: 0 };
    current.sets += 1;
    current.volume += set.weightKg * set.reps;
    current.maxWeightKg = Math.max(current.maxWeightKg, set.weightKg);
    current.reps += set.reps;
    exerciseMap.set(name, current);
  });

  const sleepLogs = getSleepLogs().filter(log => log.loggedOn >= start && log.loggedOn <= end);
  const avgSleepHours = sleepLogs.length ? sleepLogs.reduce((total, log) => total + log.durationMinutes, 0) / sleepLogs.length / 60 : undefined;
  const sleepGoalHours = settings.sleepGoalMinutes ? settings.sleepGoalMinutes / 60 : undefined;
  const sleepGoalRate = sleepGoalHours && sleepLogs.length ? Math.round(sleepLogs.filter(log => log.durationMinutes >= settings.sleepGoalMinutes!).length / sleepLogs.length * 100) : undefined;

  const meals = getAllMeals().filter(log => log.loggedOn >= start && log.loggedOn <= end);
  const mealDays = new Set(meals.map(log => log.loggedOn)).size;
  const mealAverage = (key: 'kcal' | 'protein' | 'carbs' | 'fat') => mealDays ? meals.reduce((sum, meal) => sum + meal[key], 0) / mealDays : undefined;

  const bodyMetrics = getBodyMetrics().filter(metric => metric.measuredOn >= start && metric.measuredOn <= end);
  const weights = bodyMetrics.filter(metric => metric.weightKg !== undefined).map(metric => metric.weightKg!);
  const bodyFats = bodyMetrics.filter(metric => metric.bodyFatPercent !== undefined).map(metric => metric.bodyFatPercent!);
  const latestWeightKg = weights.at(-1);
  const latestBodyFatPercent = bodyFats.at(-1);
  const weightChangeKg = weights.length > 1 ? Number((weights.at(-1)! - weights[0]).toFixed(1)) : undefined;
  const bodyFatChangePercent = bodyFats.length > 1 ? Number((bodyFats.at(-1)! - bodyFats[0]).toFixed(1)) : undefined;

  const habits = getHabits();
  const completedHabitLogs = getHabitLogs().filter(log => log.loggedOn >= start && log.loggedOn <= end && log.completed).length;
  const activeHabitCount = habits.filter(habit => habit.createdAt.slice(0, 10) <= end).length;
  const habitCompletionRate = activeHabitCount ? Math.round(completedHabitLogs / (activeHabitCount * days) * 100) : undefined;
  const currentStreaks = habits.map(habit => ({ name: habit.name, days: habitStreak(habit.id) }));
  const missingData: string[] = [];
  if (!sessions.length) missingData.push('训练');
  if (!sleepLogs.length) missingData.push('睡眠');
  if (!meals.length) missingData.push('饮食');
  if (!bodyMetrics.length) missingData.push('体重体测');
  if (!habits.length || !completedHabitLogs) missingData.push('习惯');
  if (!settings.calorieGoal) missingData.push('每日热量目标');
  if (!settings.sleepGoalMinutes) missingData.push('每日睡眠目标');
  if (!settings.targetWeightKg) missingData.push('目标体重');

  return {
    period: { days, start, end },
    training: { plannedSessions, completedSessions: completedSessions.length, completionRate, sessions: sessions.length, completedSets, totalVolume: Math.round(totalVolume), exerciseStats: [...exerciseMap.values()].sort((a, b) => b.volume - a.volume) },
    sleep: { loggedDays: sleepLogs.length, avgHours: avgSleepHours, goalRate: sleepGoalRate, goalHours: sleepGoalHours },
    nutrition: { loggedDays: mealDays, avgKcal: mealAverage('kcal'), avgProtein: mealAverage('protein'), avgCarbs: mealAverage('carbs'), avgFat: mealAverage('fat'), calorieGoal: settings.calorieGoal },
    body: { loggedDays: bodyMetrics.length, latestWeightKg, weightChangeKg, latestBodyFatPercent, bodyFatChangePercent, targetWeightKg: settings.targetWeightKg },
    habits: { habitCount: activeHabitCount, completedLogs: completedHabitLogs, completionRate: habitCompletionRate, currentStreaks },
    goals: { calorieGoal: settings.calorieGoal, sleepGoalHours, targetWeightKg: settings.targetWeightKg },
    missingData,
  };
}

export function getTrainingRate(days = 28) {
  const start = subDays(new Date(), Math.max(0, days - 1));
  const plans = getPlans().filter(plan => plan.active && plan.items.length > 0);
  if (!plans.length) return undefined;
  const sessions = getSessions().filter(session => Boolean(session.endedAt));
  const completedDays = new Set(sessions.map(session => `${session.planId}:${session.startedAt.slice(0, 10)}`));
  let expected = 0;
  let completed = 0;
  for (let offset = 0; offset < days; offset += 1) {
    const day = subDays(new Date(), days - offset - 1);
    const dayKey = dateKey(day);
    plans.forEach(plan => {
      if (!isPlanScheduledOn(plan, day)) return;
      expected += 1;
      if (completedDays.has(`${plan.id}:${dayKey}`)) completed += 1;
    });
  }
  return expected ? Math.round((completed / expected) * 100) : undefined;
}

export function seedPreviewData() {
  if (!import.meta.env.DEV) return false;
  const previewKey = `${PREFIX}preview-seeded`;
  if (localStorage.getItem(previewKey)) return false;
  const hasUserData = [keys.settings, keys.plans, keys.sessions, keys.meals, keys.sleep, keys.body, keys.habits, keys.habitLogs].some(key => localStorage.getItem(`${PREFIX}${key}`));
  if (hasUserData) return false;

  const now = new Date();
  const today = dateKey(now);
  const planId = makeId();
  const benchId = makeId();
  const pressId = makeId();
  const sessionId = makeId();
  const plan: WorkoutPlan = {
    id: planId,
    title: '力量基础',
    weekday: now.getDay(),
    weekMode: 'every',
    active: true,
    exercises: [
      { id: benchId, name: '杠铃卧推', muscleGroup: '胸部', instructions: '肩胛收紧，脚掌踩稳。', todos: [{ id: makeId(), label: '完成热身组', completed: true }, { id: makeId(), label: '记录最后一组重量', completed: false }] },
      { id: pressId, name: '哑铃肩推', muscleGroup: '肩部', instructions: '核心收紧，动作保持可控。', todos: [{ id: makeId(), label: '全程控制下放', completed: false }] },
    ],
    items: [
      { id: makeId(), exerciseId: benchId, sortOrder: 0, targetSets: 4, targetReps: 8, targetWeightKg: 50 },
      { id: makeId(), exerciseId: pressId, sortOrder: 1, targetSets: 3, targetReps: 10, targetWeightKg: 16 },
    ],
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };
  const session: WorkoutSession = { id: sessionId, planId, startedAt: new Date(now.getTime() - 1000 * 60 * 75).toISOString(), endedAt: new Date(now.getTime() - 1000 * 60 * 12).toISOString(), sets: [
    { id: makeId(), exerciseId: benchId, setNumber: 1, weightKg: 45, reps: 8, completed: true },
    { id: makeId(), exerciseId: benchId, setNumber: 2, weightKg: 50, reps: 8, completed: true },
    { id: makeId(), exerciseId: benchId, setNumber: 3, weightKg: 50, reps: 7, completed: true },
    { id: makeId(), exerciseId: pressId, setNumber: 1, weightKg: 14, reps: 10, completed: true },
    { id: makeId(), exerciseId: pressId, setNumber: 2, weightKg: 16, reps: 9, completed: true },
  ] };
  const meals: FoodLog[] = [
    { id: makeId(), loggedOn: today, meal: 'breakfast', name: '燕麦与鸡蛋', kcal: 420, protein: 25, carbs: 48, fat: 14, source: 'manual' },
    { id: makeId(), loggedOn: today, meal: 'lunch', name: '鸡胸肉糙米饭', kcal: 610, protein: 46, carbs: 64, fat: 16, source: 'manual' },
    { id: makeId(), loggedOn: today, meal: 'snack', name: '无糖酸奶', kcal: 130, protein: 12, carbs: 10, fat: 4, source: 'manual' },
  ];
  const sleep: SleepLog = { id: makeId(), loggedOn: today, fellAsleepAt: `${today}T23:15`, wokeAt: `${today}T07:00`, durationMinutes: 465, quality: 4 };
  const body: BodyMetric[] = Array.from({ length: 5 }, (_, index) => { const measuredOn = dateKey(subDays(now, 4 - index)); return { id: makeId(), measuredOn, weightKg: Number((71.8 - index * 0.15).toFixed(1)), bodyFatPercent: Number((18.6 - index * 0.12).toFixed(1)) }; });
  const habitA: Habit = { id: makeId(), name: '喝水 2L', icon: 'Droplets', createdAt: new Date(now.getTime() - 1000 * 60 * 60 * 24 * 30).toISOString() };
  const habitB: Habit = { id: makeId(), name: '拉伸 10 分钟', icon: 'StretchHorizontal', createdAt: new Date(now.getTime() - 1000 * 60 * 60 * 24 * 16).toISOString() };
  const habitLogs: HabitLog[] = [];
  for (let offset = 0; offset < 14; offset += 1) {
    const loggedOn = dateKey(subDays(now, offset));
    habitLogs.push({ id: makeId(), habitId: habitA.id, loggedOn, completed: offset % 4 !== 3 });
    if (offset < 8) habitLogs.push({ id: makeId(), habitId: habitB.id, loggedOn, completed: offset % 3 !== 2 });
  }
  write(keys.settings, { calorieGoal: 2200, sleepGoalMinutes: 480, targetWeightKg: 70, aiProvider: 'qwen' });
  write(keys.plans, [plan]);
  write(keys.sessions, [session]);
  write(keys.meals, meals);
  write(keys.sleep, [sleep]);
  write(keys.body, body);
  write(keys.habits, [habitA, habitB]);
  write(keys.habitLogs, habitLogs);
  localStorage.setItem(previewKey, new Date().toISOString());
  window.dispatchEvent(new CustomEvent('fittrack:data'));
  return true;
}

export function getDashboardSnapshot() {
  const today = dateKey(); const settings = getSettings(); const plans = getPlans();
  const todayDate = new Date();
  const todayPlan = plans.find(plan => isPlanScheduledOn(plan, todayDate));
  const meals = getMeals(today); const sleep = getSleepLog(today); const body = getBodyMetrics().at(-1); const habits = getHabits(); const habitCount = habits.filter(habit => getHabitLog(habit.id, today)?.completed).length; const volume = getSessions().flatMap(session => session.sets).filter(set => set.completed).reduce((sum, set) => sum + set.weightKg * set.reps, 0);
  return { trainingProgress: todayPlan ? planProgress(todayPlan) : 0, calories: meals.reduce((sum, meal) => sum + meal.kcal, 0), calorieGoal: settings.calorieGoal, sleepHours: sleep ? sleep.durationMinutes / 60 : undefined, sleepGoal: settings.sleepGoalMinutes ? settings.sleepGoalMinutes / 60 : undefined, habitProgress: habits.length ? Math.round(habitCount / habits.length * 100) : 0, weight: body?.weightKg, weightUnit: 'kg', volume: Math.round(volume), habitCount, habitTotal: habits.length, todayPlan };
}
