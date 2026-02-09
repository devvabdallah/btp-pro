'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createAgendaEvent, getChantiersForSelect } from '@/lib/agenda-actions'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Link from 'next/link'

interface Chantier {
  id: string
  title: string
}

export default function NewAgendaEventPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [loadingChantiers, setLoadingChantiers] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [chantiers, setChantiers] = useState<Chantier[]>([])

  const [formData, setFormData] = useState({
    title: '',
    starts_at: '',
    duration_minutes: 60,
    chantier_id: '',
    notes: '',
  })

  useEffect(() => {
    async function loadChantiers() {
      setLoadingChantiers(true)
      const result = await getChantiersForSelect()
      if (result.success && result.chantiers) {
        setChantiers(result.chantiers)
      }
      setLoadingChantiers(false)
    }
    loadChantiers()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const result = await createAgendaEvent({
        title: formData.title,
        starts_at: formData.starts_at,
        duration_minutes: formData.duration_minutes,
        chantier_id: formData.chantier_id || null,
        notes: formData.notes || null,
      })

      if (result.success) {
        router.push('/dashboard/patron/agenda')
      } else {
        setError(result.error || 'Erreur lors de la création de l\'événement.')
        setLoading(false)
      }
    } catch (err) {
      console.error('Create event error:', err)
      setError('Une erreur inattendue est survenue.')
      setLoading(false)
    }
  }

  // Générer la valeur par défaut pour starts_at (maintenant + 1 heure)
  useEffect(() => {
    const now = new Date()
    now.setHours(now.getHours() + 1)
    now.setMinutes(0)
    const defaultDateTime = now.toISOString().slice(0, 16)
    setFormData((prev) => ({ ...prev, starts_at: prev.starts_at || defaultDateTime }))
  }, [])

  return (
    <div className="space-y-10 md:space-y-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6 md:gap-8">
        <div className="flex-1">
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight text-white mb-4 md:mb-6">
            Ajouter un événement
          </h1>
          <p className="text-base md:text-lg text-white/70 leading-relaxed">
            Créez un nouvel événement dans l'agenda
          </p>
        </div>
      </div>

      <div className="max-w-2xl">
        <div className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 rounded-xl p-6 md:p-8 border border-white/10 shadow-xl shadow-black/30 backdrop-blur-sm">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-500/20 border border-red-500/50 rounded-xl p-4 backdrop-blur-sm">
                <p className="text-red-400/95 text-sm">{error}</p>
              </div>
            )}

            <Input
              label="Titre *"
              type="text"
              required
              variant="dark"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Ex: Réunion client, Visite chantier..."
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block mb-3 text-sm font-medium text-gray-300">
                  Date et heure de début *
                </label>
                <input
                  type="datetime-local"
                  required
                  className="w-full px-5 py-4 rounded-2xl bg-[#1a1f3a] border border-gray-600 text-gray-200 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent transition-all"
                  value={formData.starts_at}
                  onChange={(e) => setFormData({ ...formData, starts_at: e.target.value })}
                />
              </div>

              <div>
                <label className="block mb-3 text-sm font-medium text-gray-300">
                  Durée (minutes) *
                </label>
                <select
                  required
                  className="w-full px-5 py-4 rounded-2xl bg-[#1a1f3a] border border-gray-600 text-gray-200 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent transition-all"
                  value={formData.duration_minutes}
                  onChange={(e) => setFormData({ ...formData, duration_minutes: parseInt(e.target.value) })}
                >
                  <option value={30}>30 minutes</option>
                  <option value={60}>1 heure</option>
                  <option value={90}>1h30</option>
                  <option value={120}>2 heures</option>
                  <option value={180}>3 heures</option>
                  <option value={240}>4 heures</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block mb-3 text-sm font-medium text-gray-300">
                Chantier (optionnel)
              </label>
              <select
                className="w-full px-5 py-4 rounded-2xl bg-[#1a1f3a] border border-gray-600 text-gray-200 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent transition-all"
                value={formData.chantier_id}
                onChange={(e) => setFormData({ ...formData, chantier_id: e.target.value })}
                disabled={loadingChantiers}
              >
                <option value="">Aucun chantier</option>
                {chantiers.map((chantier) => (
                  <option key={chantier.id} value={chantier.id}>
                    {chantier.title}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block mb-3 text-sm font-medium text-gray-300">
                Notes (optionnel)
              </label>
              <textarea
                className="w-full px-5 py-4 rounded-2xl bg-[#1a1f3a] border border-gray-600 text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent transition-all resize-none"
                rows={4}
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Ajoutez des notes ou détails sur l'événement..."
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <Button
                type="submit"
                variant="primary"
                size="lg"
                disabled={loading}
                className="w-full sm:w-auto"
              >
                {loading ? 'Création...' : 'Créer l\'événement'}
              </Button>
              <Link href="/dashboard/patron/agenda" className="w-full sm:w-auto">
                <Button
                  type="button"
                  variant="secondary"
                  size="lg"
                  className="w-full sm:w-auto"
                >
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
