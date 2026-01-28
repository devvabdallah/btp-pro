'use server'

import { createSupabaseServerClient } from './supabase/server'

export interface Client {
  id: string
  entreprise_id: string
  first_name: string
  last_name: string
  phone: string
  address: string
  email: string | null
  notes: string | null
  created_at: string
}

export interface CreateClientData {
  first_name: string
  last_name: string
  phone: string
  address: string
  email?: string
  notes?: string
}

export interface UpdateClientData extends CreateClientData {}

/**
 * Récupère l'entreprise_id de l'utilisateur connecté
 */
async function getUserEntrepriseId(): Promise<{ entrepriseId: string | null; error: string | null }> {
  const supabase = await createSupabaseServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

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
 * Crée un nouveau client
 */
export async function createClient(data: CreateClientData): Promise<{ success: boolean; clientId?: string; error?: string }> {
  try {
    const { entrepriseId, error: entrepriseError } = await getUserEntrepriseId()

    if (entrepriseError || !entrepriseId) {
      return {
        success: false,
        error: entrepriseError || 'Entreprise introuvable.',
      }
    }

    // Validations
    if (!data.first_name || !data.first_name.trim()) {
      return {
        success: false,
        error: 'Le prénom est requis.',
      }
    }

    if (!data.last_name || !data.last_name.trim()) {
      return {
        success: false,
        error: 'Le nom est requis.',
      }
    }

    if (!data.phone || !data.phone.trim()) {
      return {
        success: false,
        error: 'Le téléphone est requis.',
      }
    }

    if (!data.address || !data.address.trim()) {
      return {
        success: false,
        error: 'L\'adresse est requise.',
      }
    }

    const supabase = await createSupabaseServerClient()

    const { data: client, error } = await supabase
      .from('clients')
      .insert({
        entreprise_id: entrepriseId,
        first_name: data.first_name.trim(),
        last_name: data.last_name.trim(),
        phone: data.phone.trim(),
        address: data.address.trim(),
        email: data.email?.trim() || null,
        notes: data.notes?.trim() || null,
      })
      .select()
      .single()

    if (error || !client) {
      return {
        success: false,
        error: 'Erreur lors de la création du client.',
      }
    }

    return {
      success: true,
      clientId: client.id,
    }
  } catch (error) {
    console.error('Create client error:', error)
    return {
      success: false,
      error: 'Une erreur inattendue est survenue.',
    }
  }
}

/**
 * Récupère tous les clients de l'entreprise de l'utilisateur
 */
export async function getClients(): Promise<{ success: boolean; clients?: Client[]; error?: string }> {
  try {
    const { entrepriseId, error: entrepriseError } = await getUserEntrepriseId()

    if (entrepriseError || !entrepriseId) {
      return {
        success: false,
        error: entrepriseError || 'Entreprise introuvable.',
      }
    }

    const supabase = await createSupabaseServerClient()

    const { data: clients, error } = await supabase
      .from('clients')
      .select('*')
      .eq('entreprise_id', entrepriseId)
      .order('last_name', { ascending: true })
      .order('first_name', { ascending: true })

    if (error) {
      return {
        success: false,
        error: 'Erreur lors de la récupération des clients.',
      }
    }

    return {
      success: true,
      clients: clients || [],
    }
  } catch (error) {
    console.error('Get clients error:', error)
    return {
      success: false,
      error: 'Une erreur inattendue est survenue.',
    }
  }
}

/**
 * Récupère un client par son ID
 */
export async function getClientById(clientId: string): Promise<{ success: boolean; client?: Client; error?: string }> {
  try {
    const { entrepriseId, error: entrepriseError } = await getUserEntrepriseId()

    if (entrepriseError || !entrepriseId) {
      return {
        success: false,
        error: entrepriseError || 'Entreprise introuvable.',
      }
    }

    const supabase = await createSupabaseServerClient()

    const { data: client, error } = await supabase
      .from('clients')
      .select('*')
      .eq('id', clientId)
      .eq('entreprise_id', entrepriseId)
      .single()

    if (error || !client) {
      return {
        success: false,
        error: 'Client introuvable.',
      }
    }

    return {
      success: true,
      client,
    }
  } catch (error) {
    console.error('Get client by id error:', error)
    return {
      success: false,
      error: 'Une erreur inattendue est survenue.',
    }
  }
}

/**
 * Met à jour un client
 */
export async function updateClient(
  clientId: string,
  data: UpdateClientData
): Promise<{ success: boolean; error?: string }> {
  try {
    const { entrepriseId, error: entrepriseError } = await getUserEntrepriseId()

    if (entrepriseError || !entrepriseId) {
      return {
        success: false,
        error: entrepriseError || 'Entreprise introuvable.',
      }
    }

    // Validations
    if (!data.first_name || !data.first_name.trim()) {
      return {
        success: false,
        error: 'Le prénom est requis.',
      }
    }

    if (!data.last_name || !data.last_name.trim()) {
      return {
        success: false,
        error: 'Le nom est requis.',
      }
    }

    if (!data.phone || !data.phone.trim()) {
      return {
        success: false,
        error: 'Le téléphone est requis.',
      }
    }

    if (!data.address || !data.address.trim()) {
      return {
        success: false,
        error: 'L\'adresse est requise.',
      }
    }

    const supabase = await createSupabaseServerClient()

    const { error } = await supabase
      .from('clients')
      .update({
        first_name: data.first_name.trim(),
        last_name: data.last_name.trim(),
        phone: data.phone.trim(),
        address: data.address.trim(),
        email: data.email?.trim() || null,
        notes: data.notes?.trim() || null,
      })
      .eq('id', clientId)
      .eq('entreprise_id', entrepriseId)

    if (error) {
      return {
        success: false,
        error: 'Erreur lors de la mise à jour du client.',
      }
    }

    return {
      success: true,
    }
  } catch (error) {
    console.error('Update client error:', error)
    return {
      success: false,
      error: 'Une erreur inattendue est survenue.',
    }
  }
}

/**
 * Supprime un client
 */
export async function deleteClient(clientId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { entrepriseId, error: entrepriseError } = await getUserEntrepriseId()

    if (entrepriseError || !entrepriseId) {
      return {
        success: false,
        error: entrepriseError || 'Entreprise introuvable.',
      }
    }

    const supabase = await createSupabaseServerClient()

    const { error } = await supabase
      .from('clients')
      .delete()
      .eq('id', clientId)
      .eq('entreprise_id', entrepriseId)

    if (error) {
      return {
        success: false,
        error: 'Erreur lors de la suppression du client.',
      }
    }

    return {
      success: true,
    }
  } catch (error) {
    console.error('Delete client error:', error)
    return {
      success: false,
      error: 'Une erreur inattendue est survenue.',
    }
  }
}

