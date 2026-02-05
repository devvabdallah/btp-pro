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

  return (
    <div className="space-y-10 md:space-y-14">
      {/* Header avec titre et bouton */}
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6 md:gap-8">
        <div className="flex-1">
          <h1 className="text-[28px] md:text-4xl font-semibold text-white/95 mb-3.5 tracking-[-0.02em] leading-[1.15]">
            Mes devis
          </h1>
          <p className="text-sm md:text-[15px] text-gray-400/85 leading-relaxed font-normal">
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
        <div className="bg-white/[0.02] backdrop-blur-sm rounded-xl p-8 md:p-10 border border-white/[0.06] shadow-sm">
          <p className="text-gray-400/75 text-center text-sm md:text-base">Chargement...</p>
        </div>
      ) : quotes.length === 0 ? (
        <div className="bg-white/[0.02] backdrop-blur-sm rounded-xl p-8 md:p-10 border border-white/[0.06] shadow-sm">
          <p className="text-gray-400/75 text-center text-sm md:text-base">Aucun devis pour le moment.</p>
        </div>
      ) : (
        <div className="bg-white/[0.02] backdrop-blur-sm rounded-xl border border-white/[0.06] overflow-hidden shadow-sm">
          <div className="divide-y divide-white/[0.06]">
            {quotes.map((quote) => {
              if (!quote.id) {
                return (
                  <div
                    key={quote.title || 'no-id'}
                    className="flex items-center justify-between p-4 md:p-5 bg-red-500/20 border-b border-red-500/30"
                  >
                    <p className="text-red-400/95 text-sm">Devis sans id</p>
                  </div>
                )
              }

              return (
                <Link
                  key={quote.id}
                  href={`/dashboard/patron/quotes/${quote.id}`}
                  className="block p-4 md:p-5 hover:bg-white/[0.03] transition-colors duration-300 ease-out group"
                >
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3.5 md:gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-3 mb-2.5">
                        <h3 className="text-lg md:text-xl font-semibold text-white/95 group-hover:text-yellow-400/90 transition-colors duration-200 leading-tight">
                          {quote.title}
                        </h3>
                        {getStatusBadge(quote.status)}
                      </div>
                      <div className="flex flex-col md:flex-row md:items-center gap-1.5 md:gap-2">
                        <span className="text-gray-300/85 text-sm md:text-base font-medium">
                          {quote.client}
                        </span>
                        <span className="hidden md:inline text-gray-500/55">•</span>
                        <span className="text-gray-400/75 text-sm md:text-base">
                          {formatDate(quote.created_at)}
                        </span>
                      </div>
                    </div>
                    <div className="text-left md:text-right">
                      <p className="text-lg md:text-xl font-semibold text-white/95 tabular-nums leading-[1.1] tracking-tight">
                        {formatAmount(quote.amount_ht)}
                      </p>
                      <p className="text-gray-400/65 text-xs mt-0.5">HT</p>
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

