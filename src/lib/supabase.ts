import { createClient } from '@supabase/supabase-js';

// --- SECURE SUPABASE CONFIGURATION ---
// These values are now pulled from your hidden .env file.
// This ensures your keys are never visible in your public GitHub repository.

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
