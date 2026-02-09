'use server'

import { createSupabaseServerClient } from './supabase/server'

export type AgendaEventStatus = 'planned' | 'confirmed' | 'completed' | 'cancelled'

export interface AgendaEvent {
  id: string
  company_id: string
  created_by: string
  title: string
  starts_at: string
  ends_at: string
  chantier_id: string | null
  client_id: string | null
  notes: string | null
  status: AgendaEventStatus
  created_at: string
  updated_at: string
  chantiers?: {
    id: string
    title: string
  } | null
}

export interface CreateAgendaEventData {
  title: string
  starts_at: string
  duration_minutes: number
  chantier_id?: string | null
  notes?: string | null
}

/**
 * Récupère l'entreprise_id de l'utilisateur connecté
 */
async function getUserEntrepriseId(): Promise<{ entrepriseId: string | null; error: string | null }> {
  const supabase = await createSupabaseServerClient()

  // getUser() rafraîchit automatiquement le token si nécessaire
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError) {
    console.error('[Agenda] getUser error:', userError)
    return {
      entrepriseId: null,
      error: 'Erreur de session',
    }
  }

  if (!user) {
    return {
      entrepriseId: null,
      error: 'Utilisateur non connecté',
    }
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('entreprise_id')
    .eq('id', user.id)
    .single()

  if (profileError || !profile) {
    return {
      entrepriseId: null,
      error: 'Profil utilisateur introuvable',
    }
  }

  if (!profile.entreprise_id) {
    return {
      entrepriseId: null,
      error: 'Entreprise non liée au profil',
    }
  }

  return {
    entrepriseId: profile.entreprise_id,
    error: null,
  }
}

/**
 * Récupère les événements de l'agenda pour les 7 prochains jours
 */
export async function getAgendaEvents(): Promise<{ success: boolean; events?: AgendaEvent[]; error?: string }> {
  try {
    const { entrepriseId, error: entrepriseError } = await getUserEntrepriseId()

    if (entrepriseError || !entrepriseId) {
      return {
        success: false,
        error: entrepriseError || 'Entreprise introuvable.',
      }
    }

    const supabase = await createSupabaseServerClient()
    const now = new Date()
    const in7Days = new Date()
    in7Days.setDate(in7Days.getDate() + 7)

    const { data: events, error } = await supabase
      .from('agenda_events')
      .select(`
        *,
        chantiers(id, title)
      `)
      .eq('company_id', entrepriseId)
      .gte('starts_at', now.toISOString())
      .lte('starts_at', in7Days.toISOString())
      .order('starts_at', { ascending: true })

    if (error) {
      return {
        success: false,
        error: 'Erreur lors du chargement des événements.',
      }
    }

    return {
      success: true,
      events: events || [],
    }
  } catch (error) {
    console.error('Get agenda events error:', error)
    return {
      success: false,
      error: 'Une erreur inattendue est survenue.',
    }
  }
}

/**
 * Crée un nouvel événement dans l'agenda
 */
export async function createAgendaEvent(data: CreateAgendaEventData): Promise<{ success: boolean; eventId?: string; error?: string }> {
  try {
    const { entrepriseId, error: entrepriseError } = await getUserEntrepriseId()

    if (entrepriseError || !entrepriseId) {
      return {
        success: false,
        error: entrepriseError || 'Entreprise introuvable.',
      }
    }

    const supabase = await createSupabaseServerClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return {
        success: false,
        error: 'Utilisateur non connecté.',
      }
    }

    // Validations
    if (!data.title || !data.title.trim()) {
      return {
        success: false,
        error: 'Le titre est requis.',
      }
    }

    if (!data.starts_at) {
      return {
        success: false,
        error: 'La date de début est requise.',
      }
    }

    if (!data.duration_minutes || data.duration_minutes <= 0) {
      return {
        success: false,
        error: 'La durée doit être supérieure à 0.',
      }
    }

    // Calculer ends_at
    const startsAt = new Date(data.starts_at)
    const endsAt = new Date(startsAt.getTime() + data.duration_minutes * 60 * 1000)

    const { data: event, error } = await supabase
      .from('agenda_events')
      .insert({
        company_id: entrepriseId,
        created_by: user.id,
        title: data.title.trim(),
        starts_at: startsAt.toISOString(),
        ends_at: endsAt.toISOString(),
        chantier_id: data.chantier_id || null,
        notes: data.notes?.trim() || null,
        status: 'planned',
      })
      .select()
      .single()

    if (error || !event) {
      return {
        success: false,
        error: 'Erreur lors de la création de l\'événement.',
      }
    }

    return {
      success: true,
      eventId: event.id,
    }
  } catch (error) {
    console.error('Create agenda event error:', error)
    return {
      success: false,
      error: 'Une erreur inattendue est survenue.',
    }
  }
}

/**
 * Récupère les chantiers de l'entreprise pour le select
 */
export async function getChantiersForSelect(): Promise<{ success: boolean; chantiers?: Array<{ id: string; title: string }>; error?: string }> {
  try {
    const { entrepriseId, error: entrepriseError } = await getUserEntrepriseId()

    if (entrepriseError || !entrepriseId) {
      return {
        success: false,
        error: entrepriseError || 'Entreprise introuvable.',
      }
    }

    const supabase = await createSupabaseServerClient()

    const { data: chantiers, error } = await supabase
      .from('chantiers')
      .select('id, title')
      .eq('entreprise_id', entrepriseId)
      .order('title', { ascending: true })

    if (error) {
      return {
        success: false,
        error: 'Erreur lors du chargement des chantiers.',
      }
    }

    return {
      success: true,
      chantiers: chantiers || [],
    }
  } catch (error) {
    console.error('Get chantiers error:', error)
    return {
      success: false,
      error: 'Une erreur inattendue est survenue.',
    }
  }
}
