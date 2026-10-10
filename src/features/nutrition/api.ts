import { foodLogs } from '../../lib/demoData';
import { totalCalories } from '../../lib/calculations';
export async function getTodayNutrition() { return { logs: foodLogs, calories: totalCalories(foodLogs), goal: 2200 }; }
