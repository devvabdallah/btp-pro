'use client'

import { useState, useEffect } from 'react'
import { createAgendaEvent, getChantiersForSelect } from '@/lib/agenda-actions'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'

interface Chantier {
  id: string
  title: string
}

interface CreateEventModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export default function CreateEventModal({ isOpen, onClose, onSuccess }: CreateEventModalProps) {
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
    if (isOpen) {
      loadChantiers()
      // Générer la valeur par défaut pour starts_at (maintenant + 1 heure)
      const now = new Date()
      now.setHours(now.getHours() + 1)
      now.setMinutes(0)
      const defaultDateTime = now.toISOString().slice(0, 16)
      setFormData((prev) => ({ ...prev, starts_at: prev.starts_at || defaultDateTime }))
    } else {
      // Reset form when closing
      setFormData({
        title: '',
        starts_at: '',
        duration_minutes: 60,
        chantier_id: '',
        notes: '',
      })
      setError(null)
    }
  }, [isOpen])

  async function loadChantiers() {
    setLoadingChantiers(true)
    const result = await getChantiersForSelect()
    if (result.success && result.chantiers) {
      setChantiers(result.chantiers)
    }
    setLoadingChantiers(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!formData.title.trim()) {
      setError('Le titre est requis.')
      return
    }

    if (!formData.starts_at) {
      setError('La date et heure de début sont requises.')
      return
    }

    setLoading(true)

    try {
      const result = await createAgendaEvent({
        title: formData.title.trim(),
        starts_at: formData.starts_at,
        duration_minutes: formData.duration_minutes,
        chantier_id: formData.chantier_id || null,
        notes: formData.notes.trim() || null,
      })

      if (result.success) {
        onSuccess()
        onClose()
      } else {
        setError(result.error || 'Erreur lors de la création de l\'événement.')
      }
    } catch (err) {
      setError('Une erreur inattendue est survenue.')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-gradient-to-br from-slate-800/95 to-slate-900/95 rounded-2xl border border-white/10 shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 md:p-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl md:text-3xl font-bold text-white">Ajouter un événement</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors text-2xl leading-none"
              aria-label="Fermer"
            >
              ×
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-500/20 border border-red-500/50 rounded-xl p-4">
                <p className="text-red-400 text-sm">{error}</p>
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
                  className="w-full px-5 py-4 rounded-2xl bg-[#1a1f3a] border border-gray-600 text-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
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
                  className="w-full px-5 py-4 rounded-2xl bg-[#1a1f3a] border border-gray-600 text-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                  value={formData.duration_minutes}
                  onChange={(e) => setFormData({ ...formData, duration_minutes: parseInt(e.target.value) })}
                >
                  <option value={30}>30 minutes</option>
                  <option value={60}>1 heure</option>
                  <option value={90}>1h30</option>
                  <option value={120}>2 heures</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block mb-3 text-sm font-medium text-gray-300">
                Chantier (optionnel)
              </label>
              <select
                className="w-full px-5 py-4 rounded-2xl bg-[#1a1f3a] border border-gray-600 text-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
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
                className="w-full px-5 py-4 rounded-2xl bg-[#1a1f3a] border border-gray-600 text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all resize-none"
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
              <Button
                type="button"
                variant="secondary"
                size="lg"
                onClick={onClose}
                className="w-full sm:w-auto"
              >
                Annuler
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
