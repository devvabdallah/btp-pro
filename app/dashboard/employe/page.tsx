'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { getQuotes } from '@/lib/quotes-actions'

export default function EmployeDashboard() {
  const [quotes, setQuotes] = useState<any[]>([])

  useEffect(() => {
    async function load() {
      // Récupérer les devis (lecture seule)
      const quotesResult = await getQuotes()
      setQuotes(quotesResult.success ? quotesResult.quotes || [] : [])
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

  const chantiersAssignes = 0
  const nbClients = quotes.length > 0 ? new Set(quotes.map(q => q.client)).size : 0
  const tachesAFaire = 0

  return (
    <div>
      <h1 className="text-4xl md:text-5xl font-bold text-white mb-8">Tableau de bord - Employé</h1>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <div className="bg-[#1a1f3a] rounded-3xl p-6 border border-[#2a2f4a]">
          <p className="text-gray-400 text-sm mb-2">Chantiers assignés</p>
          <p className="text-3xl font-bold text-green-300">{chantiersAssignes}</p>
        </div>
        <div className="bg-[#1a1f3a] rounded-3xl p-6 border border-[#2a2f4a]">
          <p className="text-gray-400 text-sm mb-2">Clients de l'entreprise</p>
          <p className="text-3xl font-bold text-blue-300">{nbClients}</p>
        </div>
        <div className="bg-[#1a1f3a] rounded-3xl p-6 border border-[#2a2f4a]">
          <p className="text-gray-400 text-sm mb-2">Tâches à faire</p>
          <p className="text-3xl font-bold text-yellow-300">{tachesAFaire}</p>
        </div>
      </div>

      {/* Actions rapides */}
      <div className="mb-12">
        <h2 className="text-2xl font-bold text-white mb-6">Actions rapides</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link href="/dashboard/employe/chantiers">
            <div className="bg-gradient-to-br from-[#1a1f3a] to-[#0f1429] rounded-3xl p-6 border border-[#2a2f4a] hover:border-yellow-500/50 transition-all cursor-pointer">
              <h3 className="text-xl font-bold text-white mb-2">Voir les chantiers</h3>
              <p className="text-gray-400 text-sm">Mes chantiers assignés</p>
            </div>
          </Link>
          <Link href="/dashboard/employe/clients">
            <div className="bg-gradient-to-br from-[#1a1f3a] to-[#0f1429] rounded-3xl p-6 border border-[#2a2f4a] hover:border-yellow-500/50 transition-all cursor-pointer">
              <h3 className="text-xl font-bold text-white mb-2">Voir les clients</h3>
              <p className="text-gray-400 text-sm">Clients de l'entreprise</p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  )
}
