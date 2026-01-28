'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import Button from '@/components/ui/Button'

export default function AbonnementPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isActive, setIsActive] = useState<boolean | null>(null)
  const [statusUnknown, setStatusUnknown] = useState(false)
  const [entrepriseId, setEntrepriseId] = useState<string | null>(null)
  const [daysRemaining, setDaysRemaining] = useState<number | null>(null)
  const [trialEndsAt, setTrialEndsAt] = useState<string | null>(null)

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

  useEffect(() => {
    async function load() {
      setLoading(true)
      setError(null)

      try {
        const supabase = createSupabaseBrowserClient()

        // 1. Récupérer l'utilisateur
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

        // 2. Récupérer le profile pour obtenir entreprise_id
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('entreprise_id')
          .eq('id', user.id)
          .single()

        if (profileError || !profile || !profile.entreprise_id) {
          console.error('[Abonnement] Profile error:', {
            context: 'get_profile',
            userId: user.id,
            error: profileError,
            profile: profile
          })
          setError('Entreprise introuvable')
          setLoading(false)
          return
        }

        const entrepriseIdValue = profile.entreprise_id
        setEntrepriseId(entrepriseIdValue)
        console.log('[Abonnement] Entreprise ID:', entrepriseIdValue)

        // 3. Récupérer l'entreprise avec select('*') pour éviter les erreurs de colonnes manquantes
        const { data: entrepriseData, error: entrepriseError } = await supabase
          .from('entreprises')
          .select('*')
          .eq('id', entrepriseIdValue)
          .single()

        if (entrepriseError || !entrepriseData) {
          console.error('[Abonnement] Entreprise fetch error:', {
            context: 'get_entreprise',
            entrepriseId: entrepriseIdValue,
            error: entrepriseError,
            message: entrepriseError?.message,
            details: entrepriseError?.details,
            hint: entrepriseError?.hint
          })
          setError('Erreur lors du chargement des informations d\'abonnement')
          setLoading(false)
          return
        }

        console.log('[Abonnement] Entreprise loaded:', {
          id: entrepriseData.id,
          name: entrepriseData.name,
          hasTrialEndsAt: !!entrepriseData.trial_ends_at
        })

        // 4. Calculer les jours restants si trial_ends_at existe
        if (entrepriseData.trial_ends_at) {
          const trialEnd = new Date(entrepriseData.trial_ends_at)
          const now = new Date()
          if (trialEnd > now) {
            const diffTime = trialEnd.getTime() - now.getTime()
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
            setDaysRemaining(diffDays)
            setTrialEndsAt(entrepriseData.trial_ends_at)
            console.log('[Abonnement] Trial days remaining:', diffDays)
          } else {
            setDaysRemaining(0)
            setTrialEndsAt(entrepriseData.trial_ends_at)
          }
        }

        // 5. Appeler RPC is_company_active avec plusieurs tentatives
        const isActiveResult = await checkCompanyActive(supabase, entrepriseIdValue)

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

  // Déterminer le statut de l'abonnement
  const getSubscriptionStatus = () => {
    // Si le statut est inconnu (toutes les tentatives RPC ont échoué)
    if (statusUnknown) {
      return 'unknown'
    }

    if (isActive === null) return null

    // Si l'entreprise est active selon le RPC
    if (isActive === true) {
      // Si on a un trial_ends_at et qu'il est dans le futur, c'est un essai gratuit actif
      if (trialEndsAt) {
        const trialEnd = new Date(trialEndsAt)
        const now = new Date()
        if (trialEnd > now && daysRemaining !== null && daysRemaining > 0) {
          return 'trial'
        }
      }
      // Sinon, c'est un abonnement actif
      return 'active'
    }

    // Si l'entreprise n'est pas active selon le RPC
    return 'expired'
  }

  const status = getSubscriptionStatus()

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-[#1a1f3a] rounded-3xl p-6 border border-[#2a2f4a]">
          <p className="text-gray-400 text-center py-8">Chargement...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl md:text-5xl font-bold text-white mb-8">Mon abonnement</h1>
        <div className="bg-red-500/20 border border-red-500/50 rounded-3xl p-6 mb-6">
          <p className="text-red-400">{error}</p>
        </div>
        <Link href="/dashboard/patron">
          <Button variant="secondary">Retour au dashboard</Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-4xl md:text-5xl font-bold text-white mb-8">Mon abonnement</h1>

      {/* Card principale */}
      <div className="bg-[#1a1f3a] rounded-3xl p-8 border border-[#2a2f4a]">
        {/* Badge statut */}
        <div className="mb-6">
          {status === 'active' && (
            <span className="inline-block px-4 py-2 rounded-full text-sm font-semibold bg-green-500/20 text-green-300 border border-green-500/30">
              Actif
            </span>
          )}
          {status === 'trial' && (
            <span className="inline-block px-4 py-2 rounded-full text-sm font-semibold bg-blue-500/20 text-blue-300 border border-blue-500/30">
              Essai gratuit
            </span>
          )}
          {status === 'expired' && (
            <span className="inline-block px-4 py-2 rounded-full text-sm font-semibold bg-red-500/20 text-red-300 border border-red-500/30">
              Expiré
            </span>
          )}
          {status === 'unknown' && (
            <span className="inline-block px-4 py-2 rounded-full text-sm font-semibold bg-gray-500/20 text-gray-300 border border-gray-500/30">
              Statut indisponible
            </span>
          )}
        </div>

        {/* Message si statut inconnu */}
        {status === 'unknown' && (
          <div className="mb-6 bg-gray-500/20 border border-gray-500/50 rounded-xl p-4">
            <p className="text-gray-300 text-sm">
              Statut indisponible (configuration en cours)
            </p>
          </div>
        )}

        {/* Informations */}
        <div className="space-y-4 mb-8">
          <div className="flex items-center justify-between py-3 border-b border-[#2a2f4a]">
            <span className="text-gray-400">Prix :</span>
            <span className="text-white font-semibold">50€/mois</span>
          </div>
          <div className="flex items-center justify-between py-3 border-b border-[#2a2f4a]">
            <span className="text-gray-400">Essai :</span>
            <span className="text-white font-semibold">5 jours</span>
          </div>
          {status === 'trial' && daysRemaining !== null && daysRemaining > 0 && (
            <div className="flex items-center justify-between py-3 border-b border-[#2a2f4a]">
              <span className="text-gray-400">Jours restants :</span>
              <span className="text-yellow-300 font-bold text-lg">{daysRemaining} jour{daysRemaining > 1 ? 's' : ''}</span>
            </div>
          )}
        </div>

        {/* Boutons */}
        <div className="flex flex-col sm:flex-row gap-4">
          {status === 'active' ? (
            <Button
              variant="primary"
              size="lg"
              onClick={() => router.push('/pricing')}
              className="w-full sm:w-auto"
            >
              Gérer mon abonnement
            </Button>
          ) : status === 'unknown' ? (
            <Button
              variant="primary"
              size="lg"
              onClick={() => router.push('/pricing')}
              className="w-full sm:w-auto"
            >
              Aller au paiement
            </Button>
          ) : (
            <Button
              variant="primary"
              size="lg"
              onClick={() => router.push('/pricing')}
              className="w-full sm:w-auto"
            >
              S'abonner
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
