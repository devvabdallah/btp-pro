// Types et constantes pour les statuts Agenda
// DB constraint: agenda_events.status_check => only these values allowed

export type AgendaStatus = 'planned' | 'confirmed' | 'in_progress' | 'done' | 'cancelled'

export const AGENDA_STATUS_OPTIONS = [
  { value: 'planned', label: 'Planifié' },
  { value: 'confirmed', label: 'Confirmé' },
  { value: 'in_progress', label: 'En cours' },
  { value: 'done', label: 'Terminé' },
  { value: 'cancelled', label: 'Annulé' },
] as const

/**
 * Normalise un statut vers une valeur DB valide
 * @param input - Statut à normaliser (peut être string, null, undefined, etc.)
 * @returns AgendaStatus - Valeur DB valide
 */
export function normalizeAgendaStatus(input: unknown): AgendaStatus {
  if (!input) return 'planned'
  
  const str = String(input).toLowerCase().trim()
  
  // Si déjà une valeur valide, la retourner
  if (['planned', 'confirmed', 'in_progress', 'done', 'cancelled'].includes(str)) {
    return str as AgendaStatus
  }
  
  // Mapping des valeurs obsolètes ou alternatives
  if (str === 'scheduled' || str === 'planifié' || str === 'planifie') return 'planned'
  if (str === 'confirmé' || str === 'confirme') return 'confirmed'
  if (str === 'en cours' || str === 'en_cours' || str === 'in-progress') return 'in_progress'
  if (str === 'terminé' || str === 'termine' || str === 'completed') return 'done'
  if (str === 'annulé' || str === 'annule' || str === 'canceled') return 'cancelled'
  
  // Valeur par défaut sécurisée
  return 'planned'
}

/**
 * Obtient le label français d'un statut
 * @param status - Statut DB (AgendaStatus)
 * @returns Label français pour l'affichage UI
 */
export function getAgendaStatusLabel(status: AgendaStatus | string | null | undefined): string {
  const normalized = normalizeAgendaStatus(status)
  const option = AGENDA_STATUS_OPTIONS.find(opt => opt.value === normalized)
  return option?.label || 'Planifié'
}
