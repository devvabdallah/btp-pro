'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'

export default function DevisPage() {
  const router = useRouter()
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
        className={`px-3 py-1 rounded-full text-xs font-semibold border ${styles[status as keyof typeof styles] || styles.brouillon}`}
      >
        {labels[status as keyof typeof labels] || status}
      </span>
    )
  }

  return (
    <div>
      <h1 className="text-4xl md:text-5xl font-bold text-white mb-8">Mes devis</h1>
      <div className="bg-[#1a1f3a] rounded-3xl p-6 border border-[#2a2f4a]">
        {loading ? (
          <p className="text-gray-400 text-center py-8">Chargement...</p>
        ) : error ? (
          <p className="text-red-400 text-center py-8">{error}</p>
        ) : quotes.length === 0 ? (
          <p className="text-gray-400 text-center py-8">Aucun devis pour le moment.</p>
        ) : (
          <div className="space-y-3">
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
                <div
                  key={quote.id}
                  onClick={() => {
                    console.log('CLICK QUOTE', quote.id)
                    router.push(`/dashboard/patron/quotes/${quote.id}`)
                  }}
                  className="flex items-center justify-between p-4 bg-[#0f1429] rounded-xl border border-[#2a2f4a] hover:border-yellow-500/30 transition-colors cursor-pointer"
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
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

