import { createClient } from "@supabase/supabase-js";

/**
 * Crée un client Supabase pour le navigateur avec gestion du storage selon rememberMe
 * @param rememberMe - Si true, utilise localStorage (persistant). Si false, utilise sessionStorage (session only)
 * @returns Instance du client Supabase
 */
export function createSupabaseBrowserClient(rememberMe: boolean = true) {
  const storage = rememberMe 
    ? (typeof window !== 'undefined' ? window.localStorage : undefined)
    : (typeof window !== 'undefined' ? window.sessionStorage : undefined);

  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storage: storage,
      },
    }
  );
}
