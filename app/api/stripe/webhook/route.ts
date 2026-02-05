import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
})

// Configuration pour recevoir le raw body (nécessaire pour Stripe webhooks)
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const body = await request.text()
  const signature = request.headers.get('stripe-signature')

  if (!signature) {
    console.error('[Stripe Webhook] Signature manquante')
    return NextResponse.json(
      { error: 'Signature manquante' },
      { status: 400 }
    )
  }

  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    console.error('[Stripe Webhook] STRIPE_WEBHOOK_SECRET manquant')
    return NextResponse.json(
      { error: 'Configuration webhook manquante' },
      { status: 500 }
    )
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
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
        
        if (session.mode === 'subscription' && session.subscription) {
          const subscription = await stripe.subscriptions.retrieve(
            session.subscription as string
          )
          
          // Récupérer company_id depuis les metadata (priorité: session.metadata puis subscription.metadata)
          const companyId = session.metadata?.company_id || subscription.metadata?.company_id

          if (!companyId) {
            console.error('[Stripe Webhook] company_id manquant dans metadata pour session:', session.id)
            return NextResponse.json({ received: true, warning: 'company_id manquant' })
          }

          // Mettre à jour l'entreprise avec toutes les informations de l'abonnement
          const updateData: any = {
            stripe_customer_id: subscription.customer as string,
            stripe_subscription_id: subscription.id,
            subscription_status: subscription.status,
            subscription_current_period_end: subscription.current_period_end
              ? new Date(subscription.current_period_end * 1000).toISOString()
              : null,
          }

          const { error: updateError } = await supabaseAdmin
            .from('entreprises')
            .update(updateData)
            .eq('id', companyId)

          if (updateError) {
            console.error('[Stripe Webhook] Erreur lors de la mise à jour de l\'entreprise:', updateError)
            return NextResponse.json({ received: true, warning: 'Erreur mise à jour entreprise' })
          }

          console.log('[Stripe Webhook] Abonnement activé pour entreprise:', companyId)
        }
        break
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        
        const companyId = subscription.metadata?.company_id

        if (!companyId) {
          console.error('[Stripe Webhook] company_id manquant dans metadata pour subscription:', subscription.id)
          break
        }

        // Mettre à jour toutes les informations de l'abonnement
        const updateData: any = {
          stripe_customer_id: subscription.customer as string,
          stripe_subscription_id: subscription.id,
          subscription_status: subscription.status,
          subscription_current_period_end: subscription.current_period_end
            ? new Date(subscription.current_period_end * 1000).toISOString()
            : null,
        }

        const { error: updateError } = await supabaseAdmin
          .from('entreprises')
          .update(updateData)
          .eq('id', companyId)

        if (updateError) {
          console.error('[Stripe Webhook] Erreur lors de la mise à jour de l\'entreprise:', updateError)
        } else {
          console.log('[Stripe Webhook] Abonnement mis à jour pour entreprise:', companyId, 'status:', subscription.status)
        }
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        
        const companyId = subscription.metadata?.company_id

        if (!companyId) {
          console.error('[Stripe Webhook] company_id manquant dans metadata pour subscription:', subscription.id)
          break
        }

        // Mettre à jour le statut à 'canceled' ou 'expired'
        const updateData: any = {
          stripe_subscription_id: subscription.id,
          subscription_status: 'canceled',
          subscription_current_period_end: subscription.current_period_end
            ? new Date(subscription.current_period_end * 1000).toISOString()
            : null,
        }

        const { error: updateError } = await supabaseAdmin
          .from('entreprises')
          .update(updateData)
          .eq('id', companyId)

        if (updateError) {
          console.error('[Stripe Webhook] Erreur lors de la mise à jour de l\'entreprise:', updateError)
        } else {
          console.log('[Stripe Webhook] Abonnement supprimé pour entreprise:', companyId)
        }
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
