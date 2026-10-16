import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

let supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
if(supabaseUrl && supabaseUrl.endsWith('/rest/v1/')) {
    supabaseUrl = supabaseUrl.replace('/rest/v1/', '');
}

const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if(supabaseUrl && supabaseServiceKey) {
  fetch(`${supabaseUrl}/rest/v1/`, { headers: { apikey: supabaseServiceKey }})
    .then(r => r.json())
    .then(j => console.log("Definitions (Service Key):", Object.keys(j.definitions || {})));
}
