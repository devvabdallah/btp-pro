'use client'

import { useEffect, useState, useMemo } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabaseClient'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import StatusBadge from '@/components/ui/StatusBadge'
import { getTradeLabel } from '@/lib/trades'

interface Client {
  id: string
  first_name: string
  last_name: string
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

export default function ChantiersPage() {
  const pathname = usePathname()
  const [chantiers, setChantiers] = useState<Chantier[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('')
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

        // 3) Fetch chantiers avec entreprise_id et relation client
        const { data: chantiersData, error: chantiersError } = await supabase
          .from('chantiers')
          .select('id, title, address, status, trade, created_at, client:clients(id,first_name,last_name)')
          .eq('entreprise_id', profile.entreprise_id)
          .order('created_at', { ascending: false })

        if (chantiersError) {
          console.error('Error fetching chantiers:', chantiersError)
          setError(chantiersError.message || 'Erreur lors de la récupération des chantiers.')
          setLoading(false)
          return
        }

        // Normaliser les données : convertir client (tableau) en objet unique ou null
        const normalizedChantiers: Chantier[] = (chantiersData || []).map((chantier: any) => ({
          ...chantier,
          client: Array.isArray(chantier.client) 
            ? (chantier.client.length > 0 ? chantier.client[0] : null)
            : chantier.client || null
        }))

        setChantiers(normalizedChantiers)
      } catch (err) {
        console.error('Unexpected error:', err)
        setError('Une erreur inattendue est survenue.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [pathname])

  // Debounce de la recherche (200ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery)
    }, 200)

    return () => clearTimeout(timer)
  }, [searchQuery])

  // Filtrage instantané avec debounce
  const filteredChantiers = useMemo(() => {
    if (!debouncedSearchQuery.trim()) {
      return chantiers
    }

    const query = debouncedSearchQuery.toLowerCase().trim()
    return chantiers.filter(
      (chantier) =>
        chantier.title.toLowerCase().includes(query) ||
        (chantier.address && chantier.address.toLowerCase().includes(query)) ||
        (chantier.status && chantier.status.toLowerCase().includes(query)) ||
        (chantier.client && (
          chantier.client.first_name.toLowerCase().includes(query) ||
          chantier.client.last_name.toLowerCase().includes(query)
        ))
    )
  }, [debouncedSearchQuery, chantiers])


  // Fonction pour formater le nom du client
  const getClientName = (client: Client | null) => {
    if (!client) return null
    return `${client.last_name.toUpperCase()} ${client.first_name}`
  }

  return (
    <div className="space-y-10 md:space-y-14">
      {/* Header avec titre et bouton */}
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6 md:gap-8">
        <div className="flex-1">
          <h1 className="text-[28px] md:text-4xl font-semibold text-white/95 mb-3.5 tracking-[-0.02em] leading-[1.15]">
            Mes chantiers
          </h1>
          <p className="text-sm md:text-[15px] text-gray-400/80 leading-relaxed font-normal">
            Suivez l'avancement de vos projets
          </p>
        </div>
        <Link href="/dashboard/patron/chantiers/new">
          <Button variant="primary" size="md" className="hover:shadow-lg hover:shadow-yellow-500/20 transition-shadow duration-200">
            Ajouter un chantier
          </Button>
        </Link>
      </div>

      {/* Recherche */}
      <div>
        <Input
          label="Rechercher un chantier"
          type="text"
          placeholder="Nom client, titre, adresse ou statut…"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          autoFocus={false}
          className="text-base md:text-lg py-4 md:py-4"
        />
      </div>

      {/* Erreur */}
      {error && (
        <div className="bg-red-500/20 border border-red-500/50 rounded-xl p-4 backdrop-blur-sm">
          <p className="text-red-400/95 text-sm">{error}</p>
        </div>
      )}

      {/* Liste des chantiers */}
      {loading ? (
        <div className="bg-white/[0.02] backdrop-blur-sm rounded-xl p-12 md:p-16 border border-white/[0.06] shadow-sm">
          <p className="text-gray-400/70 text-center text-sm md:text-base font-medium">Chargement...</p>
        </div>
      ) : filteredChantiers.length === 0 ? (
        <div className="bg-white/[0.02] backdrop-blur-sm rounded-xl p-12 md:p-16 border border-white/[0.06] shadow-sm">
          <div className="text-center space-y-4">
            <p className="text-gray-400/80 text-base md:text-lg font-medium">
              {searchQuery ? 'Aucun chantier trouvé' : 'Aucun chantier pour le moment'}
            </p>
            {!searchQuery && (
              <>
                <p className="text-gray-500/70 text-sm md:text-base">Commencez par ajouter votre premier chantier</p>
                <div className="pt-2">
                  <Link href="/dashboard/patron/chantiers/new">
                    <Button variant="primary" size="md" className="min-h-[44px] px-6">
                      Ajouter un chantier
                    </Button>
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-white/[0.02] backdrop-blur-sm rounded-xl border border-white/[0.06] overflow-hidden shadow-sm">
          <div className="divide-y divide-white/[0.06]">
            {filteredChantiers.map((chantier) => {
              const clientName = getClientName(chantier.client)
              return (
                <Link
                  key={chantier.id}
                  href={`/dashboard/patron/chantiers/${chantier.id}`}
                  className="block p-5 md:p-6 hover:bg-white/[0.04] transition-all duration-200 ease-out group border-l-2 border-transparent hover:border-yellow-500/30"
                >
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 md:gap-6">
                    <div className="flex-1 min-w-0 space-y-2.5">
                      {/* Ligne 1 : NOM DU CLIENT + Badge statut */}
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                        <h3 className="text-base md:text-lg font-semibold text-white/95 group-hover:text-yellow-400/95 transition-colors duration-200 leading-snug">
                          {clientName || (
                            <span className="text-gray-300/85 font-normal">Client supprimé</span>
                          )}
                        </h3>
                        <StatusBadge status={chantier.status} />
                      </div>
                      {/* Ligne 2 : Titre du chantier */}
                      <p className="text-gray-50/90 text-base md:text-lg font-medium">
                        {chantier.title || 'Chantier'}
                      </p>
                      {/* Ligne 3 : Métier */}
                      <div>
                        <span className="text-gray-200/75 text-sm md:text-base font-medium">
                          {getTradeLabel(chantier.trade)}
                        </span>
                      </div>
                      {/* Ligne 4 : Adresse */}
                      {chantier.address && (
                        <p className="text-gray-200/75 text-sm md:text-base leading-relaxed overflow-hidden" style={{
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          textOverflow: 'ellipsis'
                        }}>
                          {chantier.address}
                        </p>
                      )}
                    </div>
                    <div className="text-gray-400/60 text-lg md:text-xl flex-shrink-0 ml-2 md:ml-4 flex items-center group-hover:text-gray-400/80 transition-colors duration-200">
                      →
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
