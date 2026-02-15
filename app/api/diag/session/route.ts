import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.json(
      { ok: false, error: "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY" },
      { status: 500 }
    );
  }

  const cookieStore = cookies();

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll().map((c) => ({ name: c.name, value: c.value }));
      },
      setAll(cookiesToSet: Array<{ name: string; value: string; options?: any }>) {
        cookiesToSet.forEach(({ name, value, options }) => {
          cookieStore.set(name, value, options);
        });
      },
    },
  });

  const allCookies = cookieStore.getAll().map((c) => c.name);

  const { data, error } = await supabase.auth.getUser();

  return NextResponse.json({
    ok: !error,
    error: error?.message ?? null,
    hasUser: !!data?.user,
    userId: data?.user?.id ?? null,
    cookieNames: allCookies,
    hint:
      "Si hasUser=false juste après login, alors la session/cookies SSR ne sont pas écrits (set-session cassé) ou pas lus côté middleware.",
  });
}
