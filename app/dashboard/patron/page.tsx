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
    <div className="space-y-12 md:space-y-16 lg:space-y-20">
      {/* Header avec titre et numéro entreprise discret */}
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6 md:gap-8">
        <div className="flex-1">
          <h1 className="text-[28px] md:text-4xl font-semibold text-white/98 mb-3.5 tracking-[-0.02em] leading-[1.15]">
            Tableau de bord
          </h1>
          <p className="text-sm md:text-[15px] text-gray-400/80 leading-relaxed font-normal">
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
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 md:gap-6 lg:gap-8">
        <div className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 rounded-xl p-6 md:p-8 border border-white/10 md:hover:border-orange-500/30 md:hover:shadow-xl md:hover:shadow-black/40 transition-all duration-200 ease-out shadow-lg shadow-black/30 backdrop-blur-sm">
          <p className="text-[10px] uppercase tracking-[0.08em] text-gray-400 mb-3.5 font-medium">
            CA du mois
          </p>
          <p className="text-[26px] md:text-[34px] font-bold text-white tabular-nums leading-[1.1] tracking-[-0.01em]">
            {loading ? '—' : formatAmount(caMois)}
          </p>
          {!loading && caMois === 0 && (
            <p className="text-xs text-gray-400 mt-2.5 leading-relaxed">
              Le chiffre d'affaires apparaîtra dès la première facture.
            </p>
          )}
        </div>
        
        <div className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 rounded-xl p-6 md:p-8 border border-white/10 md:hover:border-blue-500/30 md:hover:shadow-xl md:hover:shadow-black/40 transition-all duration-200 ease-out shadow-lg shadow-black/30 backdrop-blur-sm">
          <p className="text-[10px] uppercase tracking-[0.08em] text-gray-400 mb-3.5 font-medium">
            Devis en attente
          </p>
          <p className="text-[26px] md:text-[34px] font-bold text-blue-400 tabular-nums leading-[1.1] tracking-[-0.01em]">
            {loading ? '—' : formatKPIValue(devisEnAttente)}
          </p>
          {!loading && devisEnAttente === 0 && (
            <p className="text-xs text-gray-400 mt-2.5 leading-relaxed">
              Créez un devis pour démarrer.
            </p>
          )}
        </div>
        
        <div className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 rounded-xl p-6 md:p-8 border border-white/10 md:hover:border-green-500/30 md:hover:shadow-xl md:hover:shadow-black/40 transition-all duration-200 ease-out shadow-lg shadow-black/30 backdrop-blur-sm">
          <p className="text-[10px] uppercase tracking-[0.08em] text-gray-400 mb-3.5 font-medium">
            Chantiers en cours
          </p>
          <p className="text-[26px] md:text-[34px] font-bold text-green-400 tabular-nums leading-[1.1] tracking-[-0.01em]">
            {loading ? '—' : formatKPIValue(chantiersEnCours)}
          </p>
          {!loading && chantiersEnCours === 0 && (
            <p className="text-xs text-gray-400 mt-2.5 leading-relaxed">
              Les chantiers actifs s'afficheront ici.
            </p>
          )}
        </div>
        
        <div className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 rounded-xl p-6 md:p-8 border border-white/10 md:hover:border-orange-500/30 md:hover:shadow-xl md:hover:shadow-black/40 transition-all duration-200 ease-out shadow-lg shadow-black/30 backdrop-blur-sm">
          <p className="text-[10px] uppercase tracking-[0.08em] text-gray-400 mb-3.5 font-medium">
            Clients
          </p>
          <p className="text-[26px] md:text-[34px] font-bold text-orange-400 tabular-nums leading-[1.1] tracking-[-0.01em]">
            {loading ? '—' : formatKPIValue(nbClients)}
          </p>
          {!loading && nbClients === 0 && (
            <p className="text-xs text-gray-500 mt-2.5 leading-relaxed">
              Ajoutez votre premier client.
            </p>
          )}
        </div>
      </div>

      {/* Actions rapides - Design premium sobre */}
      <div>
        <h2 className="text-xl md:text-2xl font-bold text-white/98 mb-8 md:mb-10 tracking-tight">
          Actions rapides
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 md:gap-6">
          <Link href="/dashboard/patron/devis/nouveau" className="group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0e27] rounded-lg">
            <div className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 rounded-lg p-7 md:p-8 border border-white/10 group-hover:border-orange-500/40 group-hover:-translate-y-0.5 group-hover:shadow-xl group-hover:shadow-black/40 group-active:translate-y-0 group-active:shadow-lg transition-all duration-200 ease-out cursor-pointer shadow-lg shadow-black/30 backdrop-blur-sm">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-base md:text-lg font-semibold text-white mb-2.5 group-hover:text-orange-400 transition-colors duration-150 leading-snug">
                    Créer un devis
                  </h3>
                  <p className="text-gray-400 text-sm leading-relaxed">Nouveau devis</p>
                </div>
                <span className="text-gray-500 group-hover:text-orange-400 transition-colors duration-150 text-lg ml-2">➜</span>
              </div>
            </div>
          </Link>
          
          <Link href="/dashboard/patron/devis" className="group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0e27] rounded-lg">
            <div className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 rounded-lg p-7 md:p-8 border border-white/10 group-hover:border-orange-500/40 group-hover:-translate-y-0.5 group-hover:shadow-xl group-hover:shadow-black/40 group-active:translate-y-0 group-active:shadow-lg transition-all duration-200 ease-out cursor-pointer shadow-lg shadow-black/30 backdrop-blur-sm">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-base md:text-lg font-semibold text-white mb-2.5 group-hover:text-orange-400 transition-colors duration-150 leading-snug">
                    Voir les devis
                  </h3>
                  <p className="text-gray-400 text-sm leading-relaxed">Tous les devis</p>
                </div>
                <span className="text-gray-500 group-hover:text-orange-400 transition-colors duration-150 text-lg ml-2">➜</span>
              </div>
            </div>
          </Link>
          
          <Link href="/dashboard/patron/factures" className="group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0e27] rounded-lg">
            <div className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 rounded-lg p-7 md:p-8 border border-white/10 group-hover:border-orange-500/40 group-hover:-translate-y-0.5 group-hover:shadow-xl group-hover:shadow-black/40 group-active:translate-y-0 group-active:shadow-lg transition-all duration-200 ease-out cursor-pointer shadow-lg shadow-black/30 backdrop-blur-sm">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-base md:text-lg font-semibold text-white mb-2.5 group-hover:text-orange-400 transition-colors duration-150 leading-snug">
                    Voir les factures
                  </h3>
                  <p className="text-gray-400 text-sm leading-relaxed">Gestion factures</p>
                </div>
                <span className="text-gray-500 group-hover:text-orange-400 transition-colors duration-150 text-lg ml-2">➜</span>
              </div>
            </div>
          </Link>
          
          <Link href="/dashboard/patron/chantiers" className="group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0e27] rounded-lg">
            <div className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 rounded-lg p-7 md:p-8 border border-white/10 group-hover:border-orange-500/40 group-hover:-translate-y-0.5 group-hover:shadow-xl group-hover:shadow-black/40 group-active:translate-y-0 group-active:shadow-lg transition-all duration-200 ease-out cursor-pointer shadow-lg shadow-black/30 backdrop-blur-sm">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-base md:text-lg font-semibold text-white mb-2.5 group-hover:text-orange-400 transition-colors duration-150 leading-snug">
                    Voir les chantiers
                  </h3>
                  <p className="text-gray-400 text-sm leading-relaxed">Suivi chantiers</p>
                </div>
                <span className="text-gray-500 group-hover:text-orange-400 transition-colors duration-150 text-lg ml-2">➜</span>
              </div>
            </div>
          </Link>
        </div>
      </div>

      {/* Derniers devis - Design premium épuré */}
      <div>
        <h2 className="text-xl md:text-2xl font-bold text-white/98 mb-8 md:mb-10 tracking-tight">
          Derniers devis
        </h2>
        <div className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 rounded-xl border border-white/10 overflow-hidden shadow-lg shadow-black/30 backdrop-blur-sm">
          {loading ? (
            <div className="p-12 text-center">
              <p className="text-gray-300 text-sm font-normal">Chargement...</p>
            </div>
          ) : quotes.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-gray-300 text-sm font-normal mb-2">
                Aucun devis pour le moment. Commencez par créer votre premier devis.
              </p>
              <Link href="/dashboard/patron/devis/nouveau" className="inline-block text-xs text-orange-400 hover:text-orange-300 transition-colors duration-150 underline underline-offset-2 font-medium">
                Créer un devis
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-white/10">
              {quotes.slice(0, 5).map((quote) => (
                <Link
                  key={quote.id}
                  href={`/dashboard/patron/quotes/${quote.id}`}
                  className="block p-6 md:p-7 hover:bg-white/5 transition-colors duration-200 ease-out group"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3.5">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2.5 md:gap-3 mb-2.5 flex-wrap">
                        <h3 className="text-[15px] md:text-base font-semibold text-white group-hover:text-orange-400 transition-colors duration-150 truncate leading-snug">
                          {quote.title}
                        </h3>
                        {getStatusBadge(quote.status)}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-400">
                        <span className="truncate">{quote.client}</span>
                        <span className="opacity-50">•</span>
                        <span className="whitespace-nowrap">{formatDate(quote.created_at)}</span>
                      </div>
                    </div>
                    <div className="flex-shrink-0">
                      <p className="text-lg md:text-xl font-semibold text-white tabular-nums tracking-tight leading-[1.1]">
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
