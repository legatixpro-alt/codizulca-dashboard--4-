import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/database';

const DEFAULT_SUPABASE_URL = 'https://uterioexpfweghxfbvoa.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV0ZXJpb2V4cGZ3ZWdoeGZidm9hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc5NTg3ODYsImV4cCI6MjEwMzUzNDc4Nn0.bZnN4vrXUDlcoIaI7l39O-bU4GQp05SvJdio_cn6niI';

let supabaseUrl = import.meta.env.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL;
if (supabaseUrl.endsWith('/rest/v1/')) {
    supabaseUrl = supabaseUrl.replace('/rest/v1/', '');
}

const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY;

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);
