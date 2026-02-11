'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabaseClient'
import StatusBadge from '@/components/ui/StatusBadge'
import { getTradeLabel } from '@/lib/trades'

interface Client {
  id: string
  first_name: string
  last_name: string
  phone: string | null
}

interface Chantier {
  id: string
  title: string
  address: string | null
  status: string | null
  trade: string | null
  created_at: string
  client: Client | null
}

export default function ChantierDetailEmployePage() {
  const router = useRouter()
  const params = useParams()
  const chantierId = params.id as string

  const [chantier, setChantier] = useState<Chantier | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      setLoading(true)
      setError(null)

      try {
        // 1) Vérifier l'authentification
        const { data: { user }, error: userError } = await supabase.auth.getUser()

        if (userError || !user) {
          setError('Utilisateur non connecté')
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

        // 3) Charger le chantier par son id avec filtre entreprise_id et relation client
        const { data: chantierData, error: chantierError } = await supabase
          .from('chantiers')
          .select('id, title, address, status, trade, created_at, client:clients(id,first_name,last_name,phone)')
          .eq('id', chantierId)
          .eq('entreprise_id', profile.entreprise_id)
          .single()

        if (chantierError || !chantierData) {
          setError('Chantier introuvable.')
          setLoading(false)
          return
        }

        // Normaliser les données : convertir client (tableau) en objet unique ou null
        const normalizedChantier: Chantier = {
          ...chantierData,
          client: Array.isArray(chantierData.client) 
            ? (chantierData.client.length > 0 ? chantierData.client[0] : null)
            : chantierData.client || null
        }

        setChantier(normalizedChantier)
      } catch (err) {
        console.error('Unexpected error:', err)
        setError('Une erreur inattendue est survenue.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [chantierId])

  // Fonction pour formater le nom du client
  const getClientName = (client: Client | null) => {
    if (!client) return 'Client supprimé'
    return `${client.last_name.toUpperCase()} ${client.first_name}`
  }

  // Fonction pour obtenir l'URL Google Maps
  const getGoogleMapsUrl = (address: string | null | undefined): string => {
    if (!address) return ''
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`
  }

  // Formater la date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  }

  if (loading) {
    return (
      <div className="bg-white/[0.02] backdrop-blur-sm rounded-xl p-12 md:p-16 border border-white/[0.06] shadow-sm">
        <p className="text-gray-400/70 text-center text-sm md:text-base font-medium">Chargement...</p>
      </div>
    )
  }

  if (error || !chantier) {
    return (
      <div className="space-y-6">
        <Link href="/dashboard/employe/chantiers" className="text-gray-400 hover:text-white inline-block mb-4">
          ← Retour aux chantiers
        </Link>
        <div className="bg-red-500/20 border border-red-500/50 rounded-xl p-4 backdrop-blur-sm">
          <p className="text-red-400/95 text-sm">{error || 'Chantier introuvable'}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-10 md:space-y-14">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6 md:gap-8">
        <div className="flex-1">
          <Link href="/dashboard/employe/chantiers" className="text-gray-400 hover:text-white inline-block mb-4">
            ← Retour aux chantiers
          </Link>
          <h1 className="text-[28px] md:text-4xl font-semibold text-white/95 mb-3.5 tracking-[-0.02em] leading-[1.15]">
            {chantier.title || 'Chantier'}
          </h1>
          <p className="text-sm md:text-[15px] text-gray-400/80 leading-relaxed font-normal">
            Vue en lecture seule
          </p>
        </div>
        <StatusBadge status={chantier.status} />
      </div>

      {/* Informations principales */}
      <div className="bg-white/[0.02] backdrop-blur-sm rounded-xl p-8 md:p-10 border border-white/[0.06] shadow-sm space-y-6">
        {/* Client */}
        <div>
          <h2 className="text-lg font-semibold text-white/95 mb-3">Client</h2>
          <div className="space-y-2">
            <p className="text-base md:text-lg text-white/90 font-medium">
              {getClientName(chantier.client)}
            </p>
            {chantier.client?.phone && (
              <p className="text-sm md:text-base text-gray-300/80">
                {chantier.client.phone}
              </p>
            )}
          </div>
        </div>

        {/* Métier */}
        {chantier.trade && (
          <div>
            <h2 className="text-lg font-semibold text-white/95 mb-3">Métier</h2>
            <p className="text-base md:text-lg text-white/90">
              {getTradeLabel(chantier.trade)}
            </p>
          </div>
        )}

        {/* Adresse */}
        {chantier.address && (
          <div>
            <h2 className="text-lg font-semibold text-white/95 mb-3">Adresse</h2>
            <p className="text-base md:text-lg text-white/90 mb-2">
              {chantier.address}
            </p>
            <a
              href={getGoogleMapsUrl(chantier.address)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm text-orange-400 hover:text-orange-300 transition-colors"
            >
              <span>📍</span>
              <span>Voir sur Google Maps</span>
            </a>
          </div>
        )}

        {/* Date de création */}
        <div>
          <h2 className="text-lg font-semibold text-white/95 mb-3">Date de création</h2>
          <p className="text-base md:text-lg text-white/90">
            {formatDate(chantier.created_at)}
          </p>
        </div>
      </div>

      {/* Note pour les employés */}
      <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-6 backdrop-blur-sm">
        <p className="text-blue-300 text-sm">
          Vous êtes en mode lecture seule. Seul le patron peut modifier les chantiers.
        </p>
      </div>
    </div>
  )
}
