import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/database';

let supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'http://localhost:54321';
if (supabaseUrl.endsWith('/rest/v1/')) {
    supabaseUrl = supabaseUrl.replace('/rest/v1/', '');
}

const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'dummy_key';

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);
