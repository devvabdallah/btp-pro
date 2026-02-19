// lib/supabase/server.ts
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export function createSupabaseServer() {
  const cookieStore = cookies();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll() {
        // IMPORTANT: Interdit dans Server Components (Next.js).
        // Les cookies Supabase doivent être écrits uniquement dans:
        // - Route Handlers (app/api/*)
        // - Middleware (via NextResponse)
      },
    },
  });
}

// Alias async pour compatibilité avec le code existant (layout.tsx)
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll() {
        // IMPORTANT: Interdit dans Server Components (Next.js).
        // Les cookies Supabase doivent être écrits uniquement dans:
        // - Route Handlers (app/api/*)
        // - Middleware (via NextResponse)
      },
    },
  });
}
