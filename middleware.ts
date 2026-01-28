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

  const { data: profile } = await supabase
    .from('profiles')
    .select('entreprise_id')
    .eq('id', user.id)
    .single()

  if (!profile?.entreprise_id) return response

  const { data: isActive, error } = await supabase.rpc('is_company_active', {
    entreprise_id: profile.entreprise_id,
  })

  if (error || !isActive) {
    return NextResponse.redirect(new URL('/abonnement-expire', request.url))
  }

  return response
}

export const config = {
  matcher: ['/dashboard/:path*'],
}
