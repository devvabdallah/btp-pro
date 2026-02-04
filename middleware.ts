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

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return response

  // Bypass ADMIN : si la variable d'environnement est activée ET email match
  const adminBypassEnabled = process.env.NEXT_PUBLIC_BTPPRO_ADMIN_BYPASS_SUBSCRIPTION === 'true'
  if (adminBypassEnabled && user.email === 'abdallah.gabonn@gmail.com') {
    console.log('[Middleware] Bypass ADMIN activé pour:', user.email)
    return response
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('entreprise_id')
    .eq('id', user.id)
    .single()

  if (!profile?.entreprise_id) return response

  // Vérifier l'abonnement avec fallback et bypass DEV
  // Bypass DEV : si la variable d'environnement est activée, considérer comme actif
  const bypassEnabled = process.env.NEXT_PUBLIC_BTPPRO_BYPASS_SUBSCRIPTION === 'true'
  
  if (bypassEnabled) {
    return response
  }

  try {
    const { data, error } = await supabase.rpc('is_company_active', {
      entreprise_id: profile.entreprise_id,
    })

    // En cas d'erreur ou si inactif, rediriger vers /abonnement-expire
    if (error || !data) {
      return NextResponse.redirect(new URL('/abonnement-expire', request.url))
    }

    // Interpréter le résultat
    const isActive = typeof data === 'boolean' ? data : Boolean(data)
    if (!isActive) {
      return NextResponse.redirect(new URL('/abonnement-expire', request.url))
    }
  } catch (err) {
    // En cas d'exception, rediriger vers /abonnement-expire (sécurité par défaut)
    console.error('[Middleware] Error checking subscription:', err)
    return NextResponse.redirect(new URL('/abonnement-expire', request.url))
  }

  return response
}

export const config = {
  matcher: ['/dashboard/:path*'],
}
