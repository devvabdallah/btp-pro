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
      draft: 'bg-gray-500/20 text-gray-300 border-gray-500/30',
      sent: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
      paid: 'bg-green-500/20 text-green-300 border-green-500/30',
    }
    const labels = {
      draft: 'Brouillon',
      sent: 'Envoyée',
      paid: 'Payée',
    }
    return (
      <span
        className={`px-4 py-1.5 rounded-full text-sm font-semibold border ${styles[status as keyof typeof styles] || styles.draft}`}
      >
        {labels[status as keyof typeof labels] || status}
      </span>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 md:px-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6 md:mb-8">
        <h1 className="text-4xl md:text-5xl font-bold text-white">Mes factures</h1>
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
            <p className="mt-2 text-sm text-red-300 text-center md:text-left">
              Essai expiré : abonnez-vous pour créer de nouvelles factures.
            </p>
          )}
        </div>
      </div>

      {/* Erreur */}
      {error && (
        <div className="mb-6 bg-red-500/20 border border-red-500/50 rounded-2xl p-4">
          <p className="text-red-400">{error}</p>
        </div>
      )}

      {/* Liste des factures */}
      {loading ? (
        <div className="bg-[#1a1f3a] rounded-3xl p-6 border border-[#2a2f4a]">
          <p className="text-gray-400 text-center py-8">Chargement...</p>
        </div>
      ) : invoices.length === 0 ? (
        <div className="bg-[#1a1f3a] rounded-3xl p-6 border border-[#2a2f4a]">
          <p className="text-gray-400 text-center py-8">Aucune facture pour le moment.</p>
        </div>
      ) : (
        <div className="space-y-4 md:space-y-3">
          {invoices.map((invoice) => (
            <Link
              key={invoice.id}
              href={`/dashboard/patron/factures/${invoice.id}`}
              className="block cursor-pointer hover:opacity-90 transition-opacity"
            >
              <div className="bg-[#0f1429] rounded-2xl p-5 md:p-6 border-2 border-[#2a2f4a] hover:border-yellow-500/50 transition-all min-h-[90px] md:min-h-[100px] flex items-center">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 md:gap-4 w-full">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-3 mb-2">
                      <h3 className="text-xl md:text-2xl font-bold text-white leading-tight">
                        {invoice.title || invoice.client}
                      </h3>
                      {getStatusBadge(invoice.status)}
                    </div>
                    <div className="flex flex-col md:flex-row md:items-center gap-1.5 md:gap-2">
                      <span className="text-gray-300 text-sm md:text-base font-medium">
                        {invoice.client}
                      </span>
                      <span className="hidden md:inline text-gray-500">•</span>
                      <span className="text-gray-300 text-base md:text-lg font-semibold whitespace-nowrap">
                        {formatAmount(invoice.amount_ht)} HT
                      </span>
                      <span className="hidden md:inline text-gray-500">•</span>
                      <span className="text-gray-400 text-sm md:text-base">
                        {formatDate(invoice.created_at)}
                      </span>
                    </div>
                  </div>
                  <div className="text-left md:text-right">
                    <p className="text-xl md:text-2xl font-bold text-white">
                      {formatAmount(invoice.amount_ht)}
                    </p>
                    <p className="text-gray-400 text-xs md:text-sm mt-0.5">HT</p>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
