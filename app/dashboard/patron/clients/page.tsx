'use client'

import { useEffect, useState, useMemo } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabaseClient'
import { Client } from '@/lib/clients-actions'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'

export default function ClientsPage() {
  const pathname = usePathname()
  const [clients, setClients] = useState<Client[]>([])
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

        // 3) Fetch clients avec entreprise_id
        const { data: clientsData, error: clientsError } = await supabase
          .from('clients')
          .select('*')
          .eq('entreprise_id', profile.entreprise_id)
          .order('last_name', { ascending: true })
          .order('first_name', { ascending: true })

        if (clientsError) {
          console.error('Error fetching clients:', clientsError)
          setError(clientsError.message || 'Erreur lors de la récupération des clients.')
          setLoading(false)
          return
        }

        setClients(clientsData || [])
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

  // Re-fetch quand la page redevient visible (après retour depuis création)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        async function load() {
          try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            const { data: profile } = await supabase
              .from('profiles')
              .select('entreprise_id')
              .eq('id', user.id)
              .single()

            if (!profile?.entreprise_id) return

            const { data: clientsData } = await supabase
              .from('clients')
              .select('*')
              .eq('entreprise_id', profile.entreprise_id)
              .order('last_name', { ascending: true })
              .order('first_name', { ascending: true })

            if (clientsData) {
              setClients(clientsData)
            }
          } catch (err) {
            console.error('Error refreshing clients:', err)
          }
        }
        load()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [])

  // Filtrage instantané avec debounce
  const filteredClients = useMemo(() => {
    if (!debouncedSearchQuery.trim()) {
      return clients
    }

    const query = debouncedSearchQuery.toLowerCase().trim()
    return clients.filter(
      (client) =>
        client.first_name.toLowerCase().includes(query) ||
        client.last_name.toLowerCase().includes(query) ||
        client.phone.toLowerCase().includes(query)
    )
  }, [debouncedSearchQuery, clients])

  return (
    <div className="space-y-8 md:space-y-12">
      {/* Header avec titre et bouton */}
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-5 md:gap-6">
        <div className="flex-1">
          <h1 className="text-[28px] md:text-4xl font-semibold text-white mb-3 tracking-[-0.02em] leading-[1.2]">
            Mes clients
          </h1>
          <p className="text-sm md:text-[15px] text-gray-400/90 leading-relaxed font-normal">
            Gérez votre base de clients
          </p>
        </div>
        <Link href="/dashboard/patron/clients/nouveau">
          <Button variant="primary" size="md">
            Ajouter un client
          </Button>
        </Link>
      </div>

      {/* Recherche */}
      <div>
        <Input
          label="Rechercher un client"
          type="text"
          placeholder="Nom, prénom ou téléphone..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          autoFocus={false}
          className="text-base md:text-lg py-4 md:py-3"
        />
      </div>

      {/* Erreur */}
      {error && (
        <div className="bg-red-500/20 border border-red-500/50 rounded-xl p-4 backdrop-blur-sm">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {/* Liste des clients */}
      {loading ? (
        <div className="bg-white/[0.02] backdrop-blur-sm rounded-xl p-8 md:p-10 border border-white/[0.06] shadow-sm">
          <p className="text-gray-400/80 text-center text-sm md:text-base">Chargement...</p>
        </div>
      ) : filteredClients.length === 0 ? (
        <div className="bg-white/[0.02] backdrop-blur-sm rounded-xl p-8 md:p-10 border border-white/[0.06] shadow-sm">
          <p className="text-gray-400/80 text-center text-sm md:text-base">
            {searchQuery ? 'Aucun client trouvé.' : 'Aucun client pour le moment.'}
          </p>
        </div>
      ) : (
        <div className="bg-white/[0.02] backdrop-blur-sm rounded-xl border border-white/[0.06] overflow-hidden shadow-sm">
          <div className="divide-y divide-white/[0.06]">
            {filteredClients.map((client) => (
              <Link
                key={client.id}
                href={`/dashboard/patron/clients/${client.id}`}
                className="block p-4 md:p-5 hover:bg-white/[0.03] transition-colors duration-200"
              >
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2.5 md:gap-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg md:text-xl font-semibold text-white mb-2 leading-tight">
                      {client.last_name.toUpperCase()} {client.first_name}
                    </h3>
                    <div className="flex flex-col md:flex-row md:items-center gap-1.5 md:gap-2">
                      <span className="text-gray-300/90 text-sm md:text-base whitespace-nowrap font-medium">
                        {client.phone}
                      </span>
                      <span className="hidden md:inline text-gray-500/60 mx-0.5">•</span>
                      <p className="text-gray-300/90 text-sm md:text-base truncate md:whitespace-normal">
                        {client.address}
                      </p>
                    </div>
                  </div>
                  <div className="text-gray-400/70 text-lg md:text-xl flex-shrink-0 ml-2 md:ml-3 flex items-center">
                    →
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
