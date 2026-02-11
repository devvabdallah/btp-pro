'use server'

import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

// DB constraint: agenda_events.status_check => only these values allowed
export type AgendaEventStatus = 'planned' | 'confirmed' | 'in_progress' | 'done' | 'cancelled'

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
    address: string | null
    client: {
      id: string
      first_name: string
      last_name: string
    } | null
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
 * Crée un client Supabase serveur basé sur les cookies Next.js
 */
async function createSupabaseClient() {
  const cookieStore = await cookies()
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Variables d\'environnement Supabase manquantes')
  }

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet: Array<{ name: string; value: string; options?: any }>) {
        cookiesToSet.forEach(({ name, value, options }) => {
          cookieStore.set(name, value, options)
        })
      },
    },
  })
}

/**
 * Récupère l'entreprise_id de l'utilisateur connecté
 */
async function getUserEntrepriseId(): Promise<{ entrepriseId: string | null; error: string | null }> {
  try {
    const supabase = await createSupabaseClient()

    // getUser() rafraîchit automatiquement le token si nécessaire
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError) {
      console.error('[Agenda] getUser error:', userError)
      return {
        entrepriseId: null,
        error: 'Session expirée. Reconnectez-vous.',
      }
    }

    if (!user) {
      return {
        entrepriseId: null,
        error: 'Session expirée. Reconnectez-vous.',
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
  } catch (error) {
    console.error('[Agenda] getUserEntrepriseId error:', error)
    return {
      entrepriseId: null,
      error: 'Session expirée. Reconnectez-vous.',
    }
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

    const supabase = await createSupabaseClient()
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const { data: events, error } = await supabase
      .from('agenda_events')
      .select(`
        *,
        chantiers(id, title, address, client:clients(id, first_name, last_name))
      `)
      .eq('company_id', entrepriseId)
      .gte('starts_at', today.toISOString())
      .order('starts_at', { ascending: true })
      .limit(50)

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

    const supabase = await createSupabaseClient()

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (!user || userError) {
      return {
        success: false,
        error: 'Session expirée. Reconnectez-vous.',
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

    const supabase = await createSupabaseClient()

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
