'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { getQuotes, getQuoteStats } from '@/lib/quotes-actions'
import { supabase } from '@/lib/supabaseClient'

export default function PatronDashboard() {
  const [quotes, setQuotes] = useState<any[]>([])
  const [stats, setStats] = useState<any>(null)
  const [entrepriseCode, setEntrepriseCode] = useState<string | null>(null)
  const [entrepriseError, setEntrepriseError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      // Récupérer les devis et les stats
      const [quotesResult, statsResult] = await Promise.all([
        getQuotes(),
        getQuoteStats(),
      ])

      setQuotes(quotesResult.success ? quotesResult.quotes || [] : [])
      setStats(statsResult.success ? statsResult.stats : null)

      // Récupérer le code entreprise
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          setEntrepriseError('Utilisateur non connecté')
          return
        }

        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('entreprise_id')
          .eq('id', user.id)
          .single()

        if (profileError || !profile || !profile.entreprise_id) {
          setEntrepriseError('Entreprise non trouvée')
          return
        }

        const { data: entreprise, error: entrepriseError } = await supabase
          .from('entreprises')
          .select('code')
          .eq('id', profile.entreprise_id)
          .single()

        if (entrepriseError || !entreprise || !entreprise.code) {
          setEntrepriseError('Code entreprise manquant')
          return
        }

        setEntrepriseCode(entreprise.code)
      } catch (err) {
        setEntrepriseError('Erreur lors du chargement du code entreprise')
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

  // Calculer le CA du mois (mock pour l'instant)
  const caMois = stats?.accepte ? stats.accepte * 1500 : 0 // Exemple simple
  const devisEnAttente = stats?.envoye || 0
  const chantiersEnCours = 3 // Mock
  const nbClients = quotes.length > 0 ? new Set(quotes.map(q => q.client)).size : 0

  return (
    <div>
      <h1 className="text-4xl md:text-5xl font-bold text-white mb-8">Tableau de bord - Patron</h1>

      {/* Code entreprise */}
      <div className="mb-8">
        <div className="bg-gradient-to-br from-yellow-500/20 to-orange-500/20 rounded-3xl p-6 border border-yellow-500/30">
          <p className="text-gray-300 text-sm mb-2">Mon numéro d'entreprise</p>
          {entrepriseError ? (
            <p className="text-red-400 text-lg font-semibold">{entrepriseError}</p>
          ) : entrepriseCode ? (
            <p className="text-3xl font-bold text-white font-mono">{entrepriseCode}</p>
          ) : (
            <p className="text-gray-400">Chargement...</p>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        <div className="bg-[#1a1f3a] rounded-3xl p-6 border border-[#2a2f4a]">
          <p className="text-gray-400 text-sm mb-2">CA du mois</p>
          <p className="text-3xl font-bold text-white">{formatAmount(caMois)}</p>
        </div>
        <div className="bg-[#1a1f3a] rounded-3xl p-6 border border-[#2a2f4a]">
          <p className="text-gray-400 text-sm mb-2">Devis en attente</p>
          <p className="text-3xl font-bold text-blue-300">{devisEnAttente}</p>
        </div>
        <div className="bg-[#1a1f3a] rounded-3xl p-6 border border-[#2a2f4a]">
          <p className="text-gray-400 text-sm mb-2">Chantiers en cours</p>
          <p className="text-3xl font-bold text-green-300">{chantiersEnCours}</p>
        </div>
        <div className="bg-[#1a1f3a] rounded-3xl p-6 border border-[#2a2f4a]">
          <p className="text-gray-400 text-sm mb-2">Clients</p>
          <p className="text-3xl font-bold text-yellow-300">{nbClients}</p>
        </div>
      </div>

      {/* Actions rapides */}
      <div className="mb-12">
        <h2 className="text-2xl font-bold text-white mb-6">Actions rapides</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link href="/dashboard/patron/devis/nouveau">
            <div className="bg-gradient-to-br from-[#1a1f3a] to-[#0f1429] rounded-3xl p-6 border border-[#2a2f4a] hover:border-yellow-500/50 transition-all cursor-pointer">
              <h3 className="text-xl font-bold text-white mb-2">Créer un devis</h3>
              <p className="text-gray-400 text-sm">Nouveau devis</p>
            </div>
          </Link>
          <Link href="/dashboard/patron/devis">
            <div className="bg-gradient-to-br from-[#1a1f3a] to-[#0f1429] rounded-3xl p-6 border border-[#2a2f4a] hover:border-yellow-500/50 transition-all cursor-pointer">
              <h3 className="text-xl font-bold text-white mb-2">Voir les devis</h3>
              <p className="text-gray-400 text-sm">Tous les devis</p>
            </div>
          </Link>
          <Link href="/dashboard/patron/factures">
            <div className="bg-gradient-to-br from-[#1a1f3a] to-[#0f1429] rounded-3xl p-6 border border-[#2a2f4a] hover:border-yellow-500/50 transition-all cursor-pointer">
              <h3 className="text-xl font-bold text-white mb-2">Voir les factures</h3>
              <p className="text-gray-400 text-sm">Gestion factures</p>
            </div>
          </Link>
          <Link href="/dashboard/patron/chantiers">
            <div className="bg-gradient-to-br from-[#1a1f3a] to-[#0f1429] rounded-3xl p-6 border border-[#2a2f4a] hover:border-yellow-500/50 transition-all cursor-pointer">
              <h3 className="text-xl font-bold text-white mb-2">Voir les chantiers</h3>
              <p className="text-gray-400 text-sm">Suivi chantiers</p>
            </div>
          </Link>
        </div>
      </div>

      {/* Derniers devis */}
      <div>
        <h2 className="text-2xl font-bold text-white mb-6">Derniers devis</h2>
        <div className="bg-[#1a1f3a] rounded-3xl p-6 border border-[#2a2f4a]">
          {quotes.length === 0 ? (
            <p className="text-gray-400 text-center py-8">Aucun devis pour le moment.</p>
          ) : (
            <div className="space-y-3">
              {quotes.slice(0, 5).map((quote) => (
                <Link
                  key={quote.id}
                  href={`/dashboard/patron/quotes/${quote.id}`}
                  className="block flex items-center justify-between p-4 bg-[#0f1429] rounded-xl border border-[#2a2f4a] hover:border-yellow-500/30 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <span className="text-white font-semibold">{quote.title}</span>
                      {getStatusBadge(quote.status)}
                    </div>
                    <p className="text-gray-400 text-sm">{quote.client} • {formatDate(quote.created_at)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-white">{formatAmount(quote.amount_ht)}</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
