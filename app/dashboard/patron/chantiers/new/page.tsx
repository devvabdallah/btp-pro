'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Link from 'next/link'
import { CHANTIER_TRADES } from '@/lib/trades'

interface Client {
  id: string
  first_name: string
  last_name: string
  phone: string
}

export default function NewChantierPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [loadingClients, setLoadingClients] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [clients, setClients] = useState<Client[]>([])
  const [clientSearchQuery, setClientSearchQuery] = useState('')
  const [showClientDropdown, setShowClientDropdown] = useState(false)

  const [formData, setFormData] = useState({
    client_id: '',
    title: '',
    address: '',
    status: 'en_cours',
    trade: 'autre',
    start_date: '',
    end_date: '',
    notes: '',
  })

  // Charger les clients au montage
  useEffect(() => {
    async function loadClients() {
      setLoadingClients(true)
      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser()

        if (userError || !user) {
          setError('Utilisateur non connecté')
          setLoadingClients(false)
          return
        }

        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('entreprise_id')
          .eq('id', user.id)
          .single()

        if (profileError || !profile || !profile.entreprise_id) {
          setError('Profil utilisateur introuvable')
          setLoadingClients(false)
          return
        }

        const { data: clientsData, error: clientsError } = await supabase
          .from('clients')
          .select('id, first_name, last_name, phone')
          .eq('entreprise_id', profile.entreprise_id)
          .order('last_name', { ascending: true })
          .order('first_name', { ascending: true })

        if (clientsError) {
          console.error('Error fetching clients:', clientsError)
          setError('Erreur lors du chargement des clients.')
          setLoadingClients(false)
          return
        }

        setClients(clientsData || [])
      } catch (err) {
        console.error('Unexpected error loading clients:', err)
        setError('Une erreur inattendue est survenue.')
      } finally {
        setLoadingClients(false)
      }
    }
    loadClients()
  }, [])

  // Filtrer les clients selon la recherche
  const filteredClients = useMemo(() => {
    if (!clientSearchQuery.trim()) {
      return clients
    }
    const query = clientSearchQuery.toLowerCase().trim()
    return clients.filter(
      (client) =>
        client.first_name.toLowerCase().includes(query) ||
        client.last_name.toLowerCase().includes(query) ||
        client.phone.includes(query)
    )
  }, [clientSearchQuery, clients])

  // Obtenir le client sélectionné
  const selectedClient = clients.find((c) => c.id === formData.client_id)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // Validation
    if (!formData.client_id) {
      setError('Veuillez sélectionner un client.')
      return
    }
    if (!formData.title.trim()) {
      setError('Le titre est obligatoire.')
      return
    }
    if (!formData.address.trim()) {
      setError('L\'adresse est obligatoire.')
      return
    }

    setLoading(true)

    try {
      // 1) Récupérer l'utilisateur connecté
      const { data: { user }, error: userError } = await supabase.auth.getUser()

      if (userError || !user) {
        setError('Utilisateur non connecté')
        setLoading(false)
        return
      }

      // 2) Charger le profil avec profiles.id = user.id
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('entreprise_id')
        .eq('id', user.id)
        .single()

      if (profileError || !profile) {
        setError('Profil utilisateur introuvable')
        setLoading(false)
        return
      }

      // 3) Vérifier que entreprise_id existe
      if (!profile.entreprise_id) {
        setError('Entreprise non liée au profil')
        setLoading(false)
        return
      }

      // 4) Insérer le chantier avec entreprise_id + champs formulaire
      const { data: chantier, error: insertError } = await supabase
        .from('chantiers')
        .insert({
          entreprise_id: profile.entreprise_id,
          client_id: formData.client_id,
          title: formData.title.trim(),
          address: formData.address.trim(),
          status: formData.status,
          trade: formData.trade || 'autre',
          start_date: formData.start_date || null,
          end_date: formData.end_date || null,
          notes: formData.notes?.trim() || null,
        })
        .select()
        .single()

      if (insertError || !chantier) {
        console.error('Insert error:', insertError)
        setError(insertError?.message || 'Erreur lors de la création du chantier.')
        setLoading(false)
        return
      }

      // Succès : rediriger vers la liste
      router.push('/dashboard/patron/chantiers')
      router.refresh()
    } catch (err) {
      console.error('Create chantier error:', err)
      setError('Une erreur inattendue est survenue.')
      setLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 md:px-6">
      <div className="mb-8">
        <Link href="/dashboard/patron/chantiers" className="text-gray-400 hover:text-white mb-4 inline-block">
          ← Retour à la liste
        </Link>
        <h1 className="text-4xl md:text-5xl font-bold text-white">Ajouter un chantier</h1>
      </div>

      <div className="bg-[#1a1f3a] rounded-3xl p-6 md:p-8 border border-[#2a2f4a] max-w-2xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-500/20 border border-red-500/50 rounded-2xl p-4">
              <p className="text-red-400">{error}</p>
            </div>
          )}

          {/* Client - Select searchable */}
          <div className="w-full">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Client *
            </label>
            <div className="relative">
              <input
                type="text"
                className="w-full px-4 py-3 bg-[#1a1f3a] border border-gray-600 rounded-2xl text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent transition-all"
                placeholder={selectedClient ? `${selectedClient.last_name.toUpperCase()} ${selectedClient.first_name} – ${selectedClient.phone}` : "Rechercher un client..."}
                value={selectedClient ? '' : clientSearchQuery}
                onChange={(e) => {
                  setClientSearchQuery(e.target.value)
                  setShowClientDropdown(true)
                  if (formData.client_id) {
                    setFormData({ ...formData, client_id: '' })
                  }
                }}
                onFocus={() => {
                  if (!selectedClient) {
                    setShowClientDropdown(true)
                  }
                }}
                onBlur={() => {
                  // Délai pour permettre le clic sur une option
                  setTimeout(() => setShowClientDropdown(false), 200)
                }}
              />
              {selectedClient && (
                <button
                  type="button"
                  onClick={() => {
                    setFormData({ ...formData, client_id: '' })
                    setClientSearchQuery('')
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white text-sm"
                >
                  ✕
                </button>
              )}
              {showClientDropdown && filteredClients.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-[#1a1f3a] border border-gray-600 rounded-2xl shadow-lg max-h-60 overflow-y-auto">
                  {filteredClients.map((client) => (
                    <button
                      key={client.id}
                      type="button"
                      className="w-full px-4 py-3 text-left text-gray-200 hover:bg-[#252a4a] transition-colors border-b border-gray-700/50 last:border-b-0"
                      onClick={() => {
                        setFormData({ ...formData, client_id: client.id })
                        setClientSearchQuery('')
                        setShowClientDropdown(false)
                      }}
                    >
                      <div className="font-medium">{client.last_name.toUpperCase()} {client.first_name}</div>
                      <div className="text-sm text-gray-400">{client.phone}</div>
                    </button>
                  ))}
                </div>
              )}
              {showClientDropdown && filteredClients.length === 0 && clientSearchQuery && (
                <div className="absolute z-10 w-full mt-1 bg-[#1a1f3a] border border-gray-600 rounded-2xl shadow-lg p-4">
                  <p className="text-gray-400 text-center">Aucun client trouvé</p>
                </div>
              )}
            </div>
          </div>

          <Input
            label="Titre *"
            type="text"
            required
            placeholder="Maison à Merlevenez"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          />

          <Input
            label="Adresse *"
            type="text"
            required
            autoComplete="street-address"
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
          />

          {/* Statut */}
          <div className="w-full">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Statut *
            </label>
            <select
              className="w-full px-4 py-3 bg-[#1a1f3a] border border-gray-600 rounded-2xl text-gray-200 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent transition-all"
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              required
            >
              <option value="a_planifier">À planifier</option>
              <option value="en_cours">En cours</option>
              <option value="en_attente">En attente</option>
              <option value="en_paiement">En paiement</option>
              <option value="termine">Terminé</option>
            </select>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input
              label="Date de début"
              type="date"
              value={formData.start_date}
              onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
            />
            <Input
              label="Date de fin"
              type="date"
              value={formData.end_date}
              onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
            />
          </div>

          {/* Métier du chantier */}
          <div className="w-full">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Métier du chantier *
            </label>
            <select
              className="w-full px-4 py-3 bg-[#1a1f3a] border border-gray-600 rounded-2xl text-gray-200 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent transition-all text-base"
              value={formData.trade}
              onChange={(e) => setFormData({ ...formData, trade: e.target.value })}
              required
            >
              {CHANTIER_TRADES.map((trade) => (
                <option key={trade.value} value={trade.value}>
                  {trade.emoji} {trade.label}
                </option>
              ))}
            </select>
          </div>

          {/* Notes */}
          <div className="w-full">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Notes
            </label>
            <textarea
              className="w-full px-4 py-3 bg-[#1a1f3a] border border-gray-600 rounded-2xl text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent transition-all min-h-[120px]"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Notes additionnelles sur le chantier..."
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-4 pt-4">
            <Button type="submit" variant="primary" size="lg" disabled={loading || loadingClients} className="w-full sm:flex-1 py-4 sm:py-3">
              {loading ? 'Création...' : 'Créer le chantier'}
            </Button>
            <Link href="/dashboard/patron/chantiers" className="w-full sm:flex-1">
              <Button type="button" variant="secondary" size="lg" className="w-full py-4 sm:py-3">
                Annuler
              </Button>
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}

