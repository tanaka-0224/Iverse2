import { createClient } from '@supabase/supabase-js';
import { Database } from '../types/database.types';


export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);
