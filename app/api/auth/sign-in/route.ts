import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
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

  // Créer la réponse qui recevra les cookies
  const res = NextResponse.json({ ok: true });

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        // Utiliser request.cookies.getAll() au lieu du parsing manuel
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: Array<{ name: string; value: string; options?: any }>) {
        cookiesToSet.forEach(({ name, value, options }) => {
          // Respecter exactement les options fournies par Supabase, sans modification
          res.cookies.set(name, value, options);
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
