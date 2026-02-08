'use server'

import { createSupabaseServerClient } from './supabase/server'
import { createSupabaseAdminClient } from './supabase/admin'

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
 * Supprime une facture
 */
export async function deleteInvoice(invoiceId: string): Promise<{ success: boolean; error?: string }> {
  try {
    // 1. Récupérer l'entreprise_id de l'utilisateur connecté (client serveur normal pour l'auth)
    const entrepriseId = await getUserEntrepriseId()

    if (!entrepriseId) {
      return {
        success: false,
        error: 'Accès non autorisé.',
      }
    }

    // 2. Utiliser le client admin pour bypass RLS
    const adminSupabase = createSupabaseAdminClient()

    // 3. Récupérer la facture par son id (avec client admin)
    const { data: invoice, error: invoiceError } = await adminSupabase
      .from('invoices')
      .select('id, entreprise_id')
      .eq('id', invoiceId)
      .single()

    if (invoiceError || !invoice) {
      return {
        success: false,
        error: 'Facture introuvable.',
      }
    }

    // 4. Vérifier que la facture a un entreprise_id
    if (!invoice.entreprise_id) {
      return {
        success: false,
        error: 'Facture sans entreprise_id (donnée invalide).',
      }
    }

    // 5. Vérifier que la facture appartient à l'entreprise de l'utilisateur
    const invoiceEntrepriseId = String(invoice.entreprise_id).trim()
    const userEntrepriseId = String(entrepriseId).trim()

    if (invoiceEntrepriseId !== userEntrepriseId) {
      return {
        success: false,
        error: 'Accès non autorisé.',
      }
    }

    // 6. Supprimer d'abord les lignes associées (si elles existent) (avec client admin)
    const { error: linesError } = await adminSupabase
      .from('invoice_lines')
      .delete()
      .eq('invoice_id', invoiceId)

    // Ne pas bloquer si la table n'existe pas ou s'il n'y a pas de lignes
    if (linesError && linesError.code !== 'PGRST116') {
      console.error('Error deleting invoice lines:', linesError)
      // On continue quand même la suppression de la facture
    }

    // 7. Supprimer la facture (avec client admin)
    const { error } = await adminSupabase
      .from('invoices')
      .delete()
      .eq('id', invoiceId)

    if (error) {
      return {
        success: false,
        error: 'Erreur lors de la suppression de la facture.',
      }
    }

    return {
      success: true,
    }
  } catch (error) {
    console.error('Delete invoice error:', error)
    return {
      success: false,
      error: 'Une erreur inattendue est survenue.',
    }
  }
}
