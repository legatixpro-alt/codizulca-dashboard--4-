import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'http://localhost:54321';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || 'dummy_key';
const supabase = createClient(supabaseUrl.replace('/rest/v1/', ''), supabaseAnonKey);

async function run() {
  // Can't easily query information_schema from PostgREST, but maybe we can just query another table?
  // Let's try historical_sales, history, ventas_historico, etc.
  
  const tables = ['historical_sales', 'ventas_historico', 'historial_ventas', 'ventas'];
  for (const t of tables) {
     const { data, error } = await supabase.from(t).select('*').limit(1);
     console.log(t, !!data, error ? error.message : null);
  }
}
run();
