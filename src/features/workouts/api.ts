import { supabase, supabaseConfigured } from '../../lib/supabase';
export async function saveWorkoutSet(input: { sessionId: string; exerciseId: string; setNumber: number; weightKg: number; reps: number; userId: string }) {
  if (!supabaseConfigured) return input;
  const { data, error } = await supabase.from('workout_sets').upsert({ session_id: input.sessionId, exercise_id: input.exerciseId, set_number: input.setNumber, weight_kg: input.weightKg, reps: input.reps, user_id: input.userId }).select().single();
  if (error) throw error;
  return data;
}
