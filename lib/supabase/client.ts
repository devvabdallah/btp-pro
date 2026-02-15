import { createBrowserClient } from "@supabase/ssr";

function parseCookies() {
  const out: { name: string; value: string }[] = [];
  if (typeof document === "undefined") return out;
  const parts = document.cookie ? document.cookie.split("; ") : [];
  for (const p of parts) {
    const eq = p.indexOf("=");
    const name = eq >= 0 ? decodeURIComponent(p.slice(0, eq)) : decodeURIComponent(p);
    const value = eq >= 0 ? decodeURIComponent(p.slice(eq + 1)) : "";
    out.push({ name, value });
  }
  return out;
}

function setCookie(name: string, value: string, options: any = {}) {
  if (typeof document === "undefined") return;

  const opt = {
    path: "/",
    sameSite: "Lax",
    ...options,
  };

  let cookie = `${encodeURIComponent(name)}=${encodeURIComponent(value)}`;

  if (opt.maxAge != null) cookie += `; Max-Age=${opt.maxAge}`;
  if (opt.expires) cookie += `; Expires=${(opt.expires instanceof Date ? opt.expires : new Date(opt.expires)).toUTCString()}`;
  if (opt.path) cookie += `; Path=${opt.path}`;
  if (opt.domain) cookie += `; Domain=${opt.domain}`;
  if (opt.sameSite) cookie += `; SameSite=${opt.sameSite}`;
  if (opt.secure) cookie += `; Secure`;

  document.cookie = cookie;
}

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return parseCookies();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => setCookie(name, value, options));
        },
      },
    }
  );
}

// Alias pour compatibilité avec le code existant
export const createSupabaseBrowserClient = createClient;
