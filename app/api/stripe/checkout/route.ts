import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    // 1. Vérifier les variables d'environnement Stripe (uniquement à l'exécution)
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY
    const priceId = process.env.STRIPE_PRICE_ID

    if (!stripeSecretKey || !priceId) {
      console.error('[Stripe Checkout] Variables d\'environnement Stripe manquantes:', {
        hasSecretKey: !!stripeSecretKey,
        hasPriceId: !!priceId,
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

    // 3. Récupérer l'utilisateur connecté
    const supabase = await createSupabaseServerClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      )
    }

    // 4. Récupérer le profil pour obtenir entreprise_id
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

    // 5. Récupérer l'entreprise pour vérifier/créer le customer Stripe
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

    // 6. Créer ou récupérer le customer Stripe
    let customerId = entreprise.stripe_customer_id

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email!,
        metadata: {
          company_id: entreprise.id,
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

    // 7. Récupérer APP_URL depuis les variables d'environnement
    const appUrl = process.env.APP_URL

    if (!appUrl) {
      console.error('[Stripe Checkout] APP_URL manquant')
      return NextResponse.json(
        { error: 'Configuration incomplète' },
        { status: 500 }
      )
    }

    // 8. Créer la session Stripe Checkout
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${appUrl}/dashboard/patron/abonnement?success=1`,
      cancel_url: `${appUrl}/dashboard/patron/abonnement?canceled=1`,
      metadata: {
        company_id: entreprise.id,
        entreprise_id: entreprise.id,
        user_id: user.id,
      },
      subscription_data: {
        metadata: {
          company_id: entreprise.id,
          entreprise_id: entreprise.id,
        },
      },
    })

    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error('[Stripe Checkout] Error:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la création de la session de paiement' },
      { status: 500 }
    )
  }
}
