import { createClient } from '@supabase/supabase-js';

// --- SECURE SUPABASE CONFIGURATION ---
// These values are now pulled from your hidden .env file.
// This ensures your keys are never visible in your public GitHub repository.

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'http://127.0.0.1:54321';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'local-development-placeholder';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
