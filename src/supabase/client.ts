import { createClient } from '@supabase/supabase-js';

export const supabaseUrl = 'https://nujbsrqgpaloumuciwbo.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im51amJzcnFncGFsb3VtdWNpd2JvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQwOTEzNTksImV4cCI6MjA4OTY2NzM1OX0.GbTWoqYwhQzHRL-nb9oootstKG_cEhOgmA3hDOXjasI';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
