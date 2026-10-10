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

export function getTrainingAnalytics(days = 28) {
  const start = dateKey(subDays(new Date(), Math.max(0, days - 1)));
  const sessions = getSessions().filter(session => session.startedAt.slice(0, 10) >= start);
  const completedSets = sessions.reduce((total, session) => total + session.sets.filter(set => set.completed).length, 0);
  const totalVolume = sessions.reduce((total, session) => total + session.sets.filter(set => set.completed).reduce((volume, set) => volume + set.weightKg * set.reps, 0), 0);
  const sleepLogs = getSleepLogs().filter(log => log.loggedOn >= start);
  const mealDays = new Set(getAllMeals().filter(log => log.loggedOn >= start).map(log => log.loggedOn)).size;
  return {
    days,
    sessions: sessions.length,
    completedSets,
    totalVolume: Math.round(totalVolume),
    avgSleepHours: sleepLogs.length ? sleepLogs.reduce((total, log) => total + log.durationMinutes, 0) / sleepLogs.length / 60 : undefined,
    mealDays,
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

export function getDashboardSnapshot() {
  const today = dateKey(); const settings = getSettings(); const plans = getPlans();
  const todayDate = new Date();
  const todayPlan = plans.find(plan => isPlanScheduledOn(plan, todayDate));
  const meals = getMeals(today); const sleep = getSleepLog(today); const body = getBodyMetrics().at(-1); const habits = getHabits(); const habitCount = habits.filter(habit => getHabitLog(habit.id, today)?.completed).length; const volume = getSessions().flatMap(session => session.sets).filter(set => set.completed).reduce((sum, set) => sum + set.weightKg * set.reps, 0);
  return { trainingProgress: todayPlan ? planProgress(todayPlan) : 0, calories: meals.reduce((sum, meal) => sum + meal.kcal, 0), calorieGoal: settings.calorieGoal, sleepHours: sleep ? sleep.durationMinutes / 60 : undefined, sleepGoal: settings.sleepGoalMinutes ? settings.sleepGoalMinutes / 60 : undefined, habitProgress: habits.length ? Math.round(habitCount / habits.length * 100) : 0, weight: body?.weightKg, weightUnit: 'kg', volume: Math.round(volume), habitCount, habitTotal: habits.length, todayPlan };
}
