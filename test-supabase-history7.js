import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

let supabaseUrl = process.env.VITE_SUPABASE_URL;
if(supabaseUrl && supabaseUrl.endsWith('/rest/v1/')) {
    supabaseUrl = supabaseUrl.replace('/rest/v1/', '');
}

const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
if(supabaseUrl && supabaseAnonKey) {
  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  supabase.rpc('fn_dashboard_kpis', { p_period: '2026-08' }).then(({data, error}) => {
    console.log("RPC:", data, error);
  });
}
