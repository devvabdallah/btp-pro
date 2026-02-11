// Types et constantes pour les statuts Agenda
// DB constraint: agenda_events.status_check => only these values allowed

export type AgendaStatus = 'planned' | 'confirmed' | 'in_progress' | 'done' | 'cancelled'

export const AGENDA_STATUSES: AgendaStatus[] = ['planned', 'confirmed', 'in_progress', 'done', 'cancelled']

export const AGENDA_STATUS_OPTIONS = [
  { value: 'planned', label: 'Planifié' },
  { value: 'confirmed', label: 'Confirmé' },
  { value: 'in_progress', label: 'En cours' },
  { value: 'done', label: 'Terminé' },
  { value: 'cancelled', label: 'Annulé' },
] as const

export const DEFAULT_AGENDA_STATUS: AgendaStatus = 'planned'

/**
 * Normalise un statut vers une valeur DB valide
 * @param input - Statut à normaliser (peut être string, null, undefined, etc.)
 * @returns AgendaStatus - Valeur DB valide
 */
export function normalizeAgendaStatus(input: unknown): AgendaStatus {
  if (!input) return DEFAULT_AGENDA_STATUS
  
  const str = String(input).toLowerCase().trim()
  
  // Si déjà une valeur valide, la retourner
  if (AGENDA_STATUSES.includes(str as AgendaStatus)) {
    return str as AgendaStatus
  }
  
  // Mapping des valeurs obsolètes ou alternatives
  if (str === 'scheduled' || str === 'planifie' || str === 'planifié' || str === 'planned') return 'planned'
  if (str === 'confirme' || str === 'confirmé' || str === 'confirmed') return 'confirmed'
  if (str === 'in progress' || str === 'in-progress' || str === 'en_cours' || str === 'en cours') return 'in_progress'
  if (str === 'done' || str === 'termine' || str === 'terminé') return 'done'
  if (str === 'cancelled' || str === 'canceled' || str === 'annule' || str === 'annulé') return 'cancelled'
  
  // Valeur par défaut sécurisée
  return DEFAULT_AGENDA_STATUS
}

/**
 * Obtient le label français d'un statut
 * @param status - Statut DB (AgendaStatus)
 * @returns Label français pour l'affichage UI
 */
export function getAgendaStatusLabel(status: AgendaStatus): string {
  const labels: Record<AgendaStatus, string> = {
    planned: 'Planifié',
    confirmed: 'Confirmé',
    in_progress: 'En cours',
    done: 'Terminé',
    cancelled: 'Annulé',
  }
  return labels[status] || 'Planifié'
}
