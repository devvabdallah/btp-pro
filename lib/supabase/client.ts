import { createBrowserClient } from '@supabase/ssr'

export function createSupabaseBrowserClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    const missing = []
    if (!supabaseUrl) missing.push('NEXT_PUBLIC_SUPABASE_URL')
    if (!supabaseAnonKey) missing.push('NEXT_PUBLIC_SUPABASE_ANON_KEY')
    console.error('[Supabase Client] Variables d\'environnement manquantes:', missing.join(', '))
    throw new Error(
      `Missing Supabase environment variables: ${missing.join(' or ')}. Please check your .env.local file.`
    )
  }

  return createBrowserClient(supabaseUrl, supabaseAnonKey)
}

