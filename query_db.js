import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
async function run() {
  const { data, error } = await supabase.from('vw_product_sales_pareto').select('*').limit(5);
  console.log("vw:", data, error);
  const { data: sData, error: sErr } = await supabase.from('sales').select('period').limit(5);
  console.log("sales:", sData, sErr);
}
run();
