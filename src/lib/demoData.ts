import type { DashboardData, FoodLog, Habit, TrendPoint, WorkoutPlan } from './types';

/** @deprecated Pages read from localData; these exports remain only for old integrations. */
export const dashboardData: DashboardData = { trainingProgress: 0, calories: 0, habitProgress: 0, weightUnit: 'kg', volume: 0, habitCount: 0, habitTotal: 0 };
export const workoutPlans: WorkoutPlan[] = [];
export const weightTrend: TrendPoint[] = [];
export const foodLogs: FoodLog[] = [];
export const habits: Habit[] = [];
