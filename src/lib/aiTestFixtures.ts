import { format, subDays } from 'date-fns';
import type { TrainingAnalytics } from './localData';
import type { MealType } from './types';

type ScenarioKind = 'consistent' | 'mixed' | 'sparse';
export type AiTestScenario = { title: string; seed: number; kind: ScenarioKind; data: TrainingAnalytics };

const foodOptions = [
  { name: '燕麦酸奶碗', kcal: 390, protein: 24, carbs: 52, fat: 10, grams: 320 },
  { name: '鸡胸糙米饭', kcal: 560, protein: 46, carbs: 62, fat: 12, grams: 420 },
  { name: '三文鱼土豆', kcal: 610, protein: 39, carbs: 55, fat: 24, grams: 380 },
  { name: '香蕉与牛奶', kcal: 250, protein: 11, carbs: 42, fat: 6, grams: 330 },
  { name: '豆腐蔬菜面', kcal: 490, protein: 26, carbs: 68, fat: 13, grams: 410 },
  { name: '鸡蛋全麦吐司', kcal: 360, protein: 23, carbs: 34, fat: 14, grams: 270 },
] as const;
const exerciseOptions = [
  { name: '杠铃卧推', muscleGroup: '胸部', instructions: '肩胛稳定，控制下放。', targetSets: 4, targetReps: 8, targetWeightKg: 52.5 },
  { name: '坐姿划船', muscleGroup: '背部', instructions: '躯干保持稳定，肘部向后。', targetSets: 3, targetReps: 10, targetWeightKg: 42.5 },
  { name: '高脚杯深蹲', muscleGroup: '下肢', instructions: '膝盖与脚尖方向一致。', targetSets: 3, targetReps: 10, targetWeightKg: 24 },
  { name: '哑铃罗马尼亚硬拉', muscleGroup: '后侧链', instructions: '髋部向后折叠，背部中立。', targetSets: 3, targetReps: 9, targetWeightKg: 22 },
  { name: '哑铃侧平举', muscleGroup: '肩部', instructions: '轻重量控制动作轨迹。', targetSets: 3, targetReps: 12, targetWeightKg: 7 },
] as const;

function seededRandom(seed: number) {
  let state = seed >>> 0 || 1;
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return (state >>> 0) / 0x1_0000_0000;
  };
}
function pick<T>(items: readonly T[], random: () => number): T { return items[Math.floor(random() * items.length)]!; }
function round(value: number, places = 1) { return Number(value.toFixed(places)); }

export function createRandomAiTestScenarios(): AiTestScenario[] {
  const seedBuffer = new Uint32Array(3);
  globalThis.crypto.getRandomValues(seedBuffer);
  return [
    { title: '记录连续 · 训练渐进', kind: 'consistent', seed: seedBuffer[0]!, data: makeData(seedBuffer[0]!, 'consistent') },
    { title: '恢复波动 · 摄入起伏', kind: 'mixed', seed: seedBuffer[1]!, data: makeData(seedBuffer[1]!, 'mixed') },
    { title: '记录稀疏 · 缺项判断', kind: 'sparse', seed: seedBuffer[2]!, data: makeData(seedBuffer[2]!, 'sparse') },
  ];
}

