'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabaseClient'
import Input from '@/components/ui/Input'

interface Client {
  id: string
  entreprise_id: string
  first_name: string
  last_name: string
  phone: string
  address: string
  email: string | null
  notes: string | null
  created_at: string
}

export default function ClientsEmployePage() {
  const [clients, setClients] = useState<Client[]>([])
  const [filteredClients, setFilteredClients] = useState<Client[]>([])
  const [searchQuery, setSearchQuery] = useState('')
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

        // 3) Charger les clients avec entreprise_id
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
        setFilteredClients(clientsData || [])
      } catch (err) {
        console.error('Unexpected error:', err)
        setError('Une erreur inattendue est survenue.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredClients(clients)
      return
    }

    const query = searchQuery.toLowerCase().trim()
    const filtered = clients.filter(
      (client) =>
        client.first_name.toLowerCase().includes(query) ||
        client.last_name.toLowerCase().includes(query) ||
        client.phone.toLowerCase().includes(query)
    )
    setFilteredClients(filtered)
  }, [searchQuery, clients])

  return (
    <div>
      <h1 className="text-4xl md:text-5xl font-bold text-white mb-8">Clients de l'entreprise</h1>

      {/* Recherche */}
      <div className="mb-6">
        <Input
          label="Rechercher un client"
          type="text"
          placeholder="Nom, prénom ou téléphone..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Erreur */}
      {error && (
        <div className="mb-6 bg-red-500/20 border border-red-500/50 rounded-xl p-4 backdrop-blur-sm">
          <p className="text-red-400/95 text-sm">{error}</p>
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
        <div className="space-y-3">
          {filteredClients.map((client) => (
            <Link
              key={client.id}
              href={`/dashboard/employe/clients/${client.id}`}
              className="block bg-[#1a1f3a] rounded-3xl p-6 border border-[#2a2f4a] hover:border-yellow-500/50 transition-colors"
            >
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                <div className="flex-1">
                  <h3 className="text-2xl md:text-3xl font-bold text-white mb-1">
                    {client.last_name.toUpperCase()} {client.first_name}
                  </h3>
                  <p className="text-gray-400 text-base md:text-lg">
                    {client.phone} • {client.address}
                  </p>
                </div>
                <div className="text-gray-500 text-sm md:text-base">
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
