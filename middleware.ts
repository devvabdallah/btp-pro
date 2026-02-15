import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function middleware(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Si env manquantes, ne bloque jamais (évite les 500)
  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.next();
  }

  // IMPORTANT: on crée une response liée à la request (pattern Supabase)
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: Array<{ name: string; value: string; options?: any }>) {
        // On écrit sur la request ET la response (sinon session instable en Edge/Vercel)
        cookiesToSet.forEach(({ name, value, options }) => {
          request.cookies.set(name, value);
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  // Lire la session depuis les cookies (fiable)
  const { data, error } = await supabase.auth.getSession();
  const session = data?.session;

  // Si pas de session => login (matcher limite déjà à /dashboard)
  if (error || !session) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
