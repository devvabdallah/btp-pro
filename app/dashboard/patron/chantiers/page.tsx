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
    <div className="max-w-5xl mx-auto px-4 md:px-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 md:gap-5 mb-5 md:mb-6">
        <h1 className="text-4xl md:text-5xl font-bold text-white">Mes chantiers</h1>
        <Link href="/dashboard/patron/chantiers/new">
          <Button variant="primary" size="md" className="hover:shadow-lg hover:shadow-yellow-500/20 transition-shadow">
            Ajouter un chantier
          </Button>
        </Link>
      </div>

      {/* Recherche */}
      <div className="mb-4 md:mb-5">
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
        <div className="mb-6 bg-red-500/20 border border-red-500/50 rounded-2xl p-4">
          <p className="text-red-400">{error}</p>
        </div>
      )}

      {/* Liste des chantiers */}
      {loading ? (
        <div className="bg-[#1a1f3a] rounded-3xl p-6 border border-[#2a2f4a]">
          <p className="text-gray-400 text-center py-8">Chargement...</p>
        </div>
      ) : filteredChantiers.length === 0 ? (
        <div className="bg-[#1a1f3a] rounded-3xl p-6 border border-[#2a2f4a]">
          <p className="text-gray-400 text-center py-8">
            {searchQuery ? 'Aucun chantier trouvé.' : 'Aucun chantier pour le moment.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4 md:space-y-4">
          {filteredChantiers.map((chantier) => {
            const clientName = getClientName(chantier.client)
            return (
              <Link
                key={chantier.id}
                href={`/dashboard/patron/chantiers/${chantier.id}`}
                className="block w-full bg-[#1a1f3a] rounded-3xl p-7 md:p-8 border-2 md:border border-[#2a2f4a] hover:border-yellow-500/50 hover:bg-[#1f2440] active:bg-[#252a4a] transition-all duration-150 cursor-pointer min-h-[100px] md:min-h-[110px] flex items-center"
              >
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 md:gap-3 w-full">
                  <div className="flex-1 min-w-0">
                    {/* Ligne 1 : NOM DU CLIENT + Badge statut */}
                    <div className="flex flex-col md:flex-row md:items-start md:justify-between md:gap-4 mb-2.5 md:mb-2">
                      <h3 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white leading-tight mb-2 md:mb-0">
                        {clientName || (
                          <span className="text-gray-300 text-2xl md:text-3xl font-normal">Client supprimé</span>
                        )}
                      </h3>
                      {/* Badge statut très visible */}
                      <StatusBadge status={chantier.status} />
                    </div>
                    {/* Ligne 2 : Titre du chantier */}
                    <p className="text-gray-50 text-lg md:text-xl mb-2 md:mb-1.5 font-semibold">
                      {chantier.title || 'Chantier'}
                    </p>
                    {/* Ligne 3 : Métier */}
                    <div className="mb-2 md:mb-1.5">
                      <span className="text-gray-200 text-sm md:text-base font-medium">
                        {getTradeLabel(chantier.trade)}
                      </span>
                    </div>
                    {/* Ligne 4 : Adresse */}
                    {chantier.address && (
                      <p className="text-gray-200 text-sm md:text-base leading-relaxed overflow-hidden" style={{
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        textOverflow: 'ellipsis'
                      }}>
                        {chantier.address}
                      </p>
                    )}
                  </div>
                  <div className="text-gray-400 text-2xl md:text-3xl flex-shrink-0 ml-2 md:ml-4 flex items-center">
                    →
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
