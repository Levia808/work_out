import { supabase, supabaseConfigured } from '../../lib/supabase';
import { getBodyMetric, getBodyMetrics, saveBodyMetric } from '../../lib/localData';
import type { BodyMetric } from '../../lib/types';
export async function getBodyTrend() { return getBodyMetrics(); }
export async function upsertBodyMetric(input: { userId?: string; measuredOn: string; weightKg?: number; bodyFatPercent?: number; waistCm?: number; waistMeasurementSite?: 'midpoint' | 'narrowest'; notes?: string }) {
  if (!supabaseConfigured) return saveBodyMetric({ measuredOn: input.measuredOn, weightKg: input.weightKg, bodyFatPercent: input.bodyFatPercent, waistCm: input.waistCm, waistMeasurementSite: input.waistMeasurementSite, notes: input.notes });
  const { data, error } = await supabase.from('body_metrics').upsert({ user_id: input.userId ?? (await supabase.auth.getUser()).data.user?.id, measured_on: input.measuredOn, weight_kg: input.weightKg, body_fat_percent: input.bodyFatPercent, waist_cm: input.waistCm, waist_measurement_site: input.waistMeasurementSite, notes: input.notes }).select().single();
  if (error) throw error;
  return data as unknown as BodyMetric;
}
export async function getTodayBodyMetric(date: string) { return getBodyMetric(date); }
