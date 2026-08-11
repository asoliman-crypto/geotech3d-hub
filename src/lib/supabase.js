import { createClient } from "@supabase/supabase-js";

// Vite exposes env vars prefixed with VITE_ to the browser. When these are not
// set (e.g. the portable offline demo, or before the backend is wired up) the
// whole app transparently falls back to localStorage — nothing breaks.
const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(url && anonKey);

export const supabase = isSupabaseConfigured
  ? createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
      },
    })
  : null;

// A throwaway client that never touches the stored session. Used when an admin
// registers a colleague: signUp() would otherwise replace the admin's own
// session with the new user's.
export function createDetachedClient() {
  if (!isSupabaseConfigured) return null;
  return createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
