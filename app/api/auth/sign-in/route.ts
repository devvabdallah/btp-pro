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

  // Créer la réponse qui recevra les cookies
  const res = NextResponse.json({ ok: true });

  // Parser les cookies existants depuis les headers pour getAll()
  const cookieHeader = request.headers.get("cookie") ?? "";
  const existingCookies: Array<{ name: string; value: string }> = [];
  if (cookieHeader) {
    cookieHeader.split(";").forEach((cookie) => {
      const trimmed = cookie.trim();
      const equalIndex = trimmed.indexOf("=");
      if (equalIndex > 0) {
        const name = trimmed.substring(0, equalIndex).trim();
        const value = trimmed.substring(equalIndex + 1).trim();
        if (name && value) {
          existingCookies.push({ name, value });
        }
      }
    });
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        // Retourner les cookies existants parsés
        return existingCookies;
      },
      setAll(cookiesToSet: Array<{ name: string; value: string; options?: any }>) {
        cookiesToSet.forEach(({ name, value, options = {} }) => {
          // Préserver exactement les options fournies par Supabase
          const finalOptions = { ...options };

          // Si rememberMe === false, supprimer maxAge et expires pour rendre les cookies de session
          if (rememberMe === false) {
            delete finalOptions.maxAge;
            delete finalOptions.expires;
          }
          // Si rememberMe === true, ne rien modifier (laisser Supabase gérer la persistance)

          res.cookies.set(name, value, finalOptions);
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

  // Retourner la réponse avec les cookies déjà posés
  return res;
}
