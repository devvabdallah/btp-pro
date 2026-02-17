import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.json(
      { ok: false, error: "Missing Supabase env" },
      { status: 500 }
    );
  }

  const { email, password, rememberMe = true } = await request.json().catch(() => ({}));

  if (!email || !password) {
    return NextResponse.json(
      { ok: false, error: "Missing email/password" },
      { status: 400 }
    );
  }

  // IMPORTANT: response qui recevra les cookies
  const response = NextResponse.json({ ok: true });

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        // Next route handler: cookies via headers
        const cookie = request.headers.get("cookie") ?? "";
        // @supabase/ssr attend getAll() -> tableau, mais il sait aussi lire via cookie string
        // On renvoie vide ici et on laisse supabase gérer via setAll
        // (la vraie partie critique est setAll)
        return [];
      },
      setAll(cookiesToSet: Array<{ name: string; value: string; options?: any }>) {
        cookiesToSet.forEach(({ name, value, options }) => {
          // Préserver les options par défaut de Supabase (path, sameSite, secure, httpOnly)
          const cookieOptions = { ...options };
          
          // Si rememberMe est true, ajouter maxAge pour rendre le cookie persistant (30 jours)
          // Si rememberMe est false, ne pas mettre maxAge (cookie de session qui expire à la fermeture du navigateur)
          if (rememberMe === true) {
            cookieOptions.maxAge = 30 * 24 * 60 * 60; // 30 jours en secondes
          }
          // Si rememberMe est false, cookieOptions n'a pas de maxAge => cookie de session
          
          response.cookies.set(name, value, cookieOptions);
        });
      },
    },
  });

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 401 }
    );
  }

  // Recréer la réponse OK (avec cookies déjà posés)
  return response;
}
