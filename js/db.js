const SUPABASE_URL  = '';
const SUPABASE_ANON = '';

export const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON);
