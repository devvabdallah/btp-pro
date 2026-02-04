import { createClient } from '@supabase/supabase-js'

/**
 * Client Supabase Admin avec SERVICE_ROLE_KEY
 * ⚠️ À utiliser UNIQUEMENT côté serveur (API routes, webhooks)
 * ⚠️ Bypass RLS - utiliser avec précaution
 */
export function createSupabaseAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    const missing = []
    if (!supabaseUrl) missing.push('NEXT_PUBLIC_SUPABASE_URL')
    if (!supabaseServiceRoleKey) missing.push('SUPABASE_SERVICE_ROLE_KEY')
    throw new Error(
      `Supabase admin env missing: ${missing.join(' or ')}. Vérifie ton fichier .env.local.`
    )
  }

  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
