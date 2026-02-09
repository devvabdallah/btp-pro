export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'

export async function GET(request: NextRequest) {
  try {
    // 1. Authentifier l'utilisateur
    // Priorité: header Authorization Bearer token, sinon fallback sur cookies
    let user = null

    const authHeader = request.headers.get('authorization')
    if (authHeader && authHeader.startsWith('Bearer ')) {
      // Utiliser le token depuis le header Authorization
      const token = authHeader.substring(7)
      const adminSupabase = createSupabaseAdminClient()
      const { data: { user: authUser }, error: userError } = await adminSupabase.auth.getUser(token)

      if (userError || !authUser) {
        return NextResponse.json(
          { error: 'Non authentifié' },
          { status: 401 }
        )
      }

      user = authUser
    } else {
      // Fallback: utiliser les cookies
      const supabase = await createSupabaseServerClient()
      const { data: { user: authUser }, error: userError } = await supabase.auth.getUser()

      if (userError || !authUser) {
        return NextResponse.json(
          { error: 'Non authentifié' },
          { status: 401 }
        )
      }

      user = authUser
    }

    // 2. Utiliser un client admin pour lire profiles et entreprises (bypass RLS)
    const supabaseAdmin = createSupabaseAdminClient()

    // 3. Récupérer le profil pour obtenir entreprise_id
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('entreprise_id, role')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      console.error('[Me Entreprise] Profil introuvable:', {
        userId: user.id,
        error: profileError,
        errorMessage: profileError?.message,
        errorCode: profileError?.code
      })
      return NextResponse.json(
        { error: 'Profil introuvable' },
        { status: 404 }
      )
    }

    if (!profile.entreprise_id) {
      console.error('[Me Entreprise] Utilisateur sans entreprise:', {
        userId: user.id
      })
      return NextResponse.json(
        { error: 'Entreprise introuvable' },
        { status: 404 }
      )
    }

    // 4. Récupérer l'entreprise
    const { data: entreprise, error: entrepriseError } = await supabaseAdmin
      .from('entreprises')
      .select('id, trial_started_at, trial_ends_at, subscription_status')
      .eq('id', profile.entreprise_id)
      .single()

    if (entrepriseError || !entreprise) {
      console.error('[Me Entreprise] Entreprise introuvable:', {
        userId: user.id,
        entrepriseId: profile.entreprise_id,
        error: entrepriseError,
        errorMessage: entrepriseError?.message,
        errorCode: entrepriseError?.code
      })
      return NextResponse.json(
        { error: 'Entreprise introuvable' },
        { status: 404 }
      )
    }

    // 5. Retourner les données
    return NextResponse.json({
      entrepriseId: entreprise.id,
      trial_started_at: entreprise.trial_started_at,
      trial_ends_at: entreprise.trial_ends_at,
      subscription_status: entreprise.subscription_status,
    })
  } catch (error) {
    console.error('[Me Entreprise] Error:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération de l\'entreprise' },
      { status: 500 }
    )
  }
}
