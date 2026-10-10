export type NavKey = 'dashboard' | 'workouts' | 'records' | 'stats';
export type TrendPoint = { date: string; value: number };
export type WeekMode = 'every' | 'odd' | 'even';
export type AiProvider = 'qwen' | 'deepseek';
export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export type WorkoutTodo = { id: string; label: string; completed: boolean };
export type WorkoutExercise = {
  id: string;
  name: string;
  muscleGroup: string;
  instructions: string;
  todos: WorkoutTodo[];
};
export type PlanItem = {
  id: string;
  exerciseId: string;
  sortOrder: number;
  targetSets: number;
  targetReps: number;
  targetWeightKg?: number;
};
export type WorkoutPlanImportExercise = { name: string; muscleGroup?: string; instructions?: string; todos?: string[]; targetSets: number; targetReps: number; targetWeightKg?: number };
export type WorkoutPlanImport = { title: string; weekday: number; weekMode: WeekMode; exercises: WorkoutPlanImportExercise[] };

export type WorkoutPlan = {
  id: string;
  title: string;
  weekday: number;
  weekMode: WeekMode;
  active: boolean;
  items: PlanItem[];
  exercises: WorkoutExercise[];
  createdAt: string;
  updatedAt: string;
};
export type WorkoutSet = { id: string; exerciseId: string; setNumber: number; weightKg: number; reps: number; completed: boolean };
export type WorkoutSession = { id: string; planId: string; startedAt: string; endedAt?: string; sets: WorkoutSet[] };

export type FoodLog = {
  id: string;
  loggedOn: string;
  meal: MealType;
  name: string;
  grams?: number;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  source?: 'manual' | 'ai';
  notes?: string;
};
export type Habit = { id: string; name: string; icon: string; createdAt: string };
export type HabitLog = { id: string; habitId: string; loggedOn: string; completed: boolean };
export type SleepLog = { id: string; loggedOn: string; fellAsleepAt: string; wokeAt: string; durationMinutes: number; quality?: number };
export type BodyMetric = { id: string; measuredOn: string; weightKg?: number; bodyFatPercent?: number; waistCm?: number; notes?: string };
export type UserSettings = { calorieGoal?: number; sleepGoalMinutes?: number; targetWeightKg?: number; aiProvider?: AiProvider; qwenApiKey?: string; deepseekApiKey?: string };

export type DashboardData = {
  trainingProgress: number;
  calories: number;
  calorieGoal?: number;
  sleepHours?: number;
  sleepGoal?: number;
  habitProgress: number;
  weight?: number;
  weightUnit: string;
  volume: number;
  habitCount: number;
  habitTotal: number;
  todayPlan?: WorkoutPlan;
};
