import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
async function run() {
  const { data, error } = await supabase.from('sales').select('period, total_amount');
  if (error) console.error(error);
  else {
    const sums = {};
    data.forEach(r => {
      sums[r.period] = (sums[r.period] || 0) + r.total_amount;
    });
    console.log(sums);
  }
}
run();
