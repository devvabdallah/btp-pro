'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { getQuotes, getQuoteStats } from '@/lib/quotes-actions'
import { supabase } from '@/lib/supabaseClient'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'

export default function PatronDashboard() {
  const [quotes, setQuotes] = useState<any[]>([])
  const [stats, setStats] = useState<any>(null)
  const [entrepriseCode, setEntrepriseCode] = useState<string | null>(null)
  const [entrepriseError, setEntrepriseError] = useState<string | null>(null)
  const [devisEnAttente, setDevisEnAttente] = useState<number>(0)
  const [chantiersEnCours, setChantiersEnCours] = useState<number>(0)
  const [nbClients, setNbClients] = useState<number>(0)
  const [caMois, setCaMois] = useState<number>(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      setLoading(true)
      
      try {
        const supabase = createSupabaseBrowserClient()

        // 1. Récupérer l'utilisateur
        const { data: { user }, error: userError } = await supabase.auth.getUser()
        
        if (userError || !user) {
          setEntrepriseError('Utilisateur non connecté')
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
          setEntrepriseError('Entreprise non trouvée')
          setLoading(false)
          return
        }

        const entrepriseId = profile.entreprise_id

        // 3. Récupérer le code entreprise
        const { data: entreprise, error: entrepriseError } = await supabase
          .from('entreprises')
          .select('code')
          .eq('id', entrepriseId)
          .single()

        if (entrepriseError || !entreprise || !entreprise.code) {
          setEntrepriseError('Code entreprise manquant')
        } else {
          setEntrepriseCode(entreprise.code)
        }

        // 4. Récupérer les devis et les stats en parallèle
        const [quotesResult, statsResult] = await Promise.all([
          getQuotes(),
          getQuoteStats(),
        ])

        const allQuotes = quotesResult.success ? quotesResult.quotes || [] : []
        const quoteStats = statsResult.success ? statsResult.stats : null

        setQuotes(allQuotes)
        setStats(quoteStats)

        // 5. Compter les devis en attente (statut "envoye")
        const devisEnvoye = quoteStats?.envoye || 0
        setDevisEnAttente(devisEnvoye)

        // 6. Compter les chantiers en cours (statut "en_cours")
        const { count: chantiersCount, error: chantiersError } = await supabase
          .from('chantiers')
          .select('*', { count: 'exact', head: true })
          .eq('entreprise_id', entrepriseId)
          .eq('status', 'en_cours')

        if (!chantiersError) {
          setChantiersEnCours(chantiersCount || 0)
        }

        // 7. Compter les clients
        const { count: clientsCount, error: clientsError } = await supabase
          .from('clients')
          .select('*', { count: 'exact', head: true })
          .eq('entreprise_id', entrepriseId)

        if (!clientsError) {
          setNbClients(clientsCount || 0)
        }

        // 8. Calculer le CA du mois (somme des devis acceptés du mois en cours)
        const now = new Date()
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)

        const { data: quotesAcceptees, error: caError } = await supabase
          .from('quotes')
          .select('amount_ht')
          .eq('entreprise_id', entrepriseId)
          .eq('status', 'accepte')
          .gte('created_at', startOfMonth.toISOString())
          .lte('created_at', endOfMonth.toISOString())

        if (!caError && quotesAcceptees) {
          const totalCA = quotesAcceptees.reduce((sum, q) => sum + (parseFloat(q.amount_ht) || 0), 0)
          setCaMois(totalCA)
        }
      } catch (err) {
        console.error('Erreur lors du chargement:', err)
        setEntrepriseError('Erreur lors du chargement des données')
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

  // Les valeurs sont maintenant dans les états : caMois, devisEnAttente, chantiersEnCours, nbClients

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
          {loading ? (
            <p className="text-gray-400 text-center py-8">Chargement...</p>
          ) : quotes.length === 0 ? (
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
                    <p className="text-lg font-bold text-white">{formatAmount(quote.amount_ht || 0)}</p>
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
