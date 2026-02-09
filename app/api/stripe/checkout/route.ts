import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'

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

    // 3. Lire et valider le header Authorization (source unique d'authentification)
    const authHeader = request.headers.get('authorization') || request.headers.get('Authorization')
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Session non disponible' },
        { status: 401 }
      )
    }

    const token = authHeader.replace('Bearer ', '').trim()

    if (!token) {
      return NextResponse.json(
        { error: 'Session non disponible' },
        { status: 401 }
      )
    }

    // 4. Lire le body pour obtenir companyId
    const body = await request.json().catch(() => ({}))
    const companyId = body?.companyId || body?.entrepriseId || body?.entreprise_id

    if (!companyId) {
      return NextResponse.json(
        { error: 'companyId manquant' },
        { status: 400 }
      )
    }

    // 5. Authentifier l'utilisateur avec le token (via admin)
    const supabaseAdmin = createSupabaseAdminClient()
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token)

    if (userError || !user) {
      return NextResponse.json(
        { error: 'Session non disponible' },
        { status: 401 }
      )
    }

    // 6. Vérifier l'accès : lire le profil
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('entreprise_id, role')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'Entreprise introuvable' },
        { status: 404 }
      )
    }

    if (!profile.entreprise_id) {
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

    // Comparer profile.entreprise_id avec companyId du body
    if (profile.entreprise_id !== companyId) {
      return NextResponse.json(
        { error: 'Accès refusé' },
        { status: 403 }
      )
    }

    // 7. Log clair (sans secrets)
    console.log('[Stripe Checkout] user:', user.id, 'companyId:', companyId, 'profileEntrepriseId:', profile.entreprise_id)

    // 8. Charger l'entreprise
    const { data: entreprise, error: entrepriseError } = await supabaseAdmin
      .from('entreprises')
      .select('*')
      .eq('id', companyId)
      .single()

    if (entrepriseError || !entreprise) {
      return NextResponse.json(
        { error: 'Entreprise introuvable' },
        { status: 404 }
      )
    }

    // 9. Créer ou récupérer le customer Stripe
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

      // Sauvegarder le customer_id dans Supabase (utiliser admin pour bypass RLS)
      await supabaseAdmin
        .from('entreprises')
        .update({ stripe_customer_id: customerId })
        .eq('id', entreprise.id)
    }

    // 10. Récupérer APP_URL depuis les variables d'environnement
    const appUrl = process.env.APP_URL

    if (!appUrl) {
      console.error('[Stripe Checkout] APP_URL manquant')
      return NextResponse.json(
        { error: 'Configuration incomplète' },
        { status: 500 }
      )
    }

    // 11. Vérifier explicitement les variables d'environnement Stripe avant l'appel
    if (!stripeSecretKey) {
      return NextResponse.json(
        { error: 'Config Stripe manquante: STRIPE_SECRET_KEY' },
        { status: 500 }
      )
    }

    if (!priceId) {
      return NextResponse.json(
        { error: 'Config Stripe manquante: STRIPE_PRICE_ID' },
        { status: 500 }
      )
    }

    // 12. Log avant l'appel Stripe (safe, sans secrets)
    console.log('[Stripe Checkout] Creating session', {
      companyId,
      priceId: priceId || 'MISSING',
      mode: 'subscription'
    })

    // 13. Créer la session Stripe Checkout avec gestion d'erreur détaillée
    let session
    try {
      session = await stripe.checkout.sessions.create({
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
    } catch (err) {
      // Construire un objet d'erreur safe (sans secrets)
      const stripeErr = err as any
      const safe = {
        type: stripeErr?.type,
        code: stripeErr?.code,
        message: stripeErr?.message,
        param: stripeErr?.param,
        statusCode: stripeErr?.statusCode,
      }

      console.error('[Stripe Checkout] Stripe error:', safe)

      return NextResponse.json(
        {
          error: safe.message || 'Erreur Stripe',
          details: safe,
        },
        { status: 500 }
      )
    }

    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error('[Stripe Checkout] Error:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la création de la session de paiement' },
      { status: 500 }
    )
  }
}
