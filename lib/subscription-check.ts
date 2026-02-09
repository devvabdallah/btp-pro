/**
 * Vérifie si une entreprise est active (abonnement/essai)
 * 
 * @param supabase - Client Supabase
 * @param entrepriseId - ID de l'entreprise (optionnel, peut être récupéré depuis le profil)
 * @returns {Promise<{ active: boolean; error: string | null }>}
 * 
 * Comportement :
 * - Si NEXT_PUBLIC_BTPPRO_ADMIN_BYPASS_SUBSCRIPTION === "true" ET user.email === "abdallah.gabonn@gmail.com" => retourne active=true
 * - Si NEXT_PUBLIC_BTPPRO_BYPASS_SUBSCRIPTION === "true" => retourne active=true sans appeler RPC
 * - En cas d'erreur RPC => retourne active=false (sécurité par défaut)
 * - Sinon => retourne le résultat du RPC
 */
export async function checkCompanyActive(
  supabase: any,
  entrepriseId?: string
): Promise<{ active: boolean; error: string | null }> {
  // Bypass ADMIN : si la variable d'environnement est activée ET email match
  const adminBypassEnabled = process.env.NEXT_PUBLIC_BTPPRO_ADMIN_BYPASS_SUBSCRIPTION === 'true'
  
  if (adminBypassEnabled) {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user?.email === 'abdallah.gabonn@gmail.com') {
        console.log('[subscription-check] Bypass ADMIN activé pour:', user.email)
        return { active: true, error: null }
      }
    } catch (err) {
      // Si erreur lors de la récupération de l'utilisateur, continuer avec les autres vérifications
      console.warn('[subscription-check] Erreur lors de la vérification bypass admin:', err)
    }
  }

  // Bypass DEV : si la variable d'environnement est activée, considérer comme actif
  const bypassEnabled = process.env.NEXT_PUBLIC_BTPPRO_BYPASS_SUBSCRIPTION === 'true'
  
  if (bypassEnabled) {
    console.log('[subscription-check] Bypass DEV activé : entreprise considérée comme active')
    return { active: true, error: null }
  }

  try {
    // Appeler le RPC is_company_active
    const rpcParams = entrepriseId ? { company_id: entrepriseId } : {}
    console.log('[subscription-check] is_company_active args OK', { entrepriseId })
    const { data, error } = await supabase.rpc('is_company_active', rpcParams)

    if (error) {
      console.error('[subscription-check] RPC is_company_active error:', error)
      // Fallback sécurité : en cas d'erreur, considérer comme inactif
      return { active: false, error: error.message || 'Erreur de vérification' }
    }

    // Interpréter le résultat de façon robuste
    let active = false
    if (typeof data === 'boolean') {
      active = data
    } else if (data && typeof (data as any).active === 'boolean') {
      active = (data as any).active
    } else if (data !== null && data !== undefined) {
      // Si data existe mais n'est pas un booléen, considérer comme actif (cas edge)
      active = Boolean(data)
    }

    return { active, error: null }
  } catch (err) {
    console.error('[subscription-check] Unexpected error:', err)
    // Fallback sécurité : en cas d'exception, considérer comme inactif
    return { active: false, error: err instanceof Error ? err.message : 'Erreur inattendue' }
  }
}
