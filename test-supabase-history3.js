import dotenv from 'dotenv';
dotenv.config();
console.log("URL:", process.env.VITE_SUPABASE_URL ? "Has URL" : "No URL");
console.log("Key:", process.env.VITE_SUPABASE_ANON_KEY ? "Has Key" : "No Key");
