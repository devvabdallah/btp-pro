'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { APP_NAME } from '@/lib/app-config'
import Button from '@/components/ui/Button'
import Link from 'next/link'
import { getQuoteById } from '@/lib/quotes-actions'

interface PageProps {
  params: Promise<{ id: string }>
}

export default function QuoteDetailPage({ params }: PageProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [quote, setQuote] = useState<any>(null)
  const [quoteId, setQuoteId] = useState<string | null>(null)

  // Récupérer l'ID depuis params (Promise dans Next.js 14)
  useEffect(() => {
    params.then((p) => setQuoteId(p.id))
  }, [params])

  const formatAmount = (amount: number) =>
    new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount)

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })

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
        className={`px-4 py-2 rounded-full text-sm font-semibold border ${styles[status as keyof typeof styles] || styles.brouillon}`}
      >
        {labels[status as keyof typeof labels] || status}
      </span>
    )
  }

  useEffect(() => {
    if (!quoteId) return

    const load = async () => {
      // Vérifier l'utilisateur
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) return router.push('/login')

      // Charger le rôle utilisateur
      const { data: profile } = await supabase
        .from('profiles')
        .select('role, entreprise_id')
        .eq('id', user.id)
        .single()

      if (!profile) return router.push('/login')

      if (profile.role !== 'employe') {
        return router.push('/dashboard/patron')
      }

      // Charger le devis
      const res = await getQuoteById(quoteId)

      if (!res.success || !res.quote) {
        return router.push('/dashboard/employe')
      }

      setQuote(res.quote)
      setLoading(false)
    }

    load()
  }, [quoteId, router])

  if (loading) return <div className="text-white p-8">Chargement...</div>

  if (!quote) return null

  return (
    <main className="min-h-screen bg-[#0a0e27]">
      {/* Header */}
      <header className="w-full px-4 py-6 md:px-8 border-b border-[#2a2f4a]">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-2xl flex items-center justify-center">
              <span className="text-2xl font-bold text-[#0a0e27]">B</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-white">{APP_NAME}</h1>
          </div>
          <Link href="/dashboard/employe">
            <Button variant="secondary" size="sm">
              Retour aux devis
            </Button>
          </Link>
        </div>
      </header>

      {/* Contenu principal */}
      <div className="max-w-4xl mx-auto px-4 py-12 md:px-8">
        <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-2">
              {quote.title}
            </h2>
            <p className="text-gray-400">
              Créé le {formatDate(quote.created_at)}
            </p>
          </div>
          {getStatusBadge(quote.status)}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Informations client */}
          <div className="bg-[#1a1f3a] rounded-3xl p-6 border border-[#2a2f4a]">
            <h3 className="text-lg font-semibold text-white mb-4">Client</h3>
            <p className="text-gray-200 mb-2">{quote.client}</p>
            {quote.contact && (
              <p className="text-gray-400 text-sm">{quote.contact}</p>
            )}
          </div>

          {/* Montant */}
          <div className="bg-[#1a1f3a] rounded-3xl p-6 border border-[#2a2f4a]">
            <h3 className="text-lg font-semibold text-white mb-4">Montant</h3>
            <p className="text-2xl font-bold text-white">{formatAmount(quote.amount_ht)}</p>
            <p className="text-gray-400 text-sm mt-1">Hors taxes</p>
          </div>

          {/* Statut */}
          <div className="bg-[#1a1f3a] rounded-3xl p-6 border border-[#2a2f4a]">
            <h3 className="text-lg font-semibold text-white mb-4">Statut</h3>
            {getStatusBadge(quote.status)}
            {quote.updated_at !== quote.created_at && (
              <p className="text-gray-400 text-xs mt-3">
                Modifié le {formatDate(quote.updated_at)}
              </p>
            )}
          </div>
        </div>

        {/* Description */}
        {quote.description && (
          <div className="bg-[#1a1f3a] rounded-3xl p-6 border border-[#2a2f4a] mb-8">
            <h3 className="text-lg font-semibold text-white mb-4">Description des travaux</h3>
            <p className="text-gray-200 whitespace-pre-wrap leading-relaxed">
              {quote.description}
            </p>
          </div>
        )}

        {/* Note pour les employés */}
        <div className="bg-blue-500/10 rounded-3xl p-6 border border-blue-500/30">
          <p className="text-blue-300 text-sm">
            Vous êtes en mode lecture seule. Seul le patron peut modifier les devis.
          </p>
        </div>
      </div>
    </main>
  )
}
