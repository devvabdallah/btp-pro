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
    <div className="space-y-10 md:space-y-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6 md:gap-8">
        <div className="flex-1">
          <h1 className="text-[28px] md:text-4xl font-semibold text-white/95 mb-3.5 tracking-[-0.02em] leading-[1.15]">
            Ajouter un client
          </h1>
          <p className="text-sm md:text-[15px] text-gray-400/80 leading-relaxed font-normal">
            Remplissez les informations pour créer un nouveau client
          </p>
        </div>
      </div>

      <div className="max-w-2xl">
        <div className="bg-white/[0.02] backdrop-blur-sm rounded-xl p-6 md:p-8 border border-white/[0.06] shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-500/20 border border-red-500/50 rounded-xl p-4 backdrop-blur-sm">
                <p className="text-red-400/95 text-sm">{error}</p>
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
              <label className="block text-sm font-medium text-gray-300/90 mb-2">
                Notes
              </label>
              <textarea
                className="w-full px-4 py-3 bg-white/[0.03] border border-white/[0.08] rounded-xl text-white/95 placeholder-gray-500/70 focus:outline-none focus:ring-2 focus:ring-yellow-500/50 focus:border-yellow-500/30 transition-all min-h-[120px] text-sm md:text-base resize-none"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Notes additionnelles sur le client..."
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <Button type="submit" variant="primary" size="lg" disabled={loading} className="w-full sm:flex-1 min-h-[48px]">
                {loading ? 'Création...' : 'Créer le client'}
              </Button>
              <Link href="/dashboard/patron/clients" className="w-full sm:flex-1">
                <Button type="button" variant="secondary" size="lg" className="w-full min-h-[48px]">
                  Annuler
                </Button>
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

