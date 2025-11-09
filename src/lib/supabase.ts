import { createClient } from '@supabase/supabase-js';
import { Database } from '../types/database.types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-key';

const isPlaceholderUrl = /placeholder|your-project-url/i.test(supabaseUrl);
const isPlaceholderKey = supabaseAnonKey === 'placeholder-key';

export const isSupabaseConfigured = !(isPlaceholderUrl || isPlaceholderKey);

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);
