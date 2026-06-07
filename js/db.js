const SUPABASE_URL  = 'https://tcegnkvivvjzbkealeno.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRjZWdua3ZpdnZqemJrZWFsZW5vIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA3ODk2OTQsImV4cCI6MjA5NjM2NTY5NH0.DowowhInp7nxRrrw6FLTHXq-Kn3ftQTFIlFuVBodJnU';

export const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON);
