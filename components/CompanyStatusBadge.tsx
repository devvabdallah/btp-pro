'use client'

import { useEffect, useState } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'

export default function CompanyStatusBadge() {
  const [status, setStatus] = useState<'loading' | 'active' | 'expired' | 'trial' | 'error'>('loading')
  const [trialDays, setTrialDays] = useState<number | null>(null)

  useEffect(() => {
    async function loadStatus() {
      try {
        const supabase = createSupabaseBrowserClient()
        
        // Récupérer l'utilisateur
        const { data: { user }, error: userError } = await supabase.auth.getUser()
        
        if (userError || !user) {
          setStatus('error')
          return
        }

        // Lire profiles.entreprise_id
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('entreprise_id')
          .eq('id', user.id)
          .single()

        if (profileError || !profile || !profile.entreprise_id) {
          setStatus('error')
          return
        }

        // Appeler RPC is_company_active
        const { data: isActive, error: activeError } = await supabase
          .rpc('is_company_active', { entreprise_id: profile.entreprise_id })

        if (activeError) {
          setStatus('error')
          return
        }

        if (isActive === true) {
          // Vérifier si c'est un essai (optionnel, seulement si l'info existe déjà)
          try {
            const { data: entreprise, error: entrepriseError } = await supabase
              .from('entreprises')
              .select('trial_ends_at')
              .eq('id', profile.entreprise_id)
              .single()

            if (!entrepriseError && entreprise?.trial_ends_at) {
              const trialEnd = new Date(entreprise.trial_ends_at)
              const now = new Date()
              if (trialEnd > now) {
                const diffTime = trialEnd.getTime() - now.getTime()
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
                if (diffDays > 0) {
                  setStatus('trial')
                  setTrialDays(diffDays)
                  return
                }
              }
            }
          } catch (err) {
            // Si l'info essai n'est pas disponible, on continue avec "active"
          }
          
          setStatus('active')
        } else {
          setStatus('expired')
        }
      } catch (err) {
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
  if (status === 'trial' && trialDays !== null) {
    return (
      <span className="px-3 py-1 rounded-full text-xs font-semibold bg-yellow-500/20 text-yellow-300 border border-yellow-500/30 flex items-center gap-1.5">
        <span className="w-2 h-2 rounded-full bg-yellow-400"></span>
        Essai – {trialDays}J
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
