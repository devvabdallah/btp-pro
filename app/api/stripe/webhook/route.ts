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
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        
        if (session.mode === 'subscription' && session.subscription) {
          const subscription = await stripe.subscriptions.retrieve(
            session.subscription as string
          )
          
          const supabaseAdmin = createSupabaseAdminClient()
          
          // Essayer d'abord avec les metadata
          let entrepriseId = session.metadata?.entreprise_id || subscription.metadata?.entreprise_id

          // Si pas de metadata, trouver l'entreprise via l'email du client
          if (!entrepriseId) {
            const customerEmail = session.customer_details?.email || session.customer_email
            
            if (customerEmail) {
              console.log('[Stripe Webhook] Recherche entreprise via email:', customerEmail)
              
              // Trouver l'entreprise via une jointure profiles + auth.users
              // Utiliser RPC ou requête directe avec l'email
              const { data: profiles, error: profileError } = await supabaseAdmin
                .from('profiles')
                .select('entreprise_id, id')
                .eq('role', 'patron')
              
              if (!profileError && profiles) {
                // Pour chaque profil, vérifier si l'email correspond
                for (const profile of profiles) {
                  try {
                    const { data: user } = await supabaseAdmin.auth.admin.getUserById(profile.id)
                    if (user?.user?.email === customerEmail) {
                      entrepriseId = profile.entreprise_id
                      console.log('[Stripe Webhook] Entreprise trouvée via email:', entrepriseId)
                      break
                    }
                  } catch (err) {
                    // Continuer avec le profil suivant
                    continue
                  }
                }
              }
            }
          }

          if (!entrepriseId) {
            console.error('[Stripe Webhook] Entreprise introuvable pour session:', session.id)
            // Retourner 200 pour ne pas faire échouer Stripe
            return NextResponse.json({ received: true, warning: 'Entreprise introuvable' })
          }

          // Mettre à jour l'entreprise : actif + subscription_id
          const { error: updateError } = await supabaseAdmin
            .from('entreprises')
            .update({
              is_active: true,
              stripe_subscription_id: subscription.id,
              stripe_customer_id: subscription.customer as string,
            })
            .eq('id', entrepriseId)

          if (updateError) {
            console.error('[Stripe Webhook] Erreur lors de la mise à jour de l\'entreprise:', updateError)
            // Retourner 200 pour ne pas faire échouer Stripe
            return NextResponse.json({ received: true, warning: 'Erreur mise à jour entreprise' })
          }

          console.log('[Stripe Webhook] Abonnement activé pour entreprise:', entrepriseId)
        }
        break
      }

      case 'customer.subscription.deleted':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        
        const entrepriseId = subscription.metadata?.entreprise_id

        if (!entrepriseId) {
          console.error('[Stripe Webhook] entreprise_id manquant dans metadata')
          break
        }

        const supabaseAdmin = createSupabaseAdminClient()
        
        // Si l'abonnement est annulé ou expiré
        if (subscription.status === 'canceled' || subscription.status === 'unpaid' || subscription.status === 'past_due') {
          await supabaseAdmin
            .from('entreprises')
            .update({
              is_active: false,
            })
            .eq('id', entrepriseId)

          console.log('[Stripe Webhook] Abonnement désactivé pour entreprise:', entrepriseId)
        } else if (subscription.status === 'active' || subscription.status === 'trialing') {
          // Si l'abonnement est actif ou en essai
          await supabaseAdmin
            .from('entreprises')
            .update({
              is_active: true,
              stripe_subscription_id: subscription.id,
            })
            .eq('id', entrepriseId)

          console.log('[Stripe Webhook] Abonnement activé pour entreprise:', entrepriseId)
        }
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        
        if (invoice.subscription) {
          const subscription = await stripe.subscriptions.retrieve(
            invoice.subscription as string
          )
          
          const entrepriseId = subscription.metadata?.entreprise_id

          if (!entrepriseId) {
            console.error('[Stripe Webhook] entreprise_id manquant dans metadata')
            break
          }

          // Désactiver l'abonnement en cas d'échec de paiement
          const supabaseAdmin = createSupabaseAdminClient()
          await supabaseAdmin
            .from('entreprises')
            .update({
              is_active: false,
            })
            .eq('id', entrepriseId)

          console.log('[Stripe Webhook] Paiement échoué, abonnement désactivé pour entreprise:', entrepriseId)
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
