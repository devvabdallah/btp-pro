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

  const { email, password } = await request.json().catch(() => ({}));

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
          response.cookies.set(name, value, options);
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
