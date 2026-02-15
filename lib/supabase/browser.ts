import { createBrowserClient } from "@supabase/ssr";

export function createBrowserSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  return createBrowserClient(url, anon, {
    cookies: {
      getAll() {
        if (typeof document === "undefined") return [];
        return document.cookie
          .split(";")
          .map((c) => c.trim())
          .filter(Boolean)
          .map((c) => {
            const idx = c.indexOf("=");
            return {
              name: decodeURIComponent(idx >= 0 ? c.slice(0, idx) : c),
              value: decodeURIComponent(idx >= 0 ? c.slice(idx + 1) : ""),
            };
          });
      },
      setAll(cookiesToSet) {
        if (typeof document === "undefined") return;
        cookiesToSet.forEach(({ name, value, options }) => {
          // options venant de Supabase (path, maxAge, expires, sameSite, secure)
          let cookie = `${encodeURIComponent(name)}=${encodeURIComponent(value)}`;
          const opt = options ?? {};
          cookie += `; Path=${opt.path ?? "/"}`;
          if (opt.maxAge != null) cookie += `; Max-Age=${opt.maxAge}`;
          if (opt.expires) cookie += `; Expires=${new Date(opt.expires).toUTCString()}`;
          if (opt.sameSite) cookie += `; SameSite=${opt.sameSite}`;
          if (opt.secure) cookie += `; Secure`;
          document.cookie = cookie;
        });
      },
    },
  });
}
