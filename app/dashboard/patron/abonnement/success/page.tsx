import { redirect } from 'next/navigation'
import { createSupabaseServer } from '@/lib/supabase/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import Stripe from 'stripe'

export const dynamic = 'force-dynamic'

export default async function AbonnementSuccessPage({
  searchParams,
}: {
  searchParams: { session_id?: string }
}) {
  const sessionId = searchParams.session_id

  if (!sessionId) {
    redirect('/dashboard/patron/abonnement?error=no_session')
  }

  // Vérifier que l'utilisateur est connecté
  const supabase = createSupabaseServer()
  const { data: { user }, error: userError } = await supabase.auth.getUser()

  if (userError || !user) {
    redirect('/login')
  }

  // Finaliser le checkout directement dans le Server Component
  try {
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY
    if (!stripeSecretKey) {
      redirect('/dashboard/patron/abonnement?error=stripe_not_configured')
    }

    // Déduire companyId depuis le profil utilisateur
    const supabaseAdmin = createSupabaseAdminClient()
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('entreprise_id')
      .eq('id', user.id)
      .single()

    if (profileError || !profile || !profile.entreprise_id) {
      redirect('/dashboard/patron/abonnement?error=company_not_found')
    }

    const companyId = profile.entreprise_id

    // Récupérer la Checkout Session depuis Stripe
    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2023-10-16',
    })

    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['subscription'],
    })

    if (!session) {
      redirect('/dashboard/patron/abonnement?error=session_not_found')
    }

    // Vérifier que la session appartient bien à cette entreprise
    const sessionCompanyId = session.metadata?.companyId || session.client_reference_id
    if (sessionCompanyId && sessionCompanyId !== companyId) {
      redirect('/dashboard/patron/abonnement?error=session_mismatch')
    }

    // Extraire les informations de l'abonnement
    const subscription = session.subscription as Stripe.Subscription | null
    const customerId = session.customer as string | null

    if (!subscription) {
      redirect('/dashboard/patron/abonnement?error=subscription_not_found')
    }

    const subscriptionStatus = subscription.status
    const currentPeriodEnd = subscription.current_period_end
      ? new Date(subscription.current_period_end * 1000).toISOString()
      : null

    // Si subscription.status in ["active","trialing"], activer l'entreprise
    if (subscriptionStatus === 'active' || subscriptionStatus === 'trialing') {
      const updateData: any = {
        subscription_status: subscriptionStatus === 'trialing' ? 'trialing' : 'active',
        subscription_current_period_end: currentPeriodEnd,
        updated_at: new Date().toISOString(),
      }

      // Ajouter stripe_customer_id et stripe_subscription_id
      if (customerId) {
        updateData.stripe_customer_id = customerId
      }
      updateData.stripe_subscription_id = subscription.id

      const { error: updateError } = await supabaseAdmin
        .from('entreprises')
        .update(updateData)
        .eq('id', companyId)

      if (updateError) {
        console.error('[Abonnement Success] Erreur lors de la mise à jour:', updateError)
        redirect('/dashboard/patron/abonnement?error=update_failed')
      }

      console.log('[Abonnement Success] Entreprise activée', {
        companyId,
        customerId,
        subscriptionId: subscription.id,
        subscriptionStatus,
        currentPeriodEnd,
      })

      // Rediriger vers le dashboard après activation réussie
      redirect('/dashboard/patron/abonnement?success=1')
    }

    // Si le statut n'est pas actif/trialing
    console.log('[Abonnement Success] Abonnement non actif', {
      companyId,
      subscriptionStatus,
    })

    redirect('/dashboard/patron/abonnement?error=subscription_not_active')
  } catch (error) {
    console.error('[Abonnement Success] Erreur:', error)
    redirect('/dashboard/patron/abonnement?error=finalize_error')
  }
}
