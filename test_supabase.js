import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'http://localhost:54321';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || 'dummy_key';
const supabase = createClient(supabaseUrl.replace('/rest/v1/', ''), supabaseAnonKey);

async function run() {
  const { data, error } = await supabase.from('history_sales').select('*').limit(5);
  console.log("Data:", data);
  console.log("Error:", error);
}
run();
