import { createClient } from '@supabase/supabase-js';
import { Database } from '../types/database.types';

const DEFAULT_SUPABASE_URL = 'https://placeholder.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY = 'placeholder-key';

const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL;
const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY;

export const isSupabaseConfigured =
  Boolean(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY) &&
  import.meta.env.VITE_SUPABASE_URL !== DEFAULT_SUPABASE_URL &&
  import.meta.env.VITE_SUPABASE_ANON_KEY !== DEFAULT_SUPABASE_ANON_KEY;

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);
