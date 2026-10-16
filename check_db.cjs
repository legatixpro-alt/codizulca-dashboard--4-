const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function check() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabase = createClient(url.replace('/rest/v1/', ''), key);
  
  const { data } = await supabase.from('history_sales').select('mes').limit(5);
  console.log(data);
}
check();
