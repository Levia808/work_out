import { supabase, supabaseConfigured } from '../../lib/supabase';
import { getMeals, saveMeal } from '../../lib/localData';
import type { FoodLog } from '../../lib/types';
export async function getTodayNutrition(loggedOn?: string) { const logs = getMeals(loggedOn); return { logs, calories: logs.reduce((sum, item) => sum + item.kcal, 0) }; }
export async function addMealLog(input: Omit<FoodLog, 'id'> & { userId?: string }) {
  if (!supabaseConfigured) return saveMeal(input);
  const { data, error } = await supabase.from('meal_logs').insert({ user_id: input.userId ?? (await supabase.auth.getUser()).data.user?.id, logged_on: input.loggedOn, meal_type: input.meal, food_name: input.name, grams: input.grams, calories: input.kcal, protein_g: input.protein, carbs_g: input.carbs, fat_g: input.fat, source: input.source ?? 'manual', notes: input.notes }).select().single();
  if (error) throw error;
  return data as unknown as FoodLog;
}
