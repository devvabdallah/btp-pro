import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createSupabaseServerClient } from '@/lib/supabase/server'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
})

export async function POST(request: NextRequest) {
  try {
    // 1. Récupérer l'utilisateur connecté
    const supabase = await createSupabaseServerClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      )
    }

    // 2. Récupérer le profil pour obtenir entreprise_id
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('entreprise_id, role')
      .eq('id', user.id)
      .single()

    if (profileError || !profile || !profile.entreprise_id) {
      return NextResponse.json(
        { error: 'Entreprise introuvable' },
        { status: 404 }
      )
    }

    // Vérifier que c'est un patron
    if (profile.role !== 'patron') {
      return NextResponse.json(
        { error: 'Seuls les patrons peuvent s\'abonner' },
        { status: 403 }
      )
    }

    // 3. Récupérer l'entreprise pour vérifier/créer le customer Stripe
    const { data: entreprise, error: entrepriseError } = await supabase
      .from('entreprises')
      .select('id, name, stripe_customer_id')
      .eq('id', profile.entreprise_id)
      .single()

    if (entrepriseError || !entreprise) {
      return NextResponse.json(
        { error: 'Entreprise introuvable' },
        { status: 404 }
      )
    }

    // 4. Créer ou récupérer le customer Stripe
    let customerId = entreprise.stripe_customer_id

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email!,
        metadata: {
          entreprise_id: entreprise.id,
          user_id: user.id,
        },
      })
      customerId = customer.id

      // Sauvegarder le customer_id dans Supabase
      await supabase
        .from('entreprises')
        .update({ stripe_customer_id: customerId })
        .eq('id', entreprise.id)
    }

    // 5. Récupérer le price ID depuis les variables d'environnement
    const priceId = process.env.STRIPE_PRICE_ID

    if (!priceId) {
      console.error('[Stripe Checkout] STRIPE_PRICE_ID manquant')
      return NextResponse.json(
        { error: 'Configuration Stripe incomplète' },
        { status: 500 }
      )
    }

    // 6. Créer la session Stripe Checkout
    const origin = request.headers.get('origin') || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      subscription_data: {
        trial_period_days: 5,
        metadata: {
          entreprise_id: entreprise.id,
        },
      },
      success_url: `${origin}/dashboard/patron?checkout=success`,
      cancel_url: `${origin}/dashboard/patron/abonnement?checkout=cancel`,
      metadata: {
        entreprise_id: entreprise.id,
        user_id: user.id,
      },
    })

    return NextResponse.json({ sessionId: session.id, url: session.url })
  } catch (error) {
    console.error('[Stripe Checkout] Error:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la création de la session de paiement' },
      { status: 500 }
    )
  }
}
