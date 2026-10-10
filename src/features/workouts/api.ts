import { supabase, supabaseConfigured } from '../../lib/supabase';
import { addExerciseToPlan, createPlan, createSession, finishSession, getActiveSession, getPlan, getPlans, saveWorkoutSet as saveLocalWorkoutSet, toggleTodo } from '../../lib/localData';
import type { WeekMode, WorkoutPlan, WorkoutSession } from '../../lib/types';

export async function getWorkoutPlans(): Promise<WorkoutPlan[]> {
  if (!supabaseConfigured) return getPlans();
  const { data, error } = await supabase.from('workout_plans').select('*, plan_items(*, exercises(*))').is('archived_at', null).order('weekday').order('sort_order');
  if (error) throw error;
  return (data ?? []) as unknown as WorkoutPlan[];
}
export async function createWorkoutPlan(input: { title: string; weekday: number; weekMode: WeekMode; exerciseName?: string; muscleGroup?: string; targetSets?: number; targetReps?: number }) {
  if (!supabaseConfigured) return createPlan(input);
  const { data: plan, error } = await supabase.from('workout_plans').insert({ title: input.title, weekday: input.weekday, week_mode: input.weekMode, user_id: (await supabase.auth.getUser()).data.user?.id }).select().single();
  if (error) throw error;
  return plan as unknown as WorkoutPlan;
}
export async function addPlanExercise(planId: string, input: { name: string; muscleGroup?: string; instructions?: string; targetSets: number; targetReps: number }) {
  if (!supabaseConfigured) return addExerciseToPlan(planId, input);
  const userId = (await supabase.auth.getUser()).data.user?.id;
  if (!userId) throw new Error('请先登录');
  const { data: exercise, error: exerciseError } = await supabase.from('exercises').insert({ user_id: userId, name: input.name, muscle_group: input.muscleGroup ?? '', instructions: input.instructions ?? '' }).select().single();
  if (exerciseError) throw exerciseError;
  const { error } = await supabase.from('plan_items').insert({ user_id: userId, plan_id: planId, exercise_id: exercise.id, target_sets: input.targetSets, target_reps: input.targetReps });
  if (error) throw error;
  return getPlan(planId);
}
export async function startWorkout(planId: string): Promise<WorkoutSession> {
  if (!supabaseConfigured) return getActiveSession(planId) ?? createSession(planId);
  const userId = (await supabase.auth.getUser()).data.user?.id;
  if (!userId) throw new Error('请先登录');
  const { data, error } = await supabase.from('workout_sessions').insert({ user_id: userId, plan_id: planId }).select().single();
  if (error) throw error;
  return { id: String(data.id), planId, startedAt: String(data.started_at), sets: [] };
}
export async function saveSet(input: { sessionId: string; exerciseId: string; setNumber: number; weightKg: number; reps: number; completed: boolean; userId?: string }) {
  if (!supabaseConfigured) return saveLocalWorkoutSet(input.sessionId, { exerciseId: input.exerciseId, setNumber: input.setNumber, weightKg: input.weightKg, reps: input.reps, completed: input.completed });
  const userId = input.userId ?? (await supabase.auth.getUser()).data.user?.id;
  if (!userId) throw new Error('请先登录');
  const { data, error } = await supabase.from('workout_sets').upsert({ user_id: userId, session_id: input.sessionId, exercise_id: input.exerciseId, set_number: input.setNumber, weight_kg: input.weightKg, reps: input.reps, completed_at: input.completed ? new Date().toISOString() : null }).select().single();
  if (error) throw error;
  return data;
}
export async function completeWorkout(sessionId: string) {
  if (!supabaseConfigured) return finishSession(sessionId);
  const { data, error } = await supabase.from('workout_sessions').update({ ended_at: new Date().toISOString() }).eq('id', sessionId).select().single();
  if (error) throw error;
  return data;
}
export async function toggleWorkoutTodo(planId: string, exerciseId: string, todoId: string) { return toggleTodo(planId, exerciseId, todoId); }
