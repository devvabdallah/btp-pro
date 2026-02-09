'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import Button from '@/components/ui/Button'

export default function AbonnementPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isActive, setIsActive] = useState<boolean | null>(null)
  const [statusUnknown, setStatusUnknown] = useState(false)
  const [entrepriseId, setEntrepriseId] = useState<string | null>(null)
  const [daysRemaining, setDaysRemaining] = useState<number | null>(null)
  const [trialEndsAt, setTrialEndsAt] = useState<string | null>(null)
  const [trialStartedAt, setTrialStartedAt] = useState<string | null>(null)
  const [subscriptionStatus, setSubscriptionStatus] = useState<string | null>(null)
  const [loadingCheckout, setLoadingCheckout] = useState(false)
  const [checkoutError, setCheckoutError] = useState<string | null>(null)
  const [checkoutSuccess, setCheckoutSuccess] = useState(false)

  // Helper pour vérifier si l'entreprise est active avec plusieurs tentatives de noms de paramètres
  async function checkCompanyActive(supabase: any, entrepriseIdValue: string): Promise<boolean | null> {
    const attempts = [
      { paramName: 'entreprise_id', value: entrepriseIdValue },
      { paramName: 'p_entreprise_id', value: entrepriseIdValue },
      { paramName: 'company_id', value: entrepriseIdValue },
      { paramName: 'id', value: entrepriseIdValue }
    ]

    const errors: Array<{ paramName: string; error: any }> = []

    for (const attempt of attempts) {
      try {
        const { data, error: rpcError } = await supabase.rpc('is_company_active', {
          [attempt.paramName]: attempt.value
        })

        if (!rpcError && data !== null && data !== undefined) {
          console.log('[Abonnement] RPC success:', {
            paramName: attempt.paramName,
            entrepriseId: entrepriseIdValue,
            isActive: data
          })
          return data === true
        }

        if (rpcError) {
          errors.push({
            paramName: attempt.paramName,
            error: {
              message: rpcError.message,
              details: rpcError.details,
              hint: rpcError.hint,
              code: rpcError.code
            }
          })
        }
      } catch (err) {
        errors.push({
          paramName: attempt.paramName,
          error: err instanceof Error ? err.message : 'Unknown error'
        })
      }
    }

    // Toutes les tentatives ont échoué
    console.error('[Abonnement] All RPC attempts failed:', {
      context: 'is_company_active',
      entrepriseId: entrepriseIdValue,
      attempts: errors.map(e => ({
        paramName: e.paramName,
        message: e.error?.message || e.error
      }))
    })

    return null
  }

  // Vérifier les paramètres de query string pour success/canceled
  useEffect(() => {
    const success = searchParams.get('success')
    const canceled = searchParams.get('canceled')

    if (success === '1') {
      setCheckoutSuccess(true)
      // Nettoyer l'URL
      router.replace('/dashboard/patron/abonnement')
      // Recharger les données après un court délai
      setTimeout(() => {
        window.location.reload()
      }, 2000)
    } else if (canceled === '1') {
      setCheckoutError('Paiement annulé')
      // Nettoyer l'URL
      router.replace('/dashboard/patron/abonnement')
    }
  }, [searchParams, router])

  useEffect(() => {
    async function load() {
      setLoading(true)
      setError(null)

      try {
        const supabase = createSupabaseBrowserClient()

        // 1. Récupérer l'utilisateur pour obtenir le token
        const { data: { user }, error: userError } = await supabase.auth.getUser()

        if (userError || !user) {
          console.error('[Abonnement] User error:', {
            context: 'get_user',
            error: userError
          })
          router.push('/login')
          return
        }

        console.log('[Abonnement] User loaded:', user.id)

        // 2. Récupérer la session pour obtenir le token d'accès
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()

        if (sessionError || !session) {
          console.error('[Abonnement] Session error:', {
            context: 'get_session',
            error: sessionError
          })
          router.push('/login')
          return
        }

        const accessToken = session.access_token

        // 3. Appeler l'endpoint serveur pour obtenir les données de l'entreprise
        const response = await fetch('/api/me/entreprise', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          credentials: 'include',
        })

        if (!response.ok) {
          const data = await response.json().catch(() => ({}))
          const errorMessage = data.error || 'Erreur lors du chargement des informations d\'abonnement'
          
          if (response.status === 404) {
            setError('Entreprise introuvable')
          } else if (response.status === 401) {
            router.push('/login')
            return
          } else {
            setError(errorMessage)
          }
          setLoading(false)
          return
        }

        const entrepriseData = await response.json()

        // 4. Remplir les états avec les données de l'API
        setEntrepriseId(entrepriseData.entrepriseId)
        setTrialEndsAt(entrepriseData.trial_ends_at)
        setTrialStartedAt(entrepriseData.trial_started_at)
        setSubscriptionStatus(entrepriseData.subscription_status)

        // 5. Calculer les jours restants à partir de trial_ends_at
        if (entrepriseData.trial_ends_at) {
          const diffTime = new Date(entrepriseData.trial_ends_at).getTime() - Date.now()
          const diffDays = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)))
          setDaysRemaining(diffDays)
        } else {
          setDaysRemaining(null)
        }

        // Log de debug
        console.log('[Abonnement] Entreprise subscription:', {
          subscription_status: entrepriseData.subscription_status,
          trial_starts_at: entrepriseData.trial_started_at,
          trial_ends_at: entrepriseData.trial_ends_at,
          daysRemaining: entrepriseData.trial_ends_at 
            ? Math.max(0, Math.ceil((new Date(entrepriseData.trial_ends_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
            : null
        })

        // 6. Appeler RPC is_company_active avec plusieurs tentatives
        const isActiveResult = await checkCompanyActive(supabase, entrepriseData.entrepriseId)

        if (isActiveResult === null) {
          // Toutes les tentatives ont échoué, afficher statut "unknown"
          setStatusUnknown(true)
          setIsActive(null)
        } else {
          setIsActive(isActiveResult)
          setStatusUnknown(false)
        }

        setLoading(false)
      } catch (err) {
        console.error('[Abonnement] Unexpected error:', {
          context: 'load_subscription',
          error: err,
          message: err instanceof Error ? err.message : 'Unknown error'
        })
        setError('Une erreur inattendue est survenue')
        setLoading(false)
      }
    }

    load()
  }, [router])

  // Déterminer le statut de l'abonnement basé sur subscription_status de la DB
  const getSubscriptionStatus = () => {
    // Si le statut est inconnu (toutes les tentatives RPC ont échoué)
    if (statusUnknown) {
      return 'unknown'
    }

    // Si subscription_status === 'active' => afficher "Actif"
    if (subscriptionStatus === 'active') {
      return 'active'
    }

    // Sinon si daysRemaining !== null et daysRemaining > 0 => afficher "Essai gratuit"
    if (daysRemaining !== null && daysRemaining > 0) {
      return 'trial'
    }

    // Sinon => afficher "Expiré"
    return 'expired'
  }

  const status = getSubscriptionStatus()

  // Handler pour créer une session Stripe Checkout
  const handleSubscribe = async () => {
    setLoadingCheckout(true)
    setCheckoutError(null)

    try {
      // Vérifier que l'ID d'entreprise est disponible
      if (!entrepriseId) {
        throw new Error('Entreprise introuvable')
      }

      // Récupérer la session Supabase pour obtenir le token
      const supabase = createSupabaseBrowserClient()
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()

      if (sessionError || !session) {
        throw new Error('Session non disponible')
      }

      const accessToken = session.access_token

      console.log('[Abonnement] Envoi checkout:', {
        entrepriseId: entrepriseId,
        companyId: entrepriseId
      })

      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ companyId: entrepriseId }),
        credentials: 'include',
      })

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        const msg =
          data?.details?.message ||
          data?.error ||
          `Erreur checkout (${response.status})`
        throw new Error(msg)
      }

      const { url } = await response.json()

      if (!url) {
        throw new Error('URL de paiement non reçue')
      }

      // Rediriger vers Stripe Checkout
      window.location.href = url
    } catch (err) {
      console.error('[Abonnement] Erreur checkout:', err)
      setCheckoutError(err instanceof Error ? err.message : 'Erreur lors du démarrage du paiement')
      setLoadingCheckout(false)
    }
  }

  // Handler pour gérer l'abonnement (redirection vers Stripe Customer Portal)
  const handleManageSubscription = async () => {
    // Pour l'instant, rediriger vers la page d'abonnement Stripe
    // TODO: Implémenter Stripe Customer Portal si nécessaire
    setError('Gestion de l\'abonnement à venir')
  }

  if (loading) {
    return (
      <div className="space-y-8 md:space-y-12">
        <div className="bg-white/[0.02] backdrop-blur-sm rounded-xl p-8 md:p-10 border border-white/[0.06] shadow-sm">
          <p className="text-gray-400/80 text-center text-sm md:text-base">Chargement...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-8 md:space-y-12">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-5 md:gap-6">
          <div className="flex-1">
            <h1 className="text-[28px] md:text-4xl font-semibold text-white mb-3 tracking-[-0.02em] leading-[1.2]">
              Mon abonnement
            </h1>
            <p className="text-sm md:text-[15px] text-gray-400/90 leading-relaxed font-normal">
              Gérez votre abonnement BTP PRO
            </p>
          </div>
        </div>
        <div className="bg-red-500/20 border border-red-500/50 rounded-xl p-4 backdrop-blur-sm">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
        <Link href="/dashboard/patron">
          <Button variant="secondary">Retour au dashboard</Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-10 md:space-y-14">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6 md:gap-8">
        <div className="flex-1">
          <h1 className="text-[28px] md:text-4xl font-semibold text-white/95 mb-3.5 tracking-[-0.02em] leading-[1.15]">
            Mon abonnement
          </h1>
          <p className="text-sm md:text-[15px] text-gray-400/80 leading-relaxed font-normal">
            Gérez votre abonnement BTP PRO
          </p>
        </div>
      </div>

      {/* Card principale */}
      <div className="bg-white/[0.02] backdrop-blur-sm rounded-xl p-6 md:p-8 border border-white/[0.06] shadow-sm">
        {/* Badge statut */}
        <div className="mb-6">
          {status === 'active' && (
            <span className="inline-block px-2.5 py-1 rounded-full text-xs font-medium bg-green-500/20 text-green-300/95 border border-green-500/30">
              Actif
            </span>
          )}
          {status === 'trial' && (
            <span className="inline-block px-2.5 py-1 rounded-full text-xs font-medium bg-blue-500/20 text-blue-300/95 border border-blue-500/30">
              Essai gratuit
            </span>
          )}
          {status === 'expired' && (
            <span className="inline-block px-2.5 py-1 rounded-full text-xs font-medium bg-red-500/20 text-red-300/95 border border-red-500/30">
              Expiré
            </span>
          )}
          {status === 'unknown' && (
            <span className="inline-block px-2.5 py-1 rounded-full text-xs font-medium bg-gray-500/20 text-gray-300/95 border border-gray-500/30">
              Statut indisponible
            </span>
          )}
        </div>

        {/* Message si statut inconnu */}
        {status === 'unknown' && (
          <div className="mb-6 bg-gray-500/20 border border-gray-500/50 rounded-xl p-4 backdrop-blur-sm">
            <p className="text-gray-300/85 text-sm">
              Statut indisponible (configuration en cours)
            </p>
          </div>
        )}

        {/* Informations */}
        <div className="space-y-4 mb-8">
          <div className="flex items-center justify-between py-3.5 border-b border-white/[0.06]">
            <span className="text-gray-400/75 text-sm md:text-base">Prix :</span>
            <span className="text-white/95 font-semibold text-sm md:text-base tabular-nums tracking-tight">50€/mois</span>
          </div>
          {status === 'trial' && daysRemaining !== null && daysRemaining > 0 && (
            <div className="flex items-center justify-between py-3.5 border-b border-white/[0.06]">
              <span className="text-gray-400/75 text-sm md:text-base">Jours restants :</span>
              <span className="text-yellow-400/95 font-semibold text-base md:text-lg tabular-nums tracking-tight">{daysRemaining} jour{daysRemaining > 1 ? 's' : ''}</span>
            </div>
          )}
          {status === 'expired' && daysRemaining !== null && (
            <div className="flex items-center justify-between py-3.5 border-b border-white/[0.06]">
              <span className="text-gray-400/75 text-sm md:text-base">Jours restants :</span>
              <span className="text-red-400/95 font-semibold text-base md:text-lg tabular-nums tracking-tight">0 jour</span>
            </div>
          )}
        </div>

        {/* Message de succès checkout */}
        {checkoutSuccess && (
          <div className="mb-6 bg-green-500/20 border border-green-500/50 rounded-xl p-4 backdrop-blur-sm">
            <p className="text-green-400 text-sm">Paiement réussi ! Votre abonnement est en cours d'activation...</p>
          </div>
        )}

        {/* Message d'erreur checkout */}
        {checkoutError && (
          <div className="mb-6 bg-red-500/20 border border-red-500/50 rounded-xl p-4 backdrop-blur-sm">
            <p className="text-red-400 text-sm">{checkoutError}</p>
          </div>
        )}

        {/* Boutons */}
        <div className="flex flex-col sm:flex-row gap-4">
          {status === 'active' ? (
            <Button
              variant="primary"
              size="lg"
              onClick={handleManageSubscription}
              disabled={loadingCheckout}
              className="w-full sm:w-auto"
            >
              {loadingCheckout ? 'Chargement...' : 'Gérer mon abonnement'}
            </Button>
          ) : status === 'unknown' ? (
            <Button
              variant="primary"
              size="lg"
              onClick={handleSubscribe}
              disabled={loadingCheckout}
              className="w-full sm:w-auto"
            >
              {loadingCheckout ? 'Chargement...' : 'Aller au paiement'}
            </Button>
          ) : (
            <Button
              variant="primary"
              size="lg"
              onClick={handleSubscribe}
              disabled={loadingCheckout}
              className="w-full sm:w-auto"
            >
              {loadingCheckout ? 'Chargement...' : 'S\'abonner'}
            </Button>
          )}
          <Link href="/dashboard/patron" className="w-full sm:w-auto">
            <Button variant="secondary" size="lg" className="w-full sm:w-auto">
              Retour au dashboard
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
