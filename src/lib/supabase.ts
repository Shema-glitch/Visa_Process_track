import { createClient } from '@supabase/supabase-js';

console.log('🔗 Supabase: Initializing client...');
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Supabase: Missing environment variables!', {
    url: !!supabaseUrl,
    key: !!supabaseAnonKey
  });
  // We still throw to prevent the app from running in a broken state, 
  // but now it's logged clearly.
  throw new Error('Missing Supabase environment variables. Check your .env file.');
}

console.log('✅ Supabase: Client initialized');
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
