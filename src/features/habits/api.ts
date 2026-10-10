import { habits } from '../../lib/demoData';
export async function getHabits() { return habits; }
export async function toggleHabit(habitId: string) { return { habitId, toggledAt: new Date().toISOString() }; }
