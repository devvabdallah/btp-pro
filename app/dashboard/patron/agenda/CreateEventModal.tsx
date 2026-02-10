'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { getChantiersForSelect, AgendaEvent } from '@/lib/agenda-actions'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
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
  mode?: 'create' | 'edit'
  event?: AgendaEvent | null
}

export default function CreateEventModal({ isOpen, onClose, onSuccess, mode = 'create', event = null }: CreateEventModalProps) {
  const [loading, setLoading] = useState(false)
  const [loadingChantiers, setLoadingChantiers] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [chantiers, setChantiers] = useState<Chantier[]>([])

  // DB constraint: agenda_events.status_check => only allowed values
  // Normalise le statut de l'UI vers les valeurs DB autorisées
  const normalizeStatus = (input: string | null | undefined): string => {
    if (!input) return 'scheduled'
    const normalized = input.toLowerCase().trim()
    // Mapper les valeurs de l'UI vers les valeurs DB valides
    if (normalized === 'planned' || normalized === 'planifié') return 'scheduled'
    if (normalized === 'confirmed' || normalized === 'confirmé') return 'scheduled' // ou 'confirmed' si autorisé
    if (normalized === 'completed' || normalized === 'terminé' || normalized === 'done') return 'completed'
    if (normalized === 'cancelled' || normalized === 'annulé') return 'cancelled'
    // Valeur par défaut sécurisée
    return 'scheduled'
  }

  const [formData, setFormData] = useState({
    title: '',
    starts_at: '',
    duration_minutes: 60,
    chantier_id: '',
    notes: '',
    status: 'planned' as 'planned' | 'confirmed' | 'completed' | 'cancelled',
  })

  useEffect(() => {
    if (isOpen) {
      loadChantiers()
      
      if (mode === 'edit' && event && event.id) {
        // Pré-remplir avec les données de l'événement
        const startsAt = new Date(event.starts_at)
        const startsAtLocal = new Date(startsAt.getTime() - startsAt.getTimezoneOffset() * 60000)
        const startsAtFormatted = startsAtLocal.toISOString().slice(0, 16)
        
        // Calculer la durée en minutes depuis starts_at et ends_at
        let duration = 60
        if (event.ends_at) {
          const endsAt = new Date(event.ends_at)
          duration = Math.round((endsAt.getTime() - startsAt.getTime()) / (1000 * 60))
        } else if ((event as any).duration_minutes) {
          duration = (event as any).duration_minutes
        }
        
        setFormData({
          title: event.title || '',
          starts_at: startsAtFormatted,
          duration_minutes: duration,
          chantier_id: event.chantier_id || '',
          notes: event.notes || '',
          status: (event.status || 'planned') as 'planned' | 'confirmed' | 'completed' | 'cancelled',
        })
        setError(null)
      } else {
        // Générer la valeur par défaut pour starts_at (maintenant + 1 heure)
        const now = new Date()
        now.setHours(now.getHours() + 1)
        now.setMinutes(0)
        const defaultDateTime = now.toISOString().slice(0, 16)
        setFormData({
          title: '',
          starts_at: defaultDateTime,
          duration_minutes: 60,
          chantier_id: '',
          notes: '',
          status: 'planned',
        })
      }
    } else {
      // Reset form when closing
      setFormData({
        title: '',
        starts_at: '',
        duration_minutes: 60,
        chantier_id: '',
        notes: '',
        status: 'planned',
      })
      setError(null)
    }
  }, [isOpen, mode, event])

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
      const supabase = createSupabaseBrowserClient()

      // Récupérer l'utilisateur
      const { data: { user }, error: userError } = await supabase.auth.getUser()

      if (!user || userError) {
        setError('Session expirée. Reconnectez-vous.')
        setLoading(false)
        return
      }

      // Calculer ends_at
      const startsAt = new Date(formData.starts_at)
      const endsAt = new Date(startsAt.getTime() + formData.duration_minutes * 60 * 1000)

      if (mode === 'edit' && event && event.id) {
        // Mode édition : mettre à jour l'événement
        // DB constraint: normaliser le status avant l'envoi
        const normalizedStatus = normalizeStatus(formData.status)
        const { data: updatedEvent, error: updateError } = await supabase
          .from('agenda_events')
          .update({
            title: formData.title.trim(),
            starts_at: startsAt.toISOString(),
            ends_at: endsAt.toISOString(),
            chantier_id: formData.chantier_id || null,
            notes: formData.notes.trim() || null,
            status: normalizedStatus,
          })
          .eq('id', event.id)
          .select()
          .single()

        if (updateError || !updatedEvent) {
          setError(updateError?.message || 'Erreur lors de la modification de l\'événement.')
          setLoading(false)
          return
        }

        // Succès
        onSuccess()
        onClose()
      } else {
        // Mode création : insérer un nouvel événement
        // Récupérer le profil pour obtenir entreprise_id
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('entreprise_id')
          .eq('id', user.id)
          .single()

        if (profileError || !profile || !profile.entreprise_id) {
          setError('Erreur lors de la récupération du profil.')
          setLoading(false)
          return
        }

        // DB constraint: normaliser le status avant l'envoi
        const normalizedStatus = normalizeStatus(formData.status || 'planned')
        const { data: newEvent, error: insertError } = await supabase
          .from('agenda_events')
          .insert({
            company_id: profile.entreprise_id,
            created_by: user.id,
            title: formData.title.trim(),
            starts_at: startsAt.toISOString(),
            ends_at: endsAt.toISOString(),
            chantier_id: formData.chantier_id || null,
            notes: formData.notes.trim() || null,
            status: normalizedStatus,
          })
          .select()
          .single()

        if (insertError || !newEvent) {
          setError(insertError?.message || 'Erreur lors de la création de l\'événement.')
          setLoading(false)
          return
        }

        // Succès
        onSuccess()
        onClose()
      }
    } catch (err: any) {
      setError(err?.message || 'Une erreur inattendue est survenue.')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!event || !event.id) {
      setError('Impossible de supprimer : événement invalide.')
      return
    }

    const confirmed = window.confirm('Êtes-vous sûr de vouloir supprimer ce rendez-vous ?')
    if (!confirmed) return

    setLoading(true)
    setError(null)

    try {
      const supabase = createSupabaseBrowserClient()

      const { error: deleteError } = await supabase
        .from('agenda_events')
        .delete()
        .eq('id', event.id)

      if (deleteError) {
        setError(deleteError.message || 'Erreur lors de la suppression de l\'événement.')
        setLoading(false)
        return
      }

      // Succès
      onSuccess()
      onClose()
    } catch (err: any) {
      setError(err?.message || 'Une erreur inattendue est survenue.')
    } finally {
      setLoading(false)
    }
  }

  // Gestion de la fermeture avec ESC
  useEffect(() => {
    if (!isOpen) return

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', handleEscape)
    // Empêcher le scroll du body quand le modal est ouvert
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = ''
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  const modalContent = (
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={(e) => {
        // Fermer au clic sur l'overlay (pas sur le contenu)
        if (e.target === e.currentTarget) {
          onClose()
        }
      }}
    >
      <div className="bg-gradient-to-br from-slate-800/95 to-slate-900/95 rounded-2xl border border-white/10 shadow-2xl w-[92vw] max-w-[720px] max-h-[85vh] flex flex-col overflow-hidden">
        <div className="flex-shrink-0 p-6 md:p-8 border-b border-white/10">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl md:text-3xl font-bold text-white">
              {mode === 'edit' ? 'Modifier le rendez-vous' : 'Ajouter un événement'}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors text-2xl leading-none"
              aria-label="Fermer"
            >
              ×
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 md:p-8">
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

            {mode === 'edit' && (
              <>
                {!event || !event.id ? (
                  <div className="bg-yellow-500/20 border border-yellow-500/50 rounded-xl p-4">
                    <p className="text-yellow-400 text-sm">Impossible de modifier : événement invalide.</p>
                  </div>
                ) : (
                  <div>
                    <label className="block mb-3 text-sm font-medium text-gray-300">
                      Statut *
                    </label>
                    <select
                      required
                      className="w-full px-5 py-4 rounded-2xl bg-[#1a1f3a] border border-gray-600 text-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    >
                      <option value="planned">Planifié</option>
                      <option value="confirmed">Confirmé</option>
                      <option value="completed">Terminé</option>
                      <option value="cancelled">Annulé</option>
                    </select>
                  </div>
                )}
              </>
            )}

            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <Button
                type="submit"
                variant="primary"
                size="lg"
                disabled={loading || (mode === 'edit' && (!event || !event.id))}
                className="w-full sm:w-auto"
              >
                {loading 
                  ? (mode === 'edit' ? 'Enregistrement...' : 'Création...') 
                  : (mode === 'edit' ? 'Enregistrer' : 'Créer l\'événement')
                }
              </Button>
              {mode === 'edit' && event && event.id && (
                <Button
                  type="button"
                  variant="secondary"
                  size="lg"
                  onClick={handleDelete}
                  disabled={loading}
                  className="w-full sm:w-auto bg-red-500/20 hover:bg-red-500/30 text-red-300 border-red-500/30"
                >
                  Supprimer
                </Button>
              )}
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

  // Rendre le modal via Portal directement dans le body
  if (typeof window === 'undefined') return null
  return createPortal(modalContent, document.body)
}