function makeData(seed: number, kind: ScenarioKind): TrainingAnalytics {
  const random = seededRandom(seed);
  const days = 28;
  const end = new Date();
  const start = subDays(end, days - 1);
  const dateKey = (date: Date) => format(date, 'yyyy-MM-dd');
  const dates = Array.from({ length: days }, (_, index) => dateKey(subDays(start, -index)));
  const habits = ['晨间饮水', '睡前拉伸'];
  const dailyRecords: TrainingAnalytics['dailyRecords'] = dates.map((date, index) => {
    const planned = [0, 2, 4].includes(index % 7);
    const scheduledExercises = planned ? [exerciseOptions[index % exerciseOptions.length]!, exerciseOptions[(index + 1) % exerciseOptions.length]!] : [];
    const planTitle = index % 7 === 0 || index % 7 === 4 ? '力量 A' : '力量 B';
    const shouldTrain = planned && (kind === 'consistent' ? random() > 0.12 : kind === 'mixed' ? random() > 0.28 : random() > 0.7);
    const sessions = shouldTrain ? [{
      planTitle,
      completed: kind !== 'sparse' || random() > 0.4,
      durationMinutes: Math.round(42 + random() * 43),
      sets: scheduledExercises.flatMap(exercise => Array.from({ length: exercise.targetSets - (kind === 'sparse' && random() > 0.5 ? 1 : 0) }, (_, setIndex) => ({
        exercise: exercise.name,
        setNumber: setIndex + 1,
        weightKg: round(exercise.targetWeightKg * (0.94 + random() * 0.14)),
        reps: Math.max(5, exercise.targetReps + Math.round((random() - 0.5) * 4)),
        completed: kind !== 'sparse' || random() > 0.18,
      }))),
    }] : [];

    const logMeals = kind === 'sparse' ? random() > 0.64 : kind === 'mixed' ? random() > 0.13 : true;
    const mealCount = kind === 'sparse' ? 1 + Math.floor(random() * 2) : 3 + (random() > 0.7 ? 1 : 0);
    const meals = logMeals ? Array.from({ length: mealCount }, (_, mealIndex) => {
      const food = pick(foodOptions, random);
      const meal: MealType = mealIndex === 0 ? 'breakfast' : mealIndex === 1 ? 'lunch' : mealIndex === 2 ? 'dinner' : 'snack';
      const variation = kind === 'mixed' ? (random() > 0.5 ? 1.27 : 0.78) : 0.9 + random() * 0.22;
      return { meal, name: food.name, grams: food.grams, kcal: Math.round(food.kcal * variation), protein: Math.round(food.protein * variation), carbs: Math.round(food.carbs * variation), fat: Math.round(food.fat * variation), source: mealIndex === 1 ? 'ai' as const : 'manual' as const, ...(mealIndex === 1 ? { notes: '合成测试备注：模型估算后由用户确认' } : {}) };
    }) : [];

    const logSleep = kind === 'sparse' ? random() > 0.58 : kind === 'mixed' ? random() > 0.14 : random() > 0.04;
    const sleepHours = kind === 'consistent' ? 7.25 + random() * 1.35 : kind === 'mixed' ? 5.1 + random() * 3.2 : 5.8 + random() * 2.8;
    const wakeMinute = 6 * 60 + Math.floor(random() * 90);
    const durationMinutes = Math.round(sleepHours * 60);
    const sleepStartMinute = wakeMinute - durationMinutes;
    const wakeStamp = `${String(Math.floor(wakeMinute / 60)).padStart(2, '0')}:${String(wakeMinute % 60).padStart(2, '0')}`;
    const sleepStartDate = sleepStartMinute < 0 ? format(subDays(new Date(`${date}T12:00:00`), 1), 'yyyy-MM-dd') : date;
    const normalizedStartMinute = (sleepStartMinute + 1440) % 1440;
    const startStamp = `${String(Math.floor(normalizedStartMinute / 60)).padStart(2, '0')}:${String(normalizedStartMinute % 60).padStart(2, '0')}`;
    const sleep = logSleep ? {
      fellAsleepAt: `${sleepStartDate}T${startStamp}`,
      wokeAt: `${date}T${wakeStamp}`,
      durationMinutes,
      quality: 2 + Math.floor(random() * 4),
    } : null;
    const logBody = kind === 'sparse' ? index % 9 === 0 : index % 4 === 0 || index === days - 1;
    const weight = round((kind === 'mixed' ? 75.2 : 73.8) - index * (kind === 'consistent' ? 0.045 : 0.012) + (random() - 0.5) * (kind === 'mixed' ? 0.9 : 0.35), 1);
    const body = logBody ? { weightKg: weight, bodyFatPercent: round((kind === 'mixed' ? 20.6 : 19.2) - index * 0.012 + random() * 0.18, 1), waistCm: round(82 + random() * 1.5, 1), ...(index % 8 === 0 ? { notes: '合成数据：晨起、同一台秤' } : {}) } : null;
    const habitLoggingRate = kind === 'consistent' ? 0.96 : kind === 'mixed' ? 0.72 : 0.4;
    const habitStatuses = habits.map(name => {
      const logged = random() < habitLoggingRate;
      return { name, logged, completed: logged ? random() < (kind === 'mixed' ? 0.66 : 0.86) : null };
    });
    return {
      date,
      plannedWorkouts: planned ? [{ title: planTitle, exercises: scheduledExercises.map(exercise => ({
        name: exercise.name, muscleGroup: exercise.muscleGroup, instructions: exercise.instructions,
        checklist: [{ label: '完成热身与动作检查', completed: random() > 0.2 }],
        targetSets: exercise.targetSets, targetReps: exercise.targetReps, targetWeightKg: exercise.targetWeightKg,
      })) }] : [],
      sessions,
      meals,
      sleep,
      body,
      habits: habitStatuses,
    };
  });

  const plannedCount = dailyRecords.reduce((sum, day) => sum + day.plannedWorkouts.length, 0);
  const completedSessions = dailyRecords.flatMap(day => day.sessions).filter(session => session.completed).length;
  const allSessions = dailyRecords.flatMap(day => day.sessions);
  const completedSets = allSessions.flatMap(session => session.sets).filter(set => set.completed);
  const exerciseStatsMap = new Map<string, { name: string; sets: number; volume: number; maxWeightKg: number; reps: number }>();
  completedSets.forEach(set => {
    const current = exerciseStatsMap.get(set.exercise) ?? { name: set.exercise, sets: 0, volume: 0, maxWeightKg: 0, reps: 0 };
    current.sets += 1; current.volume += set.weightKg * set.reps; current.maxWeightKg = Math.max(current.maxWeightKg, set.weightKg); current.reps += set.reps;
    exerciseStatsMap.set(set.exercise, current);
  });
  const sleepLogs = dailyRecords.flatMap(day => day.sleep ? [day.sleep] : []);
  const sleepHours = sleepLogs.map(log => log.durationMinutes / 60);
  const mealDays = dailyRecords.filter(day => day.meals.length > 0);
  const mealEntries = mealDays.flatMap(day => day.meals);
  const dailyMealTotals = mealDays.map(day => day.meals.reduce((acc, meal) => ({ kcal: acc.kcal + meal.kcal, protein: acc.protein + meal.protein, carbs: acc.carbs + meal.carbs, fat: acc.fat + meal.fat }), { kcal: 0, protein: 0, carbs: 0, fat: 0 }));
  const bodyPoints = dailyRecords.flatMap(day => day.body?.weightKg === undefined ? [] : [{ date: day.date, value: day.body.weightKg }]);
  const fatPoints = dailyRecords.flatMap(day => day.body?.bodyFatPercent === undefined ? [] : [{ date: day.date, value: day.body.bodyFatPercent }]);
  const habitEntries = dailyRecords.flatMap(day => day.habits);
  const completedHabitLogs = habitEntries.filter(habit => habit.completed === true).length;
  const loggedHabitEntries = habitEntries.filter(habit => habit.logged).length;
  const activeHabitDays = habitEntries.length;
  const streaks = habits.map(name => {
    let count = 0;
    for (let index = dailyRecords.length - 1; index >= 0; index -= 1) {
      if (dailyRecords[index]!.habits.find(habit => habit.name === name)?.completed !== true) break;
      count += 1;
    }
    return { name, days: count };
  });
  const avg = (key: 'kcal' | 'protein' | 'carbs' | 'fat') => dailyMealTotals.length ? dailyMealTotals.reduce((sum, day) => sum + day[key], 0) / dailyMealTotals.length : undefined;
  const latestWeight = bodyPoints.at(-1)?.value;
  const latestFat = fatPoints.at(-1)?.value;
  const missingData = [
    ...(allSessions.length ? [] : ['训练']),
    ...(sleepLogs.length ? [] : ['睡眠']),
    ...(mealEntries.length ? [] : ['饮食']),
    ...(bodyPoints.length ? [] : ['体重体测']),
    ...(loggedHabitEntries ? [] : ['习惯']),
  ];
  return {
    period: { days, start: dateKey(start), end: dateKey(end) },
    training: {
      plannedSessions: plannedCount, completedSessions, recordedSessionCompletionRate: allSessions.length ? Math.round(completedSessions / allSessions.length * 100) : undefined,
      sessions: allSessions.length, completedSets: completedSets.length,
      totalVolume: Math.round(completedSets.reduce((sum, set) => sum + set.weightKg * set.reps, 0)),
      exerciseStats: [...exerciseStatsMap.values()].sort((a, b) => b.volume - a.volume),
    },
    sleep: { loggedDays: sleepLogs.length, avgHours: sleepHours.length ? sleepHours.reduce((a, b) => a + b, 0) / sleepHours.length : undefined, goalRate: sleepLogs.length ? Math.round(sleepLogs.filter(log => log.durationMinutes >= 480).length / sleepLogs.length * 100) : undefined, goalHours: 8 },
    nutrition: { loggedDays: mealDays.length, avgKcal: avg('kcal'), avgProtein: avg('protein'), avgCarbs: avg('carbs'), avgFat: avg('fat'), calorieGoal: 2250 },
    body: {
      loggedDays: bodyPoints.length, latestWeightKg: latestWeight,
      weightChangeKg: bodyPoints.length > 1 ? round(bodyPoints.at(-1)!.value - bodyPoints[0]!.value) : undefined,
      latestBodyFatPercent: latestFat,
      bodyFatChangePercent: fatPoints.length > 1 ? round(fatPoints.at(-1)!.value - fatPoints[0]!.value) : undefined,
      targetWeightKg: 70, weightSeries: bodyPoints, bodyFatSeries: fatPoints,
    },
    habits: { habitCount: habits.length, completedLogs: completedHabitLogs, loggedEntries: loggedHabitEntries, loggingCoverageRate: activeHabitDays ? Math.round(loggedHabitEntries / activeHabitDays * 100) : undefined, checkInCompletionRate: loggedHabitEntries ? Math.round(completedHabitLogs / loggedHabitEntries * 100) : undefined, currentStreaks: streaks },
    goals: { calorieGoal: 2250, sleepGoalHours: 8, targetWeightKg: 70 },
    missingData,
    dailyRecords,
  };
}

export function countScenarioInputs(data: TrainingAnalytics) {
  return {
    days: data.dailyRecords.length,
    mealEntries: data.dailyRecords.reduce((sum, day) => sum + day.meals.length, 0),
    sleepEntries: data.dailyRecords.filter(day => day.sleep !== null).length,
    trainingSessions: data.dailyRecords.reduce((sum, day) => sum + day.sessions.length, 0),
    bodyEntries: data.dailyRecords.filter(day => day.body !== null).length,
    habitCheckins: data.dailyRecords.reduce((sum, day) => sum + day.habits.filter(habit => habit.logged).length, 0),
  };
}
