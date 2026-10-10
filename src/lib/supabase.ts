import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

const url = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co';
const key = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-anon-key';
const placeholderValues = ['your-project.supabase.co', 'your-anon-key', 'placeholder.supabase.co', 'placeholder-anon-key'];
export const supabaseConfigured = Boolean(
  import.meta.env.VITE_SUPABASE_URL &&
  import.meta.env.VITE_SUPABASE_ANON_KEY &&
  !placeholderValues.some(value => url.includes(value) || key.includes(value)),
);
export const supabase = createClient<Database>(url, key, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } });
