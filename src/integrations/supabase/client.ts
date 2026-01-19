import { createClient, SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Create a null-safe client that won't crash the app if env vars are missing
let supabaseInstance: SupabaseClient | null = null;

if (SUPABASE_URL && SUPABASE_ANON_KEY) {
  supabaseInstance = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
} else {
  console.warn('[Supabase] Missing environment variables. Coinglass integration will use fallback.');
}

// Export a proxy that handles null gracefully
export const supabase = {
  functions: {
    invoke: async (functionName: string, options?: { body?: unknown }) => {
      if (!supabaseInstance) {
        console.warn(`[Supabase] Cannot invoke ${functionName} - client not initialized`);
        return { data: null, error: new Error('Supabase not configured') };
      }
      return supabaseInstance.functions.invoke(functionName, options);
    }
  },
  // Add other methods as needed
  auth: supabaseInstance?.auth,
  from: supabaseInstance?.from.bind(supabaseInstance),
  storage: supabaseInstance?.storage,
  realtime: supabaseInstance?.realtime
};
