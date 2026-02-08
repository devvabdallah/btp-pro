'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import Button from '@/components/ui/Button'

interface Invoice {
  id: string
  title: string | null
  client: string
  amount_ht: number
  status: string
  created_at: string
}

export default function FacturesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isCompanyActive, setIsCompanyActive] = useState<boolean | null>(null)

  useEffect(() => {
    async function load() {
      setLoading(true)
      setError(null)

      try {
        const supabase = createSupabaseBrowserClient()
        
        // 1) Vérifier l'authentification
        const { data: { user }, error: userError } = await supabase.auth.getUser()

        if (userError || !user) {
          setError('Session expirée. Veuillez vous reconnecter.')
          setLoading(false)
          return
        }

        // 2) Récupérer le profil avec profiles.id = user.id
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('entreprise_id')
          .eq('id', user.id)
          .single()

        if (profileError || !profile) {
          setError('Profil utilisateur introuvable.')
          setLoading(false)
          return
        }

        if (!profile.entreprise_id) {
          setError('Entreprise non liée au profil.')
          setLoading(false)
          return
        }

        // 2.5 Vérifier si l'entreprise est active (abonnement/essai)
        try {
          const { checkCompanyActive } = await import('@/lib/subscription-check')
          const { active } = await checkCompanyActive(supabase, profile.entreprise_id)
          setIsCompanyActive(active)
        } catch (err) {
          // En cas d'erreur, laisser null (comportement par défaut)
          setIsCompanyActive(null)
        }

        // 3) Fetch factures avec entreprise_id
        const { data: invoicesData, error: invoicesError } = await supabase
          .from('invoices')
          .select('id, title, client, amount_ht, status, created_at')
          .eq('entreprise_id', profile.entreprise_id)
          .order('created_at', { ascending: false })

        if (invoicesError) {
          console.error('Error fetching invoices:', invoicesError)
          setError(invoicesError.message || 'Erreur lors de la récupération des factures.')
          setLoading(false)
          return
        }

        setInvoices(invoicesData || [])
      } catch (err) {
        console.error('Unexpected error:', err)
        setError('Une erreur inattendue est survenue.')
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
      draft: 'bg-gray-500/15 text-gray-300/90 border-gray-500/25',
      sent: 'bg-blue-500/15 text-blue-300/90 border-blue-500/25',
      paid: 'bg-green-500/15 text-green-300/90 border-green-500/25',
    }
    const labels = {
      draft: 'Brouillon',
      sent: 'Envoyée',
      paid: 'Payée',
    }
    return (
      <span
        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${styles[status as keyof typeof styles] || styles.draft}`}
      >
        {labels[status as keyof typeof labels] || status}
      </span>
    )
  }

  return (
    <div className="space-y-12 md:space-y-16 lg:space-y-20">
      {/* Header avec titre et bouton */}
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6 md:gap-8">
        <div className="flex-1">
          <h1 className="text-[28px] md:text-4xl font-semibold text-white/95 mb-3.5 tracking-[-0.02em] leading-[1.15]">
            Mes factures
          </h1>
          <p className="text-sm md:text-[15px] text-gray-400/80 leading-relaxed font-normal">
            Gérez vos factures et suivez les paiements
          </p>
        </div>
        <div className="flex flex-col w-full md:w-auto">
          <Link 
            href="/dashboard/patron/factures/nouveau" 
            className={isCompanyActive === false ? 'pointer-events-none opacity-50 cursor-not-allowed' : 'w-full md:w-auto'}
            onClick={(e) => {
              if (isCompanyActive === false) {
                e.preventDefault()
              }
            }}
          >
            <Button 
              variant="primary" 
              size="lg"
              disabled={isCompanyActive === false}
              className="w-full md:w-auto min-h-[48px] px-8 text-base md:text-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Créer une facture
            </Button>
          </Link>
          {isCompanyActive === false && (
            <p className="mt-2 text-sm text-red-300/90 text-center md:text-left">
              Essai expiré : abonnez-vous pour créer de nouvelles factures.
            </p>
          )}
        </div>
      </div>

      {/* Erreur */}
      {error && (
        <div className="bg-red-500/20 border border-red-500/50 rounded-xl p-4 backdrop-blur-sm">
          <p className="text-red-400/95 text-sm">{error}</p>
        </div>
      )}

      {/* Liste des factures */}
      {loading ? (
        <div className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 rounded-xl p-16 md:p-20 border border-white/10 shadow-lg shadow-black/30 backdrop-blur-sm">
          <p className="text-gray-300 text-center text-sm md:text-base font-medium">Chargement...</p>
        </div>
      ) : invoices.length === 0 ? (
        <div className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 rounded-xl p-16 md:p-20 border border-white/10 shadow-lg shadow-black/30 backdrop-blur-sm">
          <div className="text-center space-y-4">
            <p className="text-gray-200 text-base md:text-lg font-medium">Aucune facture pour le moment</p>
            <p className="text-gray-400 text-sm md:text-base">Commencez par créer votre première facture</p>
            <div className="pt-2">
              <Link href="/dashboard/patron/factures/nouveau">
                <Button variant="primary" size="md" className="min-h-[44px] px-6" disabled={isCompanyActive === false}>
                  Créer une facture
                </Button>
              </Link>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 rounded-xl border border-white/10 overflow-hidden shadow-lg shadow-black/30 backdrop-blur-sm">
          <div className="divide-y divide-white/10">
            {invoices.map((invoice) => (
              <Link
                key={invoice.id}
                href={`/dashboard/patron/factures/${invoice.id}`}
                className="block p-6 md:p-8 hover:bg-white/5 transition-all duration-200 ease-out group border-l-2 border-transparent hover:border-orange-500/40"
              >
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 md:gap-6">
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 sm:gap-3">
                      <h3 className="text-base md:text-lg font-semibold text-white group-hover:text-orange-400 transition-colors duration-200 leading-snug">
                        {invoice.title || invoice.client}
                      </h3>
                      {getStatusBadge(invoice.status)}
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-2 text-sm">
                      <span className="text-gray-300 font-medium">
                        {invoice.client}
                      </span>
                      <span className="hidden sm:inline text-gray-500">•</span>
                      <span className="text-gray-400">
                        {formatDate(invoice.created_at)}
                      </span>
                    </div>
                  </div>
                  <div className="text-left md:text-right flex-shrink-0">
                    <p className="text-xl md:text-2xl font-semibold text-white tabular-nums leading-none tracking-tight">
                      {formatAmount(invoice.amount_ht)}
                    </p>
                    <p className="text-gray-400 text-xs mt-1 font-medium">HT</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
