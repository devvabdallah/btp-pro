'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { getClients, Client } from '@/lib/clients-actions'
import Input from '@/components/ui/Input'

export default function ClientsEmployePage() {
  const [clients, setClients] = useState<Client[]>([])
  const [filteredClients, setFilteredClients] = useState<Client[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const result = await getClients()
      if (result.success && result.clients) {
        setClients(result.clients)
        setFilteredClients(result.clients)
      }
      setLoading(false)
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
