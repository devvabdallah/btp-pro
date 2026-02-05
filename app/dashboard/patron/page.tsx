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
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
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
        className={`px-2.5 py-1 rounded-full text-xs font-medium border ${styles[status as keyof typeof styles] || styles.brouillon}`}
      >
        {labels[status as keyof typeof labels] || status}
      </span>
    )
  }

  // Formater les valeurs KPI (afficher 0 ou — si pas fiable)
  const formatKPIValue = (value: number | null | undefined): string => {
    if (value === null || value === undefined || isNaN(value)) {
      return '—'
    }
    return value.toString()
  }

  return (
    <div className="space-y-10 md:space-y-14">
      {/* Header avec titre et numéro entreprise discret */}
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6 md:gap-8">
        <div className="flex-1">
          <h1 className="text-[28px] md:text-4xl font-semibold text-white mb-3.5 tracking-[-0.02em] leading-[1.15]">
            Tableau de bord
          </h1>
          <p className="text-sm md:text-[15px] text-gray-400/85 leading-relaxed font-normal">
            Vue d'ensemble de votre activité
          </p>
        </div>
        
        {/* Numéro entreprise discret */}
        {entrepriseCode && (
          <div className="flex items-center gap-2.5 px-4 py-2.5 bg-white/[0.03] rounded-lg border border-white/[0.08] backdrop-blur-sm">
            <span className="text-gray-400/75 text-[11px] font-medium tracking-wide uppercase">N° entreprise</span>
            <span className="text-white/95 text-sm font-mono font-semibold tracking-tight">{entrepriseCode}</span>
          </div>
        )}
      </div>

      {/* KPIs Cards - Design premium sobre */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
        <div className="bg-white/[0.02] backdrop-blur-sm rounded-xl p-5 md:p-6 border border-white/[0.06] hover:border-white/[0.15] hover:bg-white/[0.04] transition-all duration-300 ease-out shadow-sm">
          <p className="text-[10px] uppercase tracking-[0.08em] text-gray-400/65 mb-3.5 font-medium">
            CA du mois
          </p>
          <p className="text-[24px] md:text-[32px] font-semibold text-white/95 tabular-nums leading-[1.1] tracking-[-0.01em]">
            {loading ? '—' : formatAmount(caMois)}
          </p>
        </div>
        
        <div className="bg-white/[0.02] backdrop-blur-sm rounded-xl p-5 md:p-6 border border-white/[0.06] hover:border-white/[0.15] hover:bg-white/[0.04] transition-all duration-300 ease-out shadow-sm">
          <p className="text-[10px] uppercase tracking-[0.08em] text-gray-400/65 mb-3.5 font-medium">
            Devis en attente
          </p>
          <p className="text-[24px] md:text-[32px] font-semibold text-blue-400/95 tabular-nums leading-[1.1] tracking-[-0.01em]">
            {loading ? '—' : formatKPIValue(devisEnAttente)}
          </p>
        </div>
        
        <div className="bg-white/[0.02] backdrop-blur-sm rounded-xl p-5 md:p-6 border border-white/[0.06] hover:border-white/[0.15] hover:bg-white/[0.04] transition-all duration-300 ease-out shadow-sm">
          <p className="text-[10px] uppercase tracking-[0.08em] text-gray-400/65 mb-3.5 font-medium">
            Chantiers en cours
          </p>
          <p className="text-[24px] md:text-[32px] font-semibold text-green-400/95 tabular-nums leading-[1.1] tracking-[-0.01em]">
            {loading ? '—' : formatKPIValue(chantiersEnCours)}
          </p>
        </div>
        
        <div className="bg-white/[0.02] backdrop-blur-sm rounded-xl p-5 md:p-6 border border-white/[0.06] hover:border-white/[0.15] hover:bg-white/[0.04] transition-all duration-300 ease-out shadow-sm">
          <p className="text-[10px] uppercase tracking-[0.08em] text-gray-400/65 mb-3.5 font-medium">
            Clients
          </p>
          <p className="text-[24px] md:text-[32px] font-semibold text-yellow-400/95 tabular-nums leading-[1.1] tracking-[-0.01em]">
            {loading ? '—' : formatKPIValue(nbClients)}
          </p>
        </div>
      </div>

      {/* Actions rapides - Design premium sobre */}
      <div>
        <h2 className="text-lg md:text-xl font-semibold text-white/95 mb-6 md:mb-7 tracking-tight">
          Actions rapides
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-4">
          <Link href="/dashboard/patron/devis/nouveau" className="group">
            <div className="bg-white/[0.02] backdrop-blur-sm rounded-lg p-5 md:p-6 border border-white/[0.06] hover:border-yellow-500/25 hover:bg-white/[0.04] transition-all duration-300 ease-out cursor-pointer">
              <h3 className="text-[15px] md:text-base font-semibold text-white/95 mb-2 group-hover:text-yellow-400/95 transition-colors duration-200 leading-snug">
                Créer un devis
              </h3>
              <p className="text-gray-400/75 text-sm leading-relaxed">Nouveau devis</p>
            </div>
          </Link>
          
          <Link href="/dashboard/patron/devis" className="group">
            <div className="bg-white/[0.02] backdrop-blur-sm rounded-lg p-5 md:p-6 border border-white/[0.06] hover:border-yellow-500/25 hover:bg-white/[0.04] transition-all duration-300 ease-out cursor-pointer">
              <h3 className="text-[15px] md:text-base font-semibold text-white/95 mb-2 group-hover:text-yellow-400/95 transition-colors duration-200 leading-snug">
                Voir les devis
              </h3>
              <p className="text-gray-400/75 text-sm leading-relaxed">Tous les devis</p>
            </div>
          </Link>
          
          <Link href="/dashboard/patron/factures" className="group">
            <div className="bg-white/[0.02] backdrop-blur-sm rounded-lg p-5 md:p-6 border border-white/[0.06] hover:border-yellow-500/25 hover:bg-white/[0.04] transition-all duration-300 ease-out cursor-pointer">
              <h3 className="text-[15px] md:text-base font-semibold text-white/95 mb-2 group-hover:text-yellow-400/95 transition-colors duration-200 leading-snug">
                Voir les factures
              </h3>
              <p className="text-gray-400/75 text-sm leading-relaxed">Gestion factures</p>
            </div>
          </Link>
          
          <Link href="/dashboard/patron/chantiers" className="group">
            <div className="bg-white/[0.02] backdrop-blur-sm rounded-lg p-5 md:p-6 border border-white/[0.06] hover:border-yellow-500/25 hover:bg-white/[0.04] transition-all duration-300 ease-out cursor-pointer">
              <h3 className="text-[15px] md:text-base font-semibold text-white/95 mb-2 group-hover:text-yellow-400/95 transition-colors duration-200 leading-snug">
                Voir les chantiers
              </h3>
              <p className="text-gray-400/75 text-sm leading-relaxed">Suivi chantiers</p>
            </div>
          </Link>
        </div>
      </div>

      {/* Derniers devis - Design premium épuré */}
      <div>
        <h2 className="text-lg md:text-xl font-semibold text-white/95 mb-6 md:mb-7 tracking-tight">
          Derniers devis
        </h2>
        <div className="bg-white/[0.02] backdrop-blur-sm rounded-xl border border-white/[0.06] overflow-hidden shadow-sm">
          {loading ? (
            <div className="p-10 text-center">
              <p className="text-gray-400/70 text-sm font-normal">Chargement...</p>
            </div>
          ) : quotes.length === 0 ? (
            <div className="p-10 text-center">
              <p className="text-gray-400/70 text-sm font-normal">Aucun devis récent pour le moment.</p>
            </div>
          ) : (
            <div className="divide-y divide-white/[0.06]">
              {quotes.slice(0, 5).map((quote) => (
                <Link
                  key={quote.id}
                  href={`/dashboard/patron/quotes/${quote.id}`}
                  className="block p-4 md:p-5 hover:bg-white/[0.03] transition-colors duration-300 ease-out group"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3.5">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2.5 md:gap-3 mb-2.5 flex-wrap">
                        <h3 className="text-[15px] md:text-base font-semibold text-white/95 group-hover:text-yellow-400/95 transition-colors duration-200 truncate leading-snug">
                          {quote.title}
                        </h3>
                        {getStatusBadge(quote.status)}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-400/75">
                        <span className="truncate">{quote.client}</span>
                        <span className="opacity-50">•</span>
                        <span className="whitespace-nowrap">{formatDate(quote.created_at)}</span>
                      </div>
                    </div>
                    <div className="flex-shrink-0">
                      <p className="text-lg md:text-xl font-semibold text-white/95 tabular-nums tracking-tight leading-[1.1]">
                        {formatAmount(quote.amount_ht || 0)}
                      </p>
                    </div>
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
