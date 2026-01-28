'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Link from 'next/link'

export default function NewClientPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    phone: '',
    address: '',
    email: '',
    notes: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
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

      // 4) Insérer le client avec entreprise_id + champs formulaire
      const { data: client, error: insertError } = await supabase
        .from('clients')
        .insert({
          entreprise_id: profile.entreprise_id,
          first_name: formData.first_name.trim(),
          last_name: formData.last_name.trim(),
          phone: formData.phone.trim(),
          address: formData.address.trim(),
          email: formData.email?.trim() || null,
          notes: formData.notes?.trim() || null,
        })
        .select()
        .single()

      if (insertError || !client) {
        setError(insertError?.message || 'Erreur lors de la création du client.')
        setLoading(false)
        return
      }

      // Succès : rediriger vers la liste
      router.push('/dashboard/patron/clients')
    } catch (err) {
      console.error('Create client error:', err)
      setError('Une erreur inattendue est survenue.')
      setLoading(false)
    }
  }

  return (
    <div>
      <div className="mb-8">
        <Link href="/dashboard/patron/clients" className="text-gray-400 hover:text-white mb-4 inline-block">
          ← Retour à la liste
        </Link>
        <h1 className="text-4xl md:text-5xl font-bold text-white">Ajouter un client</h1>
      </div>

      <div className="bg-[#1a1f3a] rounded-3xl p-6 md:p-8 border border-[#2a2f4a] max-w-2xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-500/20 border border-red-500/50 rounded-2xl p-4">
              <p className="text-red-400">{error}</p>
            </div>
          )}

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

          <div className="flex flex-col sm:flex-row gap-4 pt-4">
            <Button type="submit" variant="primary" size="lg" disabled={loading} className="w-full sm:flex-1 py-4 sm:py-3">
              {loading ? 'Création...' : 'Créer le client'}
            </Button>
            <Link href="/dashboard/patron/clients" className="w-full sm:flex-1">
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

