import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  const publicRoutes = ['/login', '/register', '/pricing', '/abonnement-expire']
  if (publicRoutes.some((route) => pathname.startsWith(route)) || pathname.startsWith('/api/')) {
    return NextResponse.next()
  }

  if (!pathname.startsWith('/dashboard/')) {
    return NextResponse.next()
  }

  const response = NextResponse.next()

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('[Middleware] Supabase env missing')
    return response
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options)
        })
      },
    },
  })

  // Vérifier la session utilisateur
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  
  // Si pas d'utilisateur ou erreur de session, laisser passer (la page gérera la redirection)
  if (userError || !user) {
    console.log('[Middleware] No user session or session error:', userError?.message)
    return response
  }

  // Bypass ADMIN : si la variable d'environnement est activée ET email match
  const adminBypassEnabled = process.env.NEXT_PUBLIC_BTPPRO_ADMIN_BYPASS_SUBSCRIPTION === 'true'
  if (adminBypassEnabled && user.email === 'abdallah.gabonn@gmail.com') {
    console.log('[Middleware] Bypass ADMIN activé pour:', user.email)
    return response
  }

  // Récupérer le profil avec entreprise_id
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('entreprise_id')
    .eq('id', user.id)
    .single()

  // Si pas de profil ou erreur, laisser passer
  if (profileError || !profile?.entreprise_id) {
    console.log('[Middleware] No profile or entreprise_id:', profileError?.message)
    return response
  }

  // Vérifier l'abonnement avec fallback et bypass DEV
  // Bypass DEV : si la variable d'environnement est activée, considérer comme actif
  const bypassEnabled = process.env.NEXT_PUBLIC_BTPPRO_BYPASS_SUBSCRIPTION === 'true'
  
  if (bypassEnabled) {
    return response
  }

  // Appeler le RPC uniquement APRÈS vérification de la session
  try {
    const { data, error } = await supabase.rpc('is_company_active', {
      entreprise_id: profile.entreprise_id,
    })

    // Si erreur technique (404, timeout, etc.), logger mais NE PAS rediriger
    // L'utilisateur reste connecté et peut utiliser l'app
    if (error) {
      console.error('[Middleware] RPC is_company_active error:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
      })
      // Ne pas rediriger en cas d'erreur technique - laisser l'utilisateur accéder
      return response
    }

    // Si pas de données retournées, considérer comme inactif par sécurité
    if (data === null || data === undefined) {
      console.warn('[Middleware] RPC returned null/undefined, considering inactive')
      return NextResponse.redirect(new URL('/abonnement-expire', request.url))
    }

    // Interpréter le résultat booléen
    const isActive = typeof data === 'boolean' ? data : Boolean(data)
    if (!isActive) {
      // Seulement rediriger si le RPC répond correctement ET que l'entreprise est inactive
      return NextResponse.redirect(new URL('/abonnement-expire', request.url))
    }
  } catch (err) {
    // En cas d'exception technique (réseau, timeout, etc.), logger mais NE PAS rediriger
    // L'utilisateur reste connecté
    console.error('[Middleware] Exception checking subscription:', err)
    return response
  }

  return response
}

export const config = {
  matcher: ['/dashboard/:path*'],
}
