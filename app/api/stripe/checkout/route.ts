import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createSupabaseServerClient } from '@/lib/supabase/server'
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

    // 3. Lire le body pour obtenir companyId (lecture robuste)
    const body = await request.json().catch(() => ({}))

    // Extraire l'identifiant entreprise de façon tolérante
    const companyId = body?.companyId || body?.entrepriseId || body?.entreprise_id

    // Log pour debugging
    console.log('[Stripe Checkout] companyId received:', companyId)

    if (!companyId) {
      console.error('[Stripe Checkout] companyId manquant dans le body:', {
        bodyKeys: Object.keys(body || {}),
        bodyType: typeof body,
        hasCompanyId: 'companyId' in (body || {}),
        hasEntrepriseId: 'entrepriseId' in (body || {}),
        hasEntreprise_id: 'entreprise_id' in (body || {})
      })
      return NextResponse.json(
        { error: 'companyId manquant' },
        { status: 400 }
      )
    }

    // 4. Récupérer l'utilisateur connecté
    // Priorité: header Authorization Bearer token, sinon fallback sur cookies
    let user = null
    let supabase = null

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
      // Utiliser le client admin pour les requêtes suivantes
      supabase = adminSupabase
    } else {
      // Fallback: utiliser les cookies
      supabase = await createSupabaseServerClient()
      const { data: { user: authUser }, error: userError } = await supabase.auth.getUser()

      if (userError || !authUser) {
        return NextResponse.json(
          { error: 'Non authentifié' },
          { status: 401 }
        )
      }

      user = authUser
    }

    // 5. Utiliser un client admin pour lire profiles et entreprises (bypass RLS)
    const supabaseAdmin = createSupabaseAdminClient()

    // 5.1. Récupérer le profil pour vérifier le rôle et l'entreprise_id
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('role, entreprise_id')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      console.error('[Stripe Checkout] Profil introuvable:', {
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

    // Vérifier que c'est un patron
    if (profile.role !== 'patron') {
      return NextResponse.json(
        { error: 'Seuls les patrons peuvent s\'abonner' },
        { status: 403 }
      )
    }

    // 5.2. Vérifier que l'utilisateur a accès à cette entreprise
    if (!profile.entreprise_id) {
      console.error('[Stripe Checkout] Utilisateur sans entreprise:', {
        userId: user.id,
        companyId: companyId
      })
      return NextResponse.json(
        { error: 'Entreprise introuvable' },
        { status: 404 }
      )
    }

    // 5.3. Comparer profile.entreprise_id avec companyId du body
    if (profile.entreprise_id !== companyId) {
      console.error('[Stripe Checkout] Accès refusé - entreprise_id ne correspond pas:', {
        userId: user.id,
        profileEntrepriseId: profile.entreprise_id,
        requestedCompanyId: companyId
      })
      return NextResponse.json(
        { error: 'Accès refusé' },
        { status: 403 }
      )
    }

    // 6. Récupérer l'entreprise pour vérifier/créer le customer Stripe
    console.log('[Stripe Checkout] Recherche entreprise:', {
      userId: user.id,
      companyId: companyId,
      table: 'entreprises',
      colonne: 'id'
    })
    
    const { data: entreprise, error: entrepriseError } = await supabaseAdmin
      .from('entreprises')
      .select('id, name, stripe_customer_id')
      .eq('id', companyId)
      .single()

    if (entrepriseError || !entreprise) {
      console.error('[Stripe Checkout] Entreprise introuvable:', {
        userId: user.id,
        companyId: companyId,
        error: entrepriseError,
        errorMessage: entrepriseError?.message,
        errorCode: entrepriseError?.code,
        errorDetails: entrepriseError?.details,
        errorHint: entrepriseError?.hint
      })
      return NextResponse.json(
        { error: 'Entreprise introuvable' },
        { status: 404 }
      )
    }

    // 7. Créer ou récupérer le customer Stripe
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

    // 8. Récupérer APP_URL depuis les variables d'environnement
    const appUrl = process.env.APP_URL

    if (!appUrl) {
      console.error('[Stripe Checkout] APP_URL manquant')
      return NextResponse.json(
        { error: 'Configuration incomplète' },
        { status: 500 }
      )
    }

    // 9. Créer la session Stripe Checkout
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
