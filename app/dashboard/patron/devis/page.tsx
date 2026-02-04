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
        className={`px-4 py-1.5 rounded-full text-sm font-semibold border ${styles[status as keyof typeof styles] || styles.brouillon}`}
      >
        {labels[status as keyof typeof labels] || status}
      </span>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 md:px-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6 md:mb-8">
        <h1 className="text-4xl md:text-5xl font-bold text-white">Mes devis</h1>
        <Link href="/dashboard/patron/devis/nouveau" className="w-full md:w-auto">
          <Button variant="primary" size="lg" className="w-full md:w-auto min-h-[48px] px-8 text-base md:text-lg font-semibold">
            Créer un devis
          </Button>
        </Link>
      </div>
      <div className="bg-[#1a1f3a] rounded-3xl p-6 md:p-8 border border-[#2a2f4a]">
        {loading ? (
          <p className="text-gray-400 text-center py-8">Chargement...</p>
        ) : error ? (
          <p className="text-red-400 text-center py-8">{error}</p>
        ) : quotes.length === 0 ? (
          <p className="text-gray-400 text-center py-8">Aucun devis pour le moment.</p>
        ) : (
          <div className="space-y-4 md:space-y-3">
            {quotes.map((quote) => {
              if (!quote.id) {
                return (
                  <div
                    key={quote.title || 'no-id'}
                    className="flex items-center justify-between p-4 bg-red-500/20 rounded-xl border border-red-500/50"
                  >
                    <p className="text-red-400 text-sm">Devis sans id</p>
                  </div>
                )
              }

              return (
                <Link
                  key={quote.id}
                  href={`/dashboard/patron/quotes/${quote.id}`}
                  className="block cursor-pointer hover:opacity-90 transition-opacity"
                >
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 md:gap-4 p-5 md:p-6 bg-[#0f1429] rounded-2xl border-2 border-[#2a2f4a] hover:border-yellow-500/50 transition-all">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-3 mb-2">
                        <h3 className="text-xl md:text-2xl font-bold text-white leading-tight">
                          {quote.title}
                        </h3>
                        {getStatusBadge(quote.status)}
                      </div>
                      <div className="flex flex-col md:flex-row md:items-center gap-1.5 md:gap-2">
                        <span className="text-gray-300 text-sm md:text-base font-medium">
                          {quote.client}
                        </span>
                        <span className="hidden md:inline text-gray-500">•</span>
                        <span className="text-gray-400 text-sm md:text-base">
                          {formatDate(quote.created_at)}
                        </span>
                      </div>
                    </div>
                    <div className="text-left md:text-right">
                      <p className="text-xl md:text-2xl font-bold text-white">
                        {formatAmount(quote.amount_ht)}
                      </p>
                      <p className="text-gray-400 text-xs md:text-sm mt-0.5">HT</p>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

