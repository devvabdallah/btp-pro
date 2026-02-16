import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { checkCompanyActive } from '@/lib/subscription-check'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  // Vérifier que le debug est activé
  if (process.env.DEBUG_SUBSCRIPTION !== '1') {
    return NextResponse.json(
      { error: 'Debug non activé' },
      { status: 404 }
    )
  }

  try {
    // Vérifier la session Supabase
    const supabase = createSupabaseServer()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({
        timestamp: new Date().toISOString(),
        userId: null,
        companyId: null,
        error: 'Session non disponible',
        userError: userError?.message || null,
      })
    }

    // Déduire companyId depuis le profil utilisateur
    const supabaseAdmin = createSupabaseAdminClient()
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('entreprise_id')
      .eq('id', user.id)
      .single()

    if (profileError || !profile || !profile.entreprise_id) {
      return NextResponse.json({
        timestamp: new Date().toISOString(),
        userId: user.id,
        companyId: null,
        error: 'Entreprise introuvable',
        profileError: profileError?.message || null,
      })
    }

    const companyId = profile.entreprise_id

    // Récupérer les données de l'entreprise depuis Supabase
    const { data: entreprise, error: entrepriseError } = await supabaseAdmin
      .from('entreprises')
      .select('id, subscription_status, subscription_current_period_end, stripe_customer_id, stripe_subscription_id, trial_ends_at, trial_started_at')
      .eq('id', companyId)
      .single()

    // Vérifier le statut via checkCompanyActive
    const { active, error: activeError } = await checkCompanyActive(supabase, companyId)

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      userId: user.id,
      userEmail: user.email,
      companyId,
      isCompanyActive: active,
      activeError: activeError || null,
      entreprise: entreprise || null,
      entrepriseError: entrepriseError?.message || null,
      subscriptionStatus: entreprise?.subscription_status || null,
      subscriptionCurrentPeriodEnd: entreprise?.subscription_current_period_end || null,
      stripeCustomerId: entreprise?.stripe_customer_id || null,
      stripeSubscriptionId: entreprise?.stripe_subscription_id || null,
      trialEndsAt: entreprise?.trial_ends_at || null,
      trialStartedAt: entreprise?.trial_started_at || null,
    })
  } catch (error) {
    console.error('[Debug Subscription Status] Erreur:', error)
    return NextResponse.json(
      {
        timestamp: new Date().toISOString(),
        error: 'Erreur inconnue',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}
