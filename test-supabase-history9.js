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
  
  // Try querying anything, or checking the openapi spec
  fetch(`${supabaseUrl}/rest/v1/`, { headers: { apikey: supabaseAnonKey }})
    .then(r => r.json())
    .then(j => console.log("Definitions:", Object.keys(j.definitions || {})));
}
