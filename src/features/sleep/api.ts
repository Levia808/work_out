import { supabase, supabaseConfigured } from '../../lib/supabase';
import { getSleepLog, saveSleepLog } from '../../lib/localData';
import type { SleepLog } from '../../lib/types';
export async function upsertSleepLog(input: { userId?: string; loggedOn: string; fellAsleepAt: string; wokeAt: string; durationMinutes: number; quality?: number }) {
  if (!supabaseConfigured) return saveSleepLog({ loggedOn: input.loggedOn, fellAsleepAt: input.fellAsleepAt, wokeAt: input.wokeAt, durationMinutes: input.durationMinutes, quality: input.quality });
  const { data, error } = await supabase.from('sleep_logs').upsert({ user_id: input.userId ?? (await supabase.auth.getUser()).data.user?.id, logged_on: input.loggedOn, fell_asleep_at: input.fellAsleepAt, woke_at: input.wokeAt, quality: input.quality }).select().single();
  if (error) throw error;
  return data as unknown as SleepLog;
}
export async function getLatestSleepLog(loggedOn?: string) { return getSleepLog(loggedOn); }
