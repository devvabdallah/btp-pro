/**
 * Vérifie si une entreprise est active (abonnement/essai)
 * 
 * @param supabase - Client Supabase
 * @param entrepriseId - ID de l'entreprise (optionnel, peut être récupéré depuis le profil)
 * @returns {Promise<{ active: boolean; error: string | null }>}
 * 
 * Comportement :
 * - Si NODE_ENV !== 'production' ET DEV_BYPASS_SUBSCRIPTION=1 ET user.email === "abdallah.gabonn@gmail.com" => retourne active=true (bypass dev)
 * - Si NODE_ENV !== 'production' ET user.email === DEV_BYPASS_EMAIL => retourne active=true (bypass admin dev)
 * - Si NEXT_PUBLIC_BTPPRO_BYPASS_SUBSCRIPTION === "true" => retourne active=true sans appeler RPC
 * - En cas d'erreur RPC => retourne active=false (sécurité par défaut)
 * - Sinon => retourne le résultat du RPC
 */
export async function checkCompanyActive(
  supabase: any,
  entrepriseId?: string
): Promise<{ active: boolean; error: string | null }> {
  // Bypass DEV pour email spécifique : uniquement en développement, si DEV_BYPASS_SUBSCRIPTION=1
  if (process.env.NODE_ENV !== 'production' && process.env.DEV_BYPASS_SUBSCRIPTION === '1') {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user?.email === 'abdallah.gabonn@gmail.com') {
        console.log('[DEV BYPASS] Subscription forced ACTIVE for abdallah.gabonn@gmail.com')
        return { active: true, error: null }
      }
    } catch (err) {
      // Si erreur lors de la récupération de l'utilisateur, continuer avec les autres vérifications
      console.warn('[subscription-check] Erreur lors de la vérification bypass dev:', err)
    }
  }

  // Bypass ADMIN DEV : uniquement en développement, si email match DEV_BYPASS_EMAIL
  if (process.env.NODE_ENV !== 'production') {
    const devBypassEmail = process.env.DEV_BYPASS_EMAIL
    if (devBypassEmail) {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (user?.email === devBypassEmail) {
          console.log('[subscription-check] Bypass ADMIN DEV activé pour:', user.email)
          return { active: true, error: null }
        }
      } catch (err) {
        // Si erreur lors de la récupération de l'utilisateur, continuer avec les autres vérifications
        console.warn('[subscription-check] Erreur lors de la vérification bypass admin dev:', err)
      }
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
    const rpcParams = entrepriseId ? { p_entreprise_id: entrepriseId } : {}
    console.log('[subscription-check] Appel RPC is_company_active', { entrepriseId, rpcParams })
    const { data, error } = await supabase.rpc('is_company_active', rpcParams)

    if (error) {
      console.error('[subscription-check] RPC is_company_active ERROR', {
        entrepriseId,
        error: error.message,
        errorCode: error.code,
        errorDetails: error,
      })
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

    console.log('[subscription-check] RPC is_company_active RÉSULTAT', {
      entrepriseId,
      rawData: data,
      dataType: typeof data,
      active,
    })

    return { active, error: null }
  } catch (err) {
    console.error('[subscription-check] Unexpected error:', err)
    // Fallback sécurité : en cas d'exception, considérer comme inactif
    return { active: false, error: err instanceof Error ? err.message : 'Erreur inattendue' }
  }
}
