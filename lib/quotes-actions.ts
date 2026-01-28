'use server'

import { createSupabaseServerClient } from './supabase/server'
import { redirect } from 'next/navigation'

export type QuoteStatus = 'brouillon' | 'envoye' | 'accepte' | 'refuse'

export interface Quote {
  id: string
  entreprise_id: string
  title: string
  client: string
  contact: string | null
  description: string | null
  amount_ht: number
  status: QuoteStatus
  created_at: string
  updated_at: string
}

export interface CreateQuoteData {
  title: string
  client: string
  contact?: string
  description?: string
  amount_ht: number
  status?: QuoteStatus
}

export interface QuoteStats {
  total: number
  brouillon: number
  envoye: number
  accepte: number
  refuse: number
}

/**
 * Récupère l'entreprise_id de l'utilisateur connecté
 */
async function getUserEntrepriseId(): Promise<string | null> {
  const supabase = await createSupabaseServerClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return null
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('entreprise_id')
    .eq('id', user.id)
    .single()

  if (profileError || !profile) {
    return null
  }

  return profile.entreprise_id || null
}

/**
 * Crée un nouveau devis
 */
export async function createQuote(data: CreateQuoteData): Promise<{ success: boolean; quoteId?: string; error?: string }> {
  try {
    const entrepriseId = await getUserEntrepriseId()

    if (!entrepriseId) {
      return {
        success: false,
        error: 'Entreprise introuvable.',
      }
    }

    // Validations
    if (!data.title || !data.title.trim()) {
      return {
        success: false,
        error: 'Le titre du devis est requis.',
      }
    }

    if (!data.client || !data.client.trim()) {
      return {
        success: false,
        error: 'Le nom du client est requis.',
      }
    }

    if (!data.amount_ht || data.amount_ht <= 0) {
      return {
        success: false,
        error: 'Le montant doit être supérieur à 0.',
      }
    }

    const supabase = await createSupabaseServerClient()

    const { data: quote, error } = await supabase
      .from('quotes')
      .insert({
        entreprise_id: entrepriseId,
        title: data.title.trim(),
        client: data.client.trim(),
        contact: data.contact?.trim() || null,
        description: data.description?.trim() || null,
        amount_ht: data.amount_ht,
        status: data.status || 'brouillon',
      })
      .select()
      .single()

    if (error || !quote) {
      return {
        success: false,
        error: 'Erreur lors de la création du devis.',
      }
    }

    return {
      success: true,
      quoteId: quote.id,
    }
  } catch (error) {
    console.error('Create quote error:', error)
    return {
      success: false,
      error: 'Une erreur inattendue est survenue.',
    }
  }
}

/**
 * Récupère tous les devis de l'entreprise de l'utilisateur
 */
export async function getQuotes(): Promise<{ success: boolean; quotes?: Quote[]; error?: string }> {
  try {
    const entrepriseId = await getUserEntrepriseId()

    if (!entrepriseId) {
      return {
        success: false,
        error: 'Entreprise introuvable.',
      }
    }

    const supabase = await createSupabaseServerClient()

    const { data: quotes, error } = await supabase
      .from('quotes')
      .select('*')
      .eq('entreprise_id', entrepriseId)
      .order('created_at', { ascending: false })

    if (error) {
      return {
        success: false,
        error: 'Erreur lors de la récupération des devis.',
      }
    }

    return {
      success: true,
      quotes: quotes || [],
    }
  } catch (error) {
    console.error('Get quotes error:', error)
    return {
      success: false,
      error: 'Une erreur inattendue est survenue.',
    }
  }
}

/**
 * Récupère un devis par son ID
 */
export async function getQuoteById(quoteId: string): Promise<{ success: boolean; quote?: Quote; error?: string }> {
  try {
    const entrepriseId = await getUserEntrepriseId()

    if (!entrepriseId) {
      return {
        success: false,
        error: 'Entreprise introuvable.',
      }
    }

    const supabase = await createSupabaseServerClient()

    const { data: quote, error } = await supabase
      .from('quotes')
      .select('*')
      .eq('id', quoteId)
      .eq('entreprise_id', entrepriseId)
      .single()

    if (error || !quote) {
      return {
        success: false,
        error: 'Devis introuvable.',
      }
    }

    return {
      success: true,
      quote,
    }
  } catch (error) {
    console.error('Get quote by id error:', error)
    return {
      success: false,
      error: 'Une erreur inattendue est survenue.',
    }
  }
}

/**
 * Met à jour le statut d'un devis
 */
export async function updateQuoteStatus(
  quoteId: string,
  status: QuoteStatus
): Promise<{ success: boolean; error?: string }> {
  try {
    const entrepriseId = await getUserEntrepriseId()

    if (!entrepriseId) {
      return {
        success: false,
        error: 'Entreprise introuvable.',
      }
    }

    const supabase = await createSupabaseServerClient()

    const { error } = await supabase
      .from('quotes')
      .update({
        status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', quoteId)
      .eq('entreprise_id', entrepriseId)

    if (error) {
      return {
        success: false,
        error: 'Erreur lors de la mise à jour du devis.',
      }
    }

    return {
      success: true,
    }
  } catch (error) {
    console.error('Update quote status error:', error)
    return {
      success: false,
      error: 'Une erreur inattendue est survenue.',
    }
  }
}

/**
 * Récupère les statistiques des devis
 */
export async function getQuoteStats(): Promise<{ success: boolean; stats?: QuoteStats; error?: string }> {
  try {
    const entrepriseId = await getUserEntrepriseId()

    if (!entrepriseId) {
      return {
        success: false,
        error: 'Entreprise introuvable.',
      }
    }

    const supabase = await createSupabaseServerClient()

    const { data: quotes, error } = await supabase
      .from('quotes')
      .select('status')
      .eq('entreprise_id', entrepriseId)

    if (error) {
      return {
        success: false,
        error: 'Erreur lors de la récupération des statistiques.',
      }
    }

    const stats: QuoteStats = {
      total: quotes?.length || 0,
      brouillon: quotes?.filter((q) => q.status === 'brouillon').length || 0,
      envoye: quotes?.filter((q) => q.status === 'envoye').length || 0,
      accepte: quotes?.filter((q) => q.status === 'accepte').length || 0,
      refuse: quotes?.filter((q) => q.status === 'refuse').length || 0,
    }

    return {
      success: true,
      stats,
    }
  } catch (error) {
    console.error('Get quote stats error:', error)
    return {
      success: false,
      error: 'Une erreur inattendue est survenue.',
    }
  }
}

