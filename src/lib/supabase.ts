import { createClient } from '@supabase/supabase-js';
import { Database } from '../types/database.types';

const placeholderUrl = 'https://placeholder.supabase.co';
const placeholderKey = 'placeholder-key';

const rawSupabaseUrl = (import.meta.env.VITE_SUPABASE_URL ?? '').trim();
const rawSupabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY ?? '').trim();

export const isSupabaseConfigured =
  Boolean(rawSupabaseUrl && rawSupabaseAnonKey) &&
  rawSupabaseUrl !== placeholderUrl &&
  rawSupabaseAnonKey !== placeholderKey;

const supabaseUrl = rawSupabaseUrl || placeholderUrl;
const supabaseAnonKey = rawSupabaseAnonKey || placeholderKey;

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);
