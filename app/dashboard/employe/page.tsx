'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { getQuotes } from '@/lib/quotes-actions'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'

export default function EmployeDashboard() {
  const [quotes, setQuotes] = useState<any[]>([])
  const [nbChantiers, setNbChantiers] = useState<number>(0)
  const [nbClients, setNbClients] = useState<number>(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const supabase = createSupabaseBrowserClient()

        // 1. Récupérer l'utilisateur
        const { data: { user }, error: userError } = await supabase.auth.getUser()
        
        if (userError || !user) {
          setLoading(false)
          return
        }

        // 2. Récupérer le profil avec entreprise_id
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('entreprise_id')
          .eq('id', user.id)
          .single()

        if (profileError || !profile || !profile.entreprise_id) {
          setLoading(false)
          return
        }

        const entrepriseId = profile.entreprise_id

        // 3. Récupérer les devis (lecture seule)
        const quotesResult = await getQuotes()
        setQuotes(quotesResult.success ? quotesResult.quotes || [] : [])

        // 4. Compter les chantiers de l'entreprise
        const { count: chantiersCount, error: chantiersError } = await supabase
          .from('chantiers')
          .select('*', { count: 'exact', head: true })
          .eq('entreprise_id', entrepriseId)

        if (!chantiersError) {
          setNbChantiers(chantiersCount || 0)
        }

        // 5. Compter les clients de l'entreprise
        const { count: clientsCount, error: clientsError } = await supabase
          .from('clients')
          .select('*', { count: 'exact', head: true })
          .eq('entreprise_id', entrepriseId)

        if (!clientsError) {
          setNbClients(clientsCount || 0)
        }
      } catch (err) {
        console.error('Erreur lors du chargement:', err)
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [])

  // Formater le montant
  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount)
  }

  // Formater la date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  }

  // Badge de statut
  const getStatusBadge = (status: string) => {
    const styles = {
      brouillon: 'bg-gray-500/20 text-gray-300 border-gray-500/30',
      envoye: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
      accepte: 'bg-green-500/20 text-green-300 border-green-500/30',
      refuse: 'bg-red-500/20 text-red-300 border-red-500/30',
    }
    const labels = {
      brouillon: 'Brouillon',
      envoye: 'Envoyé',
      accepte: 'Accepté',
      refuse: 'Refusé',
    }
    return (
      <span
        className={`px-3 py-1 rounded-full text-xs font-semibold border ${styles[status as keyof typeof styles] || styles.brouillon}`}
      >
        {labels[status as keyof typeof labels] || status}
      </span>
    )
  }

  return (
    <div className="space-y-12 md:space-y-16 lg:space-y-20">
      <div>
        <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">Tableau de bord - Employé</h1>
        <p className="text-gray-400 text-sm md:text-base">Vue d'ensemble de votre activité</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
        <div className="bg-[#1a1f3a] rounded-3xl p-8 border border-[#2a2f4a]">
          <p className="text-gray-400 text-sm mb-2">Chantiers</p>
          <p className="text-3xl font-bold text-green-300">{loading ? '...' : nbChantiers}</p>
        </div>
        <div className="bg-[#1a1f3a] rounded-3xl p-8 border border-[#2a2f4a]">
          <p className="text-gray-400 text-sm mb-2">Clients de l'entreprise</p>
          <p className="text-3xl font-bold text-blue-300">{loading ? '...' : nbClients}</p>
        </div>
      </div>

      {/* Actions rapides */}
      <div>
        <h2 className="text-2xl font-bold text-white mb-8 md:mb-10">Actions rapides</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
          <Link href="/dashboard/employe/chantiers">
            <div className="bg-gradient-to-br from-[#1a1f3a] to-[#0f1429] rounded-3xl p-8 border border-[#2a2f4a] hover:border-yellow-500/50 transition-all cursor-pointer">
              <h3 className="text-xl font-bold text-white mb-2">Voir les chantiers</h3>
              <p className="text-gray-400 text-sm">Chantiers de l'entreprise</p>
            </div>
          </Link>
          <Link href="/dashboard/employe/clients">
            <div className="bg-gradient-to-br from-[#1a1f3a] to-[#0f1429] rounded-3xl p-8 border border-[#2a2f4a] hover:border-yellow-500/50 transition-all cursor-pointer">
              <h3 className="text-xl font-bold text-white mb-2">Voir les clients</h3>
              <p className="text-gray-400 text-sm">Clients de l'entreprise</p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  )
}
