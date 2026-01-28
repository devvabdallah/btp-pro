'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
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

export default function EditChantierPage() {
  const router = useRouter()
  const params = useParams()
  const chantierId = params.id as string

  const [chantier, setChantier] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
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

  // Charger le chantier et les clients
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

        if (profileError || !profile || !profile.entreprise_id) {
          setError('Profil utilisateur introuvable.')
          setLoading(false)
          return
        }

        // 3) Charger le chantier et les clients en parallèle
        const [chantierResult, clientsResult] = await Promise.all([
          supabase
            .from('chantiers')
            .select('id, title, address, status, trade, start_date, end_date, notes, client_id, client:clients(id,first_name,last_name,phone)')
            .eq('id', chantierId)
            .eq('entreprise_id', profile.entreprise_id)
            .single(),
          supabase
            .from('clients')
            .select('id, first_name, last_name, phone')
            .eq('entreprise_id', profile.entreprise_id)
            .order('last_name', { ascending: true })
            .order('first_name', { ascending: true }),
        ])

        if (chantierResult.error || !chantierResult.data) {
          setError('Chantier introuvable.')
          setLoading(false)
          return
        }

        if (clientsResult.error) {
          console.error('Error fetching clients:', clientsResult.error)
        } else {
          setClients(clientsResult.data || [])
        }

        const chantierData = chantierResult.data
        const client = Array.isArray(chantierData.client) 
          ? (chantierData.client.length > 0 ? chantierData.client[0] : null)
          : chantierData.client || null

        setChantier(chantierData)
        setFormData({
          client_id: chantierData.client_id || '',
          title: chantierData.title || '',
          address: chantierData.address || '',
          status: chantierData.status || 'en_cours',
          trade: chantierData.trade || 'autre',
          start_date: chantierData.start_date ? chantierData.start_date.split('T')[0] : '',
          end_date: chantierData.end_date ? chantierData.end_date.split('T')[0] : '',
          notes: chantierData.notes || '',
        })

        if (client) {
          setClientSearchQuery(`${client.last_name.toUpperCase()} ${client.first_name} – ${client.phone}`)
        }
      } catch (err) {
        console.error('Unexpected error:', err)
        setError('Une erreur inattendue est survenue.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [chantierId])

  // Filtrer les clients selon la recherche
  const filteredClients = clients.filter((client) => {
    if (!clientSearchQuery.trim()) return false
    const query = clientSearchQuery.toLowerCase().trim()
    return (
      client.first_name.toLowerCase().includes(query) ||
      client.last_name.toLowerCase().includes(query) ||
      client.phone.includes(query)
    )
  })

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

    setSaving(true)

    try {
      // 1) Vérifier l'authentification
      const { data: { user }, error: userError } = await supabase.auth.getUser()

      if (userError || !user) {
        setError('Utilisateur non connecté')
        setSaving(false)
        return
      }

      // 2) Charger le profil avec profiles.id = user.id
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('entreprise_id')
        .eq('id', user.id)
        .single()

      if (profileError || !profile || !profile.entreprise_id) {
        setError('Profil utilisateur introuvable')
        setSaving(false)
        return
      }

      // 3) Mettre à jour le chantier
      const { data: updatedChantier, error: updateError } = await supabase
        .from('chantiers')
        .update({
          client_id: formData.client_id,
          title: formData.title.trim(),
          address: formData.address.trim(),
          status: formData.status,
          trade: formData.trade || 'autre',
          start_date: formData.start_date || null,
          end_date: formData.end_date || null,
          notes: formData.notes?.trim() || null,
        })
        .eq('id', chantierId)
        .eq('entreprise_id', profile.entreprise_id)
        .select()
        .single()

      if (updateError || !updatedChantier) {
        console.error('Update error:', updateError)
        setError(updateError?.message || 'Erreur lors de la modification du chantier.')
        setSaving(false)
        return
      }

      // Succès : rediriger vers la page détail avec message de succès
      router.push(`/dashboard/patron/chantiers/${chantierId}?success=${encodeURIComponent('Chantier mis à jour')}`)
    } catch (err) {
      console.error('Update chantier error:', err)
      setError('Une erreur inattendue est survenue.')
      setSaving(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 md:px-6">
      <div className="mb-8">
        <Link href={`/dashboard/patron/chantiers/${chantierId}`} className="text-gray-400 hover:text-white mb-4 inline-block">
          ← Retour au détail
        </Link>
        <h1 className="text-4xl md:text-5xl font-bold text-white">Modifier le chantier</h1>
      </div>

      <div className="bg-[#1a1f3a] rounded-3xl p-6 md:p-8 border border-[#2a2f4a] max-w-2xl">
        {loading ? (
          <div className="text-center py-8">
            <p className="text-gray-400">Chargement...</p>
          </div>
        ) : (
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
              <Button type="submit" variant="primary" size="lg" disabled={saving} className="w-full sm:flex-1 py-4 sm:py-3">
                {saving ? 'Enregistrement...' : 'Enregistrer les modifications'}
              </Button>
              <Link href={`/dashboard/patron/chantiers/${chantierId}`} className="w-full sm:flex-1">
                <Button type="button" variant="secondary" size="lg" className="w-full py-4 sm:py-3">
                  Annuler
                </Button>
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

