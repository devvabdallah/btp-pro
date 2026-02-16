import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  let step = 'start'
  try {
    // 1. Vérifier les variables d'environnement Stripe (uniquement à l'exécution)
    step = 'stripe_init'
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY
    const priceId = process.env.STRIPE_PRICE_ID

    if (!stripeSecretKey || !priceId) {
      console.error('[Stripe Checkout] Variables d\'environnement Stripe manquantes:', {
        hasSecretKey: !!stripeSecretKey,
        hasPriceId: !!priceId,
      })
      return NextResponse.json(
        {
          error: 'Stripe non configuré',
          step,
          details: {
            hasSecretKey: !!stripeSecretKey,
            hasPriceId: !!priceId,
          }
        },
        { status: 500 }
      )
    }

    // 2. Initialiser Stripe uniquement si les variables sont présentes
    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2023-10-16',
    })

    // 3. Lire et valider le header Authorization (source unique d'authentification)
    step = 'parse_auth_header'
    const authHeader = request.headers.get('authorization') || request.headers.get('Authorization')
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        {
          error: 'Session non disponible',
          step,
          details: {
            hasAuthHeader: !!authHeader,
            authHeaderPrefix: authHeader?.substring(0, 10) || 'none'
          }
        },
        { status: 401 }
      )
    }

    const token = authHeader.replace('Bearer ', '').trim()

    if (!token) {
      return NextResponse.json(
        {
          error: 'Session non disponible',
          step,
          details: {
            hasToken: false
          }
        },
        { status: 401 }
      )
    }

    // 4. Lire le body pour obtenir companyId
    step = 'parse_body'
    const body = await request.json().catch(() => ({}))
    const companyId = body?.companyId || body?.entrepriseId || body?.entreprise_id

    if (!companyId) {
      return NextResponse.json(
        {
          error: 'companyId manquant',
          step,
          details: {
            bodyKeys: Object.keys(body || {})
          }
        },
        { status: 400 }
      )
    }

    // 5. Authentifier l'utilisateur avec le token (via admin)
    step = 'auth_get_user'
    const supabaseAdmin = createSupabaseAdminClient()
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token)

    if (userError || !user) {
      return NextResponse.json(
        {
          error: 'Session non disponible',
          step,
          details: {
            hasUserError: !!userError,
            errorCode: userError?.code,
            errorMessage: userError?.message
          }
        },
        { status: 401 }
      )
    }

    // 6. Vérifier l'accès : lire le profil
    step = 'load_profile'
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('entreprise_id, role')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json(
        {
          error: 'Entreprise introuvable',
          step,
          details: {
            userId: user.id,
            hasProfileError: !!profileError,
            errorCode: profileError?.code,
            errorMessage: profileError?.message
          }
        },
        { status: 404 }
      )
    }

    if (!profile.entreprise_id) {
      return NextResponse.json(
        {
          error: 'Entreprise introuvable',
          step,
          details: {
            userId: user.id,
            hasProfile: !!profile,
            hasEntrepriseId: false
          }
        },
        { status: 404 }
      )
    }

    // Vérifier que c'est un patron
    step = 'check_access'
    if (profile.role !== 'patron') {
      return NextResponse.json(
        {
          error: 'Seuls les patrons peuvent s\'abonner',
          step,
          details: {
            role: profile.role
          }
        },
        { status: 403 }
      )
    }

    // Comparer profile.entreprise_id avec companyId du body
    if (profile.entreprise_id !== companyId) {
      return NextResponse.json(
        {
          error: 'Accès refusé',
          step,
          details: {
            profileEntrepriseId: profile.entreprise_id,
            requestedCompanyId: companyId
          }
        },
        { status: 403 }
      )
    }

    // 7. Log clair (sans secrets)
    console.log('[Stripe Checkout] user:', user.id, 'companyId:', companyId, 'profileEntrepriseId:', profile.entreprise_id)

    // 8. Charger l'entreprise
    step = 'load_entreprise'
    const { data: entreprise, error: entrepriseError } = await supabaseAdmin
      .from('entreprises')
      .select('*')
      .eq('id', companyId)
      .single()

    if (entrepriseError || !entreprise) {
      return NextResponse.json(
        {
          error: 'Entreprise introuvable',
          step,
          details: {
            companyId,
            hasEntrepriseError: !!entrepriseError,
            errorCode: entrepriseError?.code,
            errorMessage: entrepriseError?.message
          }
        },
        { status: 404 }
      )
    }

    // 9. Créer ou récupérer le customer Stripe
    step = 'stripe_customer'
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

    // 10. Récupérer APP_URL depuis les variables d'environnement ou utiliser localhost en dev
    step = 'check_app_url'
    const appUrl = process.env.NODE_ENV === 'production' 
      ? (process.env.APP_URL || 'https://your-domain.com')
      : 'http://localhost:3000'

    if (!appUrl) {
      console.error('[Stripe Checkout] APP_URL manquant')
      return NextResponse.json(
        {
          error: 'Configuration incomplète',
          step,
          details: {
            missing: 'APP_URL'
          }
        },
        { status: 500 }
      )
    }

    // 11. Vérifier explicitement les variables d'environnement Stripe avant l'appel
    step = 'stripe_init'
    if (!stripeSecretKey) {
      return NextResponse.json(
        {
          error: 'Config Stripe manquante: STRIPE_SECRET_KEY',
          step,
          details: {
            missing: 'STRIPE_SECRET_KEY'
          }
        },
        { status: 500 }
      )
    }

    if (!priceId) {
      return NextResponse.json(
        {
          error: 'Config Stripe manquante: STRIPE_PRICE_ID',
          step,
          details: {
            missing: 'STRIPE_PRICE_ID'
          }
        },
        { status: 500 }
      )
    }

    // 11. Vérifier explicitement les variables d'environnement Stripe avant l'appel
    step = 'stripe_init'
    if (!stripeSecretKey) {
      return NextResponse.json(
        {
          error: 'Config Stripe manquante: STRIPE_SECRET_KEY',
          step,
          details: {
            missing: 'STRIPE_SECRET_KEY'
          }
        },
        { status: 500 }
      )
    }

    if (!priceId) {
      return NextResponse.json(
        {
          error: 'Config Stripe manquante: STRIPE_PRICE_ID',
          step,
          details: {
            missing: 'STRIPE_PRICE_ID'
          }
        },
        { status: 500 }
      )
    }

    // 12. Log avant l'appel Stripe (safe, sans secrets)
    const successUrl = `${appUrl}/stripe/success?session_id={CHECKOUT_SESSION_ID}`
    const cancelUrl = `${appUrl}/abonnement-expire?canceled=1`
    
    console.log('[stripe-checkout] creating session', {
      userId: user.id,
      companyId,
      success_url: successUrl,
      cancel_url: cancelUrl,
    })

    // 13. Créer la session Stripe Checkout avec gestion d'erreur détaillée
    step = 'stripe_create_session'
    let session
    try {
      session = await stripe.checkout.sessions.create({
        mode: 'subscription',
        locale: 'fr',
        payment_method_types: ['card'],
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        success_url: successUrl,
        cancel_url: cancelUrl,
        client_reference_id: companyId,
        metadata: {
          companyId: companyId,
          company_id: entreprise.id,
          entreprise_id: entreprise.id,
          user_id: user.id,
        },
        subscription_data: {
          metadata: {
            companyId: companyId,
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
          step,
          details: safe,
        },
        { status: 500 }
      )
    }

    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error('[Stripe Checkout] Error:', error)
    const err = error as any
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : 'Erreur inconnue',
        step,
        details: {
          name: err && typeof err === 'object' ? err.name : undefined
        }
      },
      { status: 500 }
    )
  }
}
