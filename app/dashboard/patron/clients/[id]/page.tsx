'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { Client } from '@/lib/clients-actions'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Link from 'next/link'

export default function ClientDetailPage() {
  const router = useRouter()
  const params = useParams()
  const clientId = params.id as string

  const [client, setClient] = useState<Client | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    phone: '',
    address: '',
    email: '',
    notes: '',
  })

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

        // 3) Charger le client par son id avec filtre entreprise_id
        const { data: clientData, error: clientError } = await supabase
          .from('clients')
          .select('*')
          .eq('id', clientId)
          .eq('entreprise_id', profile.entreprise_id)
          .single()

        if (clientError || !clientData) {
          setError('Client introuvable.')
          setLoading(false)
          return
        }

        setClient(clientData)
        setFormData({
          first_name: clientData.first_name,
          last_name: clientData.last_name,
          phone: clientData.phone,
          address: clientData.address,
          email: clientData.email || '',
          notes: clientData.notes || '',
        })
      } catch (err) {
        console.error('Unexpected error:', err)
        setError('Une erreur inattendue est survenue.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [clientId])

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSaving(true)

    try {
      // 1) Vérifier l'authentification (check user pour éviter état stale)
      const { data: { user }, error: userError } = await supabase.auth.getUser()

      if (userError || !user) {
        setError('Session expirée. Veuillez vous reconnecter.')
        setSaving(false)
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
        setSaving(false)
        return
      }

      if (!profile.entreprise_id) {
        setError('Entreprise non liée au profil.')
        setSaving(false)
        return
      }

      // 3) Validations
      if (!formData.first_name || !formData.first_name.trim()) {
        setError('Le prénom est requis.')
        setSaving(false)
        return
      }

      if (!formData.last_name || !formData.last_name.trim()) {
        setError('Le nom est requis.')
        setSaving(false)
        return
      }

      if (!formData.phone || !formData.phone.trim()) {
        setError('Le téléphone est requis.')
        setSaving(false)
        return
      }

      if (!formData.address || !formData.address.trim()) {
        setError('L\'adresse est requise.')
        setSaving(false)
        return
      }

      // 4) Update le client
      const { error: updateError } = await supabase
        .from('clients')
        .update({
          first_name: formData.first_name.trim(),
          last_name: formData.last_name.trim(),
          phone: formData.phone.trim(),
          address: formData.address.trim(),
          email: formData.email?.trim() || null,
          notes: formData.notes?.trim() || null,
        })
        .eq('id', clientId)
        .eq('entreprise_id', profile.entreprise_id)

      if (updateError) {
        console.error('Error updating client:', updateError)
        setError(updateError.message || 'Erreur lors de la mise à jour.')
        setSaving(false)
        return
      }

      // 5) Recharger les données après succès
      const { data: clientData, error: reloadError } = await supabase
        .from('clients')
        .select('*')
        .eq('id', clientId)
        .eq('entreprise_id', profile.entreprise_id)
        .single()

      if (reloadError || !clientData) {
        setError('Erreur lors du rechargement des données.')
        setSaving(false)
        return
      }

      setClient(clientData)
      setFormData({
        first_name: clientData.first_name,
        last_name: clientData.last_name,
        phone: clientData.phone,
        address: clientData.address,
        email: clientData.email || '',
        notes: clientData.notes || '',
      })
      setEditing(false)
    } catch (err) {
      console.error('Unexpected error:', err)
      setError('Une erreur inattendue est survenue.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    setError(null)
    setDeleting(true)

    try {
      // 1) Vérifier l'authentification (check user au moment du clic)
      const { data: { user }, error: userError } = await supabase.auth.getUser()

      if (userError || !user) {
        setError('Session expirée. Veuillez vous reconnecter.')
        setDeleting(false)
        setShowDeleteConfirm(false)
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
        setDeleting(false)
        setShowDeleteConfirm(false)
        return
      }

      if (!profile.entreprise_id) {
        setError('Entreprise non liée au profil.')
        setDeleting(false)
        setShowDeleteConfirm(false)
        return
      }

      // 3) Supprimer le client avec filtre entreprise_id
      const { error: deleteError } = await supabase
        .from('clients')
        .delete()
        .eq('id', clientId)
        .eq('entreprise_id', profile.entreprise_id)

      if (deleteError) {
        console.error('Error deleting client:', deleteError)
        setError(deleteError.message || 'Erreur lors de la suppression.')
        setDeleting(false)
        setShowDeleteConfirm(false)
        return
      }

      // 4) Redirection vers la liste après succès
      router.push('/dashboard/patron/clients')
    } catch (err) {
      console.error('Unexpected error:', err)
      setError('Une erreur inattendue est survenue.')
      setDeleting(false)
      setShowDeleteConfirm(false)
    }
  }

  if (loading) {
    return (
      <div className="bg-[#1a1f3a] rounded-3xl p-6 border border-[#2a2f4a]">
        <p className="text-gray-400 text-center py-8">Chargement...</p>
      </div>
    )
  }

  if (!client) {
    return (
      <div>
        <Link href="/dashboard/patron/clients" className="text-gray-400 hover:text-white mb-4 inline-block">
          ← Retour à la liste
        </Link>
        <div className="bg-[#1a1f3a] rounded-3xl p-6 border border-[#2a2f4a]">
          <p className="text-red-400 text-center py-8">{error || 'Client introuvable.'}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6 md:mb-8">
        <Link href="/dashboard/patron/clients" className="text-gray-400 hover:text-white mb-4 inline-block">
          ← Retour à la liste
        </Link>
        <h1 className="text-4xl md:text-5xl font-bold text-white">
          {editing ? 'Modifier le client' : `${client.last_name.toUpperCase()} ${client.first_name}`}
        </h1>
      </div>

      <div className="bg-[#1a1f3a] rounded-3xl p-6 md:p-8 border border-[#2a2f4a]">
        {error && !showDeleteConfirm && (
          <div className="bg-red-500/20 border border-red-500/50 rounded-2xl p-5 mb-6">
            <p className="text-red-400 text-base md:text-lg">{error}</p>
          </div>
        )}

        {showDeleteConfirm ? (
          <div className="space-y-6">
            <div className="bg-red-500/20 border border-red-500/50 rounded-2xl p-6 md:p-8">
              <h3 className="text-xl md:text-2xl font-bold text-white mb-3 md:mb-4">Confirmer la suppression</h3>
              <p className="text-gray-300 text-base md:text-lg mb-5 md:mb-6 leading-relaxed">
                Êtes-vous sûr de vouloir supprimer le client <strong className="text-white">{client.last_name} {client.first_name}</strong> ?
                Cette action est irréversible.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Button
                  variant="primary"
                  size="lg"
                  onClick={handleDelete}
                  disabled={deleting}
                  className="w-full sm:flex-1 py-5 sm:py-4 text-base md:text-lg min-h-[52px] md:min-h-[56px] bg-red-600 hover:bg-red-700"
                >
                  {deleting ? 'Suppression...' : 'Oui, supprimer'}
                </Button>
                <Button
                  variant="secondary"
                  size="lg"
                  onClick={() => {
                    setShowDeleteConfirm(false)
                    setError(null)
                  }}
                  disabled={deleting}
                  className="w-full sm:flex-1 py-5 sm:py-4 text-base md:text-lg min-h-[52px] md:min-h-[56px]"
                >
                  Annuler
                </Button>
              </div>
            </div>
          </div>
        ) : editing ? (
          <form onSubmit={handleUpdate} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input
                label="Prénom *"
                type="text"
                required
                autoComplete="given-name"
                value={formData.first_name}
                onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
              />
              <Input
                label="Nom *"
                type="text"
                required
                autoComplete="family-name"
                value={formData.last_name}
                onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
              />
            </div>

            <Input
              label="Téléphone *"
              type="tel"
              required
              autoComplete="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            />

            <Input
              label="Adresse *"
              type="text"
              required
              autoComplete="street-address"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            />

            <Input
              label="Email"
              type="email"
              autoComplete="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />

            <div className="w-full">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Notes
              </label>
              <textarea
                className="w-full px-4 py-3 bg-[#1a1f3a] border border-gray-600 rounded-2xl text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent transition-all min-h-[120px]"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Notes additionnelles sur le client..."
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-4 pt-5 md:pt-6">
              <Button type="submit" variant="primary" size="lg" disabled={saving} className="w-full sm:flex-1 py-5 sm:py-4 text-base md:text-lg min-h-[52px] md:min-h-[56px]">
                {saving ? 'Enregistrement...' : 'Enregistrer'}
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="lg"
                onClick={() => {
                  setEditing(false)
                  setError(null)
                  // Restaurer les valeurs originales
                  setFormData({
                    first_name: client.first_name,
                    last_name: client.last_name,
                    phone: client.phone,
                    address: client.address,
                    email: client.email || '',
                    notes: client.notes || '',
                  })
                }}
                className="w-full sm:flex-1 py-5 sm:py-4 text-base md:text-lg min-h-[52px] md:min-h-[56px]"
              >
                Annuler
              </Button>
            </div>
          </form>
        ) : (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-white mb-5 md:mb-6">Informations</h2>
              <div className="space-y-5 md:space-y-6">
                <div>
                  <p className="text-gray-400 text-xs md:text-sm mb-2">Prénom</p>
                  <p className="text-white text-xl md:text-2xl font-medium leading-relaxed">{client.first_name}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-xs md:text-sm mb-2">Nom</p>
                  <p className="text-white text-xl md:text-2xl font-medium leading-relaxed">{client.last_name}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-xs md:text-sm mb-2">Téléphone</p>
                  <p className="text-white text-xl md:text-2xl font-medium leading-relaxed">{client.phone}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-xs md:text-sm mb-2">Adresse</p>
                  <p className="text-white text-xl md:text-2xl font-medium leading-relaxed line-clamp-2 md:line-clamp-none">{client.address}</p>
                </div>
                {client.email && (
                  <div>
                    <p className="text-gray-400 text-xs md:text-sm mb-2">Email</p>
                    <p className="text-white text-xl md:text-2xl font-medium leading-relaxed break-all">{client.email}</p>
                  </div>
                )}
                {client.notes && (
                  <div>
                    <p className="text-gray-400 text-xs md:text-sm mb-2">Notes</p>
                    <p className="text-white text-xl md:text-2xl font-medium leading-relaxed whitespace-pre-wrap">{client.notes}</p>
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 pt-5 md:pt-6 border-t border-[#2a2f4a]">
              <Button variant="primary" size="lg" onClick={() => setEditing(true)} className="w-full sm:flex-1 py-5 sm:py-4 text-base md:text-lg min-h-[52px] md:min-h-[56px]">
                Modifier
              </Button>
              <Button
                variant="secondary"
                size="lg"
                onClick={() => setShowDeleteConfirm(true)}
                className="w-full sm:flex-1 py-5 sm:py-4 text-base md:text-lg min-h-[52px] md:min-h-[56px] bg-red-600/20 border-red-600/50 text-red-400 hover:bg-red-600/30"
              >
                Supprimer
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

