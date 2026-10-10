export type NavKey = 'dashboard' | 'workouts' | 'records' | 'stats';
export type TrendPoint = { date: string; value: number };
export type WorkoutPlan = { id: string; title: string; weekday: string; exercises: number; progress: number; active: boolean };
export type FoodLog = { id: string; meal: string; name: string; kcal: number; protein: number; carbs: number; fat: number };
export type Habit = { id: string; name: string; icon: string; streak: number; completed: boolean };
export type DashboardData = { trainingProgress: number; calories: number; calorieGoal: number; sleepHours: number; sleepGoal: number; habitProgress: number; weight: number; weightUnit: string; volume: number; habitCount: number; habitTotal: number };
