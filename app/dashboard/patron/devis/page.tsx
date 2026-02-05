'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import Button from '@/components/ui/Button'

export default function DevisPage() {
  const [quotes, setQuotes] = useState<any[]>([])
  const [error, setError] = useState<string>('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      setLoading(true)
      setError('')

      try {
        const supabase = createSupabaseBrowserClient()

        // 1. Récupérer l'utilisateur connecté
        const { data: { user }, error: userError } = await supabase.auth.getUser()
        
        if (userError || !user) {
          setError('Non connecté')
          setLoading(false)
          return
        }

        console.log('MEDEVIS user', user.id)

        // 2. Récupérer entreprise_id depuis profiles
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('entreprise_id')
          .eq('id', user.id)
          .single()

        if (profileError || !profile || !profile.entreprise_id) {
          const errorMsg = profileError?.message || 'Profil introuvable'
          setError(`Erreur: ${errorMsg}`)
          console.error('Profile error:', profileError)
          setLoading(false)
          return
        }

        console.log('MEDEVIS entreprise_id', profile.entreprise_id)

        // 3. Charger les devis avec le filtre entreprise_id
        const { data: quotesData, error: quotesError } = await supabase
          .from('quotes')
          .select('id, title, client, contact, amount_ht, status, created_at')
          .eq('entreprise_id', profile.entreprise_id)
          .order('created_at', { ascending: false })

        if (quotesError) {
          setError(`Erreur lors du chargement: ${quotesError.message}`)
          console.error('Quotes error:', quotesError)
          setLoading(false)
          return
        }

        console.log('MEDEVIS quotes_count', quotesData?.length ?? 0)

        setQuotes(quotesData || [])
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Une erreur inattendue est survenue'
        setError(errorMsg)
        console.error('Unexpected error in load:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  }

  const getStatusBadge = (status: string) => {
    const styles = {
      brouillon: 'bg-gray-500/15 text-gray-300/90 border-gray-500/25',
      envoye: 'bg-blue-500/15 text-blue-300/90 border-blue-500/25',
      accepte: 'bg-green-500/15 text-green-300/90 border-green-500/25',
      refuse: 'bg-red-500/15 text-red-300/90 border-red-500/25',
    }
    const labels = {
      brouillon: 'Brouillon',
      envoye: 'Envoyé',
      accepte: 'Accepté',
      refuse: 'Refusé',
    }
    return (
      <span
        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${styles[status as keyof typeof styles] || styles.brouillon}`}
      >
        {labels[status as keyof typeof labels] || status}
      </span>
    )
  }

  return (
    <div className="space-y-10 md:space-y-14">
      {/* Header avec titre et bouton */}
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6 md:gap-8">
        <div className="flex-1">
          <h1 className="text-[28px] md:text-4xl font-semibold text-white/95 mb-3.5 tracking-[-0.02em] leading-[1.15]">
            Mes devis
          </h1>
          <p className="text-sm md:text-[15px] text-gray-400/80 leading-relaxed font-normal">
            Gérez vos devis et suivez leur statut
          </p>
        </div>
        <Link href="/dashboard/patron/devis/nouveau" className="w-full md:w-auto">
          <Button variant="primary" size="lg" className="w-full md:w-auto min-h-[48px] px-8 text-base md:text-lg font-semibold">
            Créer un devis
          </Button>
        </Link>
      </div>

      {/* Erreur */}
      {error && (
        <div className="bg-red-500/20 border border-red-500/50 rounded-xl p-4 backdrop-blur-sm">
          <p className="text-red-400/95 text-sm">{error}</p>
        </div>
      )}

      {/* Liste des devis */}
      {loading ? (
        <div className="bg-white/[0.02] backdrop-blur-sm rounded-xl p-12 md:p-16 border border-white/[0.06] shadow-sm">
          <p className="text-gray-400/70 text-center text-sm md:text-base font-medium">Chargement...</p>
        </div>
      ) : quotes.length === 0 ? (
        <div className="bg-white/[0.02] backdrop-blur-sm rounded-xl p-12 md:p-16 border border-white/[0.06] shadow-sm">
          <div className="text-center space-y-4">
            <p className="text-gray-400/80 text-base md:text-lg font-medium">Aucun devis pour le moment</p>
            <p className="text-gray-500/70 text-sm md:text-base">Commencez par créer votre premier devis</p>
            <div className="pt-2">
              <Link href="/dashboard/patron/devis/nouveau">
                <Button variant="primary" size="md" className="min-h-[44px] px-6">
                  Créer un devis
                </Button>
              </Link>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white/[0.02] backdrop-blur-sm rounded-xl border border-white/[0.06] overflow-hidden shadow-sm">
          <div className="divide-y divide-white/[0.06]">
            {quotes.map((quote) => {
              if (!quote.id) {
                return (
                  <div
                    key={quote.title || 'no-id'}
                    className="flex items-center justify-between p-4 md:p-5 bg-red-500/15 border-b border-red-500/25"
                  >
                    <p className="text-red-400/90 text-sm font-medium">Devis sans id</p>
                  </div>
                )
              }

              return (
                <Link
                  key={quote.id}
                  href={`/dashboard/patron/quotes/${quote.id}`}
                  className="block p-5 md:p-6 hover:bg-white/[0.04] transition-all duration-200 ease-out group border-l-2 border-transparent hover:border-yellow-500/30"
                >
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 md:gap-6">
                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 sm:gap-3">
                        <h3 className="text-base md:text-lg font-semibold text-white/95 group-hover:text-yellow-400/95 transition-colors duration-200 leading-snug">
                          {quote.title}
                        </h3>
                        {getStatusBadge(quote.status)}
                      </div>
                      <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-2 text-sm">
                        <span className="text-gray-300/80 font-medium">
                          {quote.client}
                        </span>
                        <span className="hidden sm:inline text-gray-500/50">•</span>
                        <span className="text-gray-400/70">
                          {formatDate(quote.created_at)}
                        </span>
                      </div>
                    </div>
                    <div className="text-left md:text-right flex-shrink-0">
                      <p className="text-xl md:text-2xl font-semibold text-white/95 tabular-nums leading-none tracking-tight">
                        {formatAmount(quote.amount_ht)}
                      </p>
                      <p className="text-gray-400/60 text-xs mt-1 font-medium">HT</p>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

