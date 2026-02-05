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
    <div className="space-y-10 md:space-y-14">
      {/* Header avec titre et bouton */}
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6 md:gap-8">
        <div className="flex-1">
          <h1 className="text-[28px] md:text-4xl font-semibold text-white/95 mb-3.5 tracking-[-0.02em] leading-[1.15]">
            Mes clients
          </h1>
          <p className="text-sm md:text-[15px] text-gray-400/85 leading-relaxed font-normal">
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
          <p className="text-red-400/95 text-sm">{error}</p>
        </div>
      )}

      {/* Liste des clients */}
      {loading ? (
        <div className="bg-white/[0.02] backdrop-blur-sm rounded-xl p-12 md:p-16 border border-white/[0.06] shadow-sm">
          <p className="text-gray-400/70 text-center text-sm md:text-base font-medium">Chargement...</p>
        </div>
      ) : filteredClients.length === 0 ? (
        <div className="bg-white/[0.02] backdrop-blur-sm rounded-xl p-12 md:p-16 border border-white/[0.06] shadow-sm">
          <div className="text-center space-y-4">
            <p className="text-gray-400/80 text-base md:text-lg font-medium">
              {searchQuery ? 'Aucun client trouvé' : 'Aucun client pour le moment'}
            </p>
            {!searchQuery && (
              <>
                <p className="text-gray-500/70 text-sm md:text-base">Commencez par ajouter votre premier client</p>
                <div className="pt-2">
                  <Link href="/dashboard/patron/clients/nouveau">
                    <Button variant="primary" size="md" className="min-h-[44px] px-6">
                      Ajouter un client
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
            {filteredClients.map((client) => (
              <Link
                key={client.id}
                href={`/dashboard/patron/clients/${client.id}`}
                className="block p-5 md:p-6 hover:bg-white/[0.04] transition-all duration-300 ease-out group border-l-2 border-transparent hover:border-yellow-500/30"
              >
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 md:gap-4">
                  <div className="flex-1 min-w-0 space-y-2">
                    <h3 className="text-base md:text-lg font-semibold text-white/95 group-hover:text-yellow-400/95 transition-colors duration-200 leading-snug">
                      {client.last_name.toUpperCase()} {client.first_name}
                    </h3>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-2 text-sm">
                      <span className="text-gray-300/80 whitespace-nowrap font-medium">
                        {client.phone}
                      </span>
                      <span className="hidden sm:inline text-gray-500/50">•</span>
                      <p className="text-gray-300/80 truncate sm:whitespace-normal">
                        {client.address}
                      </p>
                    </div>
                  </div>
                  <div className="text-gray-400/60 text-lg md:text-xl flex-shrink-0 ml-2 md:ml-3 flex items-center group-hover:text-gray-400/80 transition-colors duration-200">
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
