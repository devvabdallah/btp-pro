import { createBrowserClient } from "@supabase/ssr";

/**
 * Crée un client Supabase pour le navigateur.
 * Utilise @supabase/ssr (cookies) pour rester cohérent avec la route API de login
 * qui pose des cookies via createServerClient.
 * Le paramètre rememberMe est conservé pour compatibilité mais ne change pas le storage
 * (le session lifetime est contrôlé par Supabase, défaut ~7 jours).
 */
export function createSupabaseBrowserClient(_rememberMe: boolean = true) {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
