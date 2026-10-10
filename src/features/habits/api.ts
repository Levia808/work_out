import { getHabits, getHabitLogs, getHabitLog, habitStreak, saveHabit, toggleHabitLog } from '../../lib/localData';
export { getHabits };
export async function getTodayHabits() { return getHabits().map(habit => ({ ...habit, completed: getHabitLog(habit.id)?.completed ?? false, streak: habitStreak(habit.id) })); }
export async function createHabit(name: string) { return saveHabit(name); }
export async function toggleHabit(habitId: string) { return toggleHabitLog(habitId); }
export function getHabitHistory() { return getHabitLogs(); }
