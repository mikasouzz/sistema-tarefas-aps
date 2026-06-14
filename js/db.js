const SUPABASE_URL  = 'https://unrkcldkqrncejxsssui.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVucmtjbGRrcXJuY2VqeHNzc3VpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE0NDkyNjAsImV4cCI6MjA5NzAyNTI2MH0.rWVIQfPIzYnU4OGQ-0J2aohjcX1FPH2GC7zsWX3ffn0';

export const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON);
