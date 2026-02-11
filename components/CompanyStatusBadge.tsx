'use client'

import { useEffect, useState } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'

interface EntrepriseData {
  trial_ends_at: string | null
  subscription_status: string | null
}

type CompanyStatus = 'trial' | 'active' | 'expired'

/**
 * Détermine le statut de l'entreprise basé sur les données DB
 * Source de vérité: table entreprises (trial_ends_at, subscription_status)
 */
function getCompanyStatus(entreprise: EntrepriseData | null): CompanyStatus {
  // Guard: si pas de données, considérer comme expiré (sécurité)
  if (!entreprise) {
    console.warn('[CompanyStatusBadge] Entreprise data is null, defaulting to expired')
    return 'expired'
  }

  const { trial_ends_at, subscription_status } = entreprise

  // Si subscription_status indique un abonnement actif
  if (subscription_status === 'active') {
    return 'active'
  }

  // Si trial_ends_at existe ET maintenant < trial_ends_at ET subscription_status n'est pas actif
  if (trial_ends_at) {
    try {
      const trialEndTime = new Date(trial_ends_at).getTime()
      const nowTime = Date.now()
      
      // Guard: vérifier que la date est valide
      if (isNaN(trialEndTime)) {
        console.warn('[CompanyStatusBadge] Invalid trial_ends_at date:', trial_ends_at)
        return 'expired'
      }

      if (nowTime < trialEndTime && subscription_status !== 'active') {
        return 'trial'
      }
    } catch (err) {
      console.error('[CompanyStatusBadge] Error parsing trial_ends_at:', err)
      return 'expired'
    }
  }

  // Sinon: expiré
  return 'expired'
}

/**
 * Calcule le nombre de jours restants dans l'essai
 * Retourne 0 si l'essai est terminé ou si la date est invalide
 */
function calculateTrialDaysRemaining(trial_ends_at: string | null): number {
  if (!trial_ends_at) {
    return 0
  }

  try {
    const trialEndTime = new Date(trial_ends_at).getTime()
    const nowTime = Date.now()

    if (isNaN(trialEndTime)) {
      console.warn('[CompanyStatusBadge] Invalid trial_ends_at for calculation:', trial_ends_at)
      return 0
    }

    const diffTime = trialEndTime - nowTime
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    
    // Retourner au minimum 0 (pas de jours négatifs)
    return Math.max(0, diffDays)
  } catch (err) {
    console.error('[CompanyStatusBadge] Error calculating trial days:', err)
    return 0
  }
}

export default function CompanyStatusBadge() {
  const [status, setStatus] = useState<'loading' | CompanyStatus | 'error'>('loading')
  const [trialDays, setTrialDays] = useState<number | null>(null)

  useEffect(() => {
    async function loadStatus() {
      try {
        const supabase = createSupabaseBrowserClient()
        
        // 1. Récupérer l'utilisateur
        const { data: { user }, error: userError } = await supabase.auth.getUser()
        
        if (userError || !user) {
          console.warn('[CompanyStatusBadge] User not found:', userError)
          setStatus('error')
          return
        }

        // 2. Lire profiles.entreprise_id
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('entreprise_id')
          .eq('id', user.id)
          .single()

        if (profileError || !profile || !profile.entreprise_id) {
          console.warn('[CompanyStatusBadge] Profile or entreprise_id not found:', profileError)
          setStatus('error')
          return
        }

        // 3. Charger les données de l'entreprise (trial_ends_at, subscription_status)
        const { data: entreprise, error: entrepriseError } = await supabase
          .from('entreprises')
          .select('trial_ends_at, subscription_status')
          .eq('id', profile.entreprise_id)
          .single()

        if (entrepriseError || !entreprise) {
          console.error('[CompanyStatusBadge] Error loading entreprise:', entrepriseError)
          setStatus('error')
          return
        }

        // 4. Déterminer le statut avec la fonction unique
        const companyStatus = getCompanyStatus(entreprise)
        setStatus(companyStatus)

        // 5. Si essai, calculer les jours restants
        if (companyStatus === 'trial' && entreprise.trial_ends_at) {
          const days = calculateTrialDaysRemaining(entreprise.trial_ends_at)
          setTrialDays(days)
        } else {
          setTrialDays(null)
        }
      } catch (err) {
        console.error('[CompanyStatusBadge] Unexpected error:', err)
        setStatus('error')
      }
    }

    loadStatus()
  }, [])

  // Loading state
  if (status === 'loading') {
    return (
      <span className="px-3 py-1 rounded-full text-xs font-semibold bg-gray-500/20 text-gray-400 border border-gray-500/30">
        —
      </span>
    )
  }

  // Error state
  if (status === 'error') {
    return (
      <span className="px-3 py-1 rounded-full text-xs font-semibold bg-gray-500/20 text-gray-400 border border-gray-500/30">
        —
      </span>
    )
  }

  // Active state
  if (status === 'active') {
    return (
      <span className="px-3 py-1 rounded-full text-xs font-semibold bg-green-500/20 text-green-300 border border-green-500/30 flex items-center gap-1.5">
        <span className="w-2 h-2 rounded-full bg-green-400"></span>
        Actif
      </span>
    )
  }

  // Trial state
  if (status === 'trial') {
    const daysDisplay = trialDays !== null ? trialDays : 0
    return (
      <span className="px-3 py-1 rounded-full text-xs font-semibold bg-yellow-500/20 text-yellow-300 border border-yellow-500/30 flex items-center gap-1.5">
        <span className="w-2 h-2 rounded-full bg-yellow-400"></span>
        Essai — J-{daysDisplay}
      </span>
    )
  }

  // Expired state
  return (
    <span className="px-3 py-1 rounded-full text-xs font-semibold bg-red-500/20 text-red-300 border border-red-500/30 flex items-center gap-1.5">
      <span className="w-2 h-2 rounded-full bg-red-400"></span>
      Expiré
    </span>
  )
}
