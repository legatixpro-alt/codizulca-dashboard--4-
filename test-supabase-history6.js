import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

// The user has a bad URL format in their VITE_SUPABASE_URL (includes /rest/v1/).
let supabaseUrl = process.env.VITE_SUPABASE_URL;
if(supabaseUrl && supabaseUrl.endsWith('/rest/v1/')) {
    supabaseUrl = supabaseUrl.replace('/rest/v1/', '');
}

const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
console.log("Fixed URL:", supabaseUrl);
if(supabaseUrl && supabaseAnonKey) {
  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  supabase.from('sales').select('period').limit(1).then(({data, error}) => {
    console.log("Sales periods from env:", data, error);
  });
}
