import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'http://localhost:54321';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'dummy_key';
const supabase = createClient(supabaseUrl.replace('/rest/v1/', ''), supabaseKey);

async function run() {
  const { data, error } = await supabase.from('history_sales').select('*').limit(5);
  console.log("Data:", data);
  console.log("Error:", error);
}
run();
