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
    <div className="max-w-4xl mx-auto px-4 md:px-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 md:gap-4 mb-4 md:mb-6">
        <h1 className="text-4xl md:text-5xl font-bold text-white">Mes clients</h1>
        <Link href="/dashboard/patron/clients/nouveau">
          <Button variant="primary" size="md">
            Ajouter un client
          </Button>
        </Link>
      </div>

      {/* Recherche */}
      <div className="mb-3 md:mb-5">
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
        <div className="mb-6 bg-red-500/20 border border-red-500/50 rounded-2xl p-4">
          <p className="text-red-400">{error}</p>
        </div>
      )}

      {/* Liste des clients */}
      {loading ? (
        <div className="bg-[#1a1f3a] rounded-3xl p-6 border border-[#2a2f4a]">
          <p className="text-gray-400 text-center py-8">Chargement...</p>
        </div>
      ) : filteredClients.length === 0 ? (
        <div className="bg-[#1a1f3a] rounded-3xl p-6 border border-[#2a2f4a]">
          <p className="text-gray-400 text-center py-8">
            {searchQuery ? 'Aucun client trouvé.' : 'Aucun client pour le moment.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4 md:space-y-3">
          {filteredClients.map((client) => (
            <Link
              key={client.id}
              href={`/dashboard/patron/clients/${client.id}`}
              className="block w-full bg-[#1a1f3a] rounded-3xl p-6 md:p-6 border-2 md:border border-[#2a2f4a] hover:border-yellow-500/50 hover:bg-[#1f2440] active:bg-[#252a4a] transition-all duration-150 cursor-pointer min-h-[80px] md:min-h-[84px] flex items-center"
            >
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2.5 md:gap-2 w-full">
                <div className="flex-1 min-w-0">
                  <h3 className="text-2xl md:text-3xl lg:text-4xl font-bold text-white mb-2 md:mb-1.5 leading-tight">
                    {client.last_name.toUpperCase()} {client.first_name}
                  </h3>
                  <div className="flex flex-col md:flex-row md:items-center gap-1.5 md:gap-2">
                    <span className="text-gray-100 text-base md:text-lg whitespace-nowrap font-medium">
                      {client.phone}
                    </span>
                    <span className="hidden md:inline text-gray-400 mx-0.5">•</span>
                    <p className="text-gray-100 text-base md:text-lg truncate md:whitespace-normal">
                      {client.address}
                    </p>
                  </div>
                </div>
                <div className="text-gray-400 text-xl md:text-2xl flex-shrink-0 ml-2 md:ml-3 flex items-center">
                  →
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
