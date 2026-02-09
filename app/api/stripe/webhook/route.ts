import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'

// Configuration pour recevoir le raw body (nécessaire pour Stripe webhooks)
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  // 1. Vérifier les variables d'environnement Stripe (uniquement à l'exécution)
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

  if (!stripeSecretKey || !webhookSecret) {
    console.error('[Stripe Webhook] Variables d\'environnement Stripe manquantes:', {
      hasSecretKey: !!stripeSecretKey,
      hasWebhookSecret: !!webhookSecret,
    })
    return NextResponse.json(
      { error: 'Stripe non configuré' },
      { status: 500 }
    )
  }

  // 2. Initialiser Stripe uniquement si les variables sont présentes
  const stripe = new Stripe(stripeSecretKey, {
    apiVersion: '2023-10-16',
  })

  const body = await request.text()
  const signature = request.headers.get('stripe-signature')

  if (!signature) {
    console.error('[Stripe Webhook] Signature manquante')
    return NextResponse.json(
      { error: 'Signature manquante' },
      { status: 400 }
    )
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      webhookSecret
    )
  } catch (err) {
    console.error('[Stripe Webhook] Signature verification failed:', err)
    return NextResponse.json(
      { error: 'Signature invalide' },
      { status: 400 }
    )
  }

  try {
    const supabaseAdmin = createSupabaseAdminClient()

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        
        // Récupérer companyId depuis session.metadata.companyId
        const companyId = session.metadata?.companyId

        if (!companyId) {
          console.warn('[WEBHOOK] companyId manquant dans metadata')
          return NextResponse.json({ received: true, warning: 'companyId manquant' })
        }

        console.log('[WEBHOOK] activation', {
          companyId,
          subscription: session.subscription,
          customer: session.customer
        })

        // Mettre à jour l'entreprise avec statut ACTIVE après paiement réussi
        const updateData: any = {
          subscription_status: 'active',
          updated_at: new Date().toISOString(),
        }

        // Optionnel: mettre à jour trial_ends_at pour éviter "reste 5 jours" après paiement
        if (session.mode === 'subscription' && session.subscription) {
          try {
            const subscription = await stripe.subscriptions.retrieve(
              session.subscription as string
            )
            updateData.stripe_customer_id = subscription.customer as string
            updateData.stripe_subscription_id = subscription.id
            updateData.subscription_current_period_end = subscription.current_period_end
              ? new Date(subscription.current_period_end * 1000).toISOString()
              : null
          } catch (err) {
            console.error('[WEBHOOK] Erreur lors de la récupération de la subscription:', err)
          }
        } else if (session.customer) {
          updateData.stripe_customer_id = session.customer as string
        }

        // Toujours mettre trial_ends_at à now() pour éviter "reste 5 jours" après paiement
        updateData.trial_ends_at = new Date().toISOString()

        const { error: updateError } = await supabaseAdmin
          .from('entreprises')
          .update(updateData)
          .eq('id', companyId)

        if (updateError) {
          console.error('[WEBHOOK] Erreur lors de la mise à jour de l\'entreprise:', updateError)
        } else {
          console.log('[WEBHOOK] Entreprise activée:', companyId)
        }

        return NextResponse.json({ received: true })
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        
        // Récupérer companyId depuis subscription.metadata.companyId ou company_id
        const companyId = subscription.metadata?.companyId || subscription.metadata?.company_id

        if (!companyId) {
          console.error('[Stripe Webhook] companyId manquant dans metadata pour subscription:', subscription.id)
          return NextResponse.json({ received: true, warning: 'companyId manquant' })
        }

        // Mettre à jour toutes les informations de l'abonnement
        const updateData: any = {
          stripe_customer_id: subscription.customer as string,
          stripe_subscription_id: subscription.id,
          subscription_status: subscription.status === 'active' ? 'active' : subscription.status,
          subscription_current_period_end: subscription.current_period_end
            ? new Date(subscription.current_period_end * 1000).toISOString()
            : null,
          updated_at: new Date().toISOString(),
        }

        const { error: updateError } = await supabaseAdmin
          .from('entreprises')
          .update(updateData)
          .eq('id', companyId)

        if (updateError) {
          console.error('[Stripe Webhook] Erreur lors de la mise à jour de l\'entreprise:', updateError)
          return NextResponse.json({ received: true, warning: 'Erreur mise à jour entreprise' })
        }

        console.log('[Stripe Webhook] Abonnement mis à jour pour entreprise:', companyId, 'status:', subscription.status)
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        
        // Récupérer companyId depuis subscription.metadata.companyId ou company_id
        const companyId = subscription.metadata?.companyId || subscription.metadata?.company_id

        if (!companyId) {
          console.error('[Stripe Webhook] companyId manquant dans metadata pour subscription:', subscription.id)
          return NextResponse.json({ received: true, warning: 'companyId manquant' })
        }

        // Mettre à jour le statut à inactive/expired
        const updateData: any = {
          subscription_status: 'inactive',
          stripe_subscription_id: subscription.id,
          subscription_current_period_end: subscription.current_period_end
            ? new Date(subscription.current_period_end * 1000).toISOString()
            : null,
          updated_at: new Date().toISOString(),
        }

        const { error: updateError } = await supabaseAdmin
          .from('entreprises')
          .update(updateData)
          .eq('id', companyId)

        if (updateError) {
          console.error('[Stripe Webhook] Erreur lors de la mise à jour de l\'entreprise:', updateError)
          return NextResponse.json({ received: true, warning: 'Erreur mise à jour entreprise' })
        }

        console.log('[Stripe Webhook] Abonnement supprimé pour entreprise:', companyId)
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        
        // Récupérer companyId depuis subscription metadata si présent
        let companyId: string | null = null
        
        if (invoice.subscription) {
          const subscriptionId = typeof invoice.subscription === 'string' 
            ? invoice.subscription 
            : invoice.subscription.id
          
          try {
            const subscription = await stripe.subscriptions.retrieve(subscriptionId)
            companyId = subscription.metadata?.companyId || subscription.metadata?.company_id
          } catch (err) {
            console.error('[Stripe Webhook] Erreur lors de la récupération de la subscription:', err)
          }
        }

        if (!companyId) {
          console.error('[Stripe Webhook] companyId manquant pour invoice.payment_failed:', invoice.id)
          return NextResponse.json({ received: true, warning: 'companyId manquant' })
        }

        // Mettre à jour le statut à inactive/expired
        const updateData: any = {
          subscription_status: 'past_due',
          updated_at: new Date().toISOString(),
        }

        const { error: updateError } = await supabaseAdmin
          .from('entreprises')
          .update(updateData)
          .eq('id', companyId)

        if (updateError) {
          console.error('[Stripe Webhook] Erreur lors de la mise à jour de l\'entreprise:', updateError)
          return NextResponse.json({ received: true, warning: 'Erreur mise à jour entreprise' })
        }

        console.log('[Stripe Webhook] Paiement échoué pour entreprise:', companyId)
        break
      }

      default:
        console.log('[Stripe Webhook] Event non géré:', event.type)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('[Stripe Webhook] Error processing event:', error)
    // Retourner 200 pour ne pas faire échouer Stripe, même en cas d'erreur
    return NextResponse.json({ received: true, error: 'Erreur lors du traitement du webhook' })
  }
}
