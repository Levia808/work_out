import type { DashboardData, FoodLog, Habit, TrendPoint, WorkoutPlan } from './types';

export const dashboardData: DashboardData = { trainingProgress: 68, calories: 1680, calorieGoal: 2200, sleepHours: 7.4, sleepGoal: 8, habitProgress: 72, weight: 68.4, weightUnit: 'kg', volume: 3200, habitCount: 3, habitTotal: 4 };
export const workoutPlans: WorkoutPlan[] = [
  { id: 'plan-1', title: '胸部 + 三头', weekday: '今天 · 周五', exercises: 5, progress: 1, active: true },
  { id: 'plan-2', title: '背部 + 二头 + 腿', weekday: '周一', exercises: 7, progress: 2, active: false }
];
export const foodLogs: FoodLog[] = [
  { id: 'food-1', meal: '早餐', name: '燕麦 + 希腊酸奶', kcal: 420, protein: 28, carbs: 52, fat: 12 },
  { id: 'food-2', meal: '午餐', name: '鸡胸肉藜麦沙拉', kcal: 580, protein: 46, carbs: 61, fat: 16 },
  { id: 'food-3', meal: '加餐', name: '香蕉蛋白奶昔', kcal: 260, protein: 24, carbs: 34, fat: 5 }
];
export const habits: Habit[] = [
  { id: 'habit-1', name: '喝水 2L', icon: 'Droplets', streak: 8, completed: true },
  { id: 'habit-2', name: '拉伸 10 分钟', icon: 'Move', streak: 4, completed: true },
  { id: 'habit-3', name: '阅读 20 分钟', icon: 'BookOpen', streak: 12, completed: false },
  { id: 'habit-4', name: '23:30 前入睡', icon: 'Moon', streak: 3, completed: false }
];
export const weightTrend: TrendPoint[] = [
  { date: '09/03', value: 70.2 }, { date: '09/10', value: 69.6 }, { date: '09/17', value: 69.1 }, { date: '09/24', value: 68.8 }, { date: '10/01', value: 68.6 }, { date: '10/09', value: 68.4 }
];
