import { supabase, supabaseConfigured } from '../../lib/supabase';
export async function upsertSleepLog(input: { userId: string; loggedOn: string; fellAsleepAt: string; wokeAt: string; quality?: number }) {
  if (!supabaseConfigured) return input;
  const { data, error } = await supabase.from('sleep_logs').upsert({ user_id: input.userId, logged_on: input.loggedOn, fell_asleep_at: input.fellAsleepAt, woke_at: input.wokeAt, quality: input.quality }).select().single();
  if (error) throw error;
  return data;
}
