'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import ErrorMessage from '@/components/ui/ErrorMessage'
import { createBrowserClient } from '@supabase/ssr'

export default function LoginPage() {
  const REDIRECT_URL = '/dashboard/patron/abonnement'
  const router = useRouter()
  const searchParams = useSearchParams()
  const didRedirect = useRef(false)

  // Fonction de redirection navigateur avec garde anti-boucle
  const hardRedirect = (url: string) => {
    if (didRedirect.current) return
    didRedirect.current = true
    console.log('[LOGIN] HARD_REDIRECT ->', url)
    window.location.assign(url)
  }
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [rememberMe, setRememberMe] = useState(true)
  const [checkingSession, setCheckingSession] = useState(true)

  // Lire les erreurs depuis l'URL
  useEffect(() => {
    const errorParam = searchParams.get('error')
    if (errorParam === 'profile_missing') {
      setError('Profil utilisateur introuvable. Veuillez vous reconnecter.')
    } else if (errorParam === 'session_stuck') {
      setError('Session bloquée. Veuillez vous reconnecter.')
    }
  }, [searchParams])

  // Créer un client Supabase avec le bon storage selon rememberMe
  const supabase = useMemo(() => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Variables d\'environnement Supabase manquantes')
    }

    // Utiliser localStorage si rememberMe = true, sinon sessionStorage
    const storage = rememberMe ? window.localStorage : window.sessionStorage

    return createBrowserClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        storage: {
          getItem: (key: string) => {
            try {
              return storage.getItem(key)
            } catch {
              return null
            }
          },
          setItem: (key: string, value: string) => {
            try {
              storage.setItem(key, value)
            } catch {
              // Ignore errors
            }
          },
          removeItem: (key: string) => {
            try {
              storage.removeItem(key)
            } catch {
              // Ignore errors
            }
          },
        },
        persistSession: true,
        autoRefreshToken: true,
      },
    })
  }, [rememberMe])

  // Helper pour timeout sur les promesses
  const withTimeout = <T,>(p: Promise<T>, ms = 8000): Promise<T> =>
    Promise.race([
      p,
      new Promise<never>((_, r) =>
        setTimeout(() => r(new Error('Timeout')), ms)
      ),
    ])

  // Vérifier la session au mount (une seule fois)
  useEffect(() => {
    let isMounted = true

    async function checkSessionOnce() {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        
        if (!isMounted) return

        if (session) {
          hardRedirect(REDIRECT_URL)
          return
        }

        setCheckingSession(false)
      } catch (err) {
        console.error('[Login] Erreur lors de la vérification de session:', err)
        if (isMounted) {
          setCheckingSession(false)
        }
      }
    }

    // Vérifier la session une seule fois au montage
    checkSessionOnce()

    return () => {
      isMounted = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault() // IMPORTANT : bloque le reload de page

    // Empêcher les doubles clics
    if (loading) return

    setLoading(true)
    setError('')

    try {
      console.log('[LOGIN] submit')

      // 1. Appeler signInWithPassword avec timeout
      console.log('[LOGIN] signIn start')
      const signInPromise = supabase.auth.signInWithPassword({
        email,
        password,
      })
      const { error: authError } = await withTimeout(signInPromise)

      // 2. Si erreur existe: afficher message clair et STOP
      if (authError) {
        console.error('[LOGIN] signIn error:', authError.message)
        setError(authError.message)
        return
      }

      console.log('[LOGIN] signIn ok')

      // 3. Sinon: appeler immédiatement getSession() avec timeout
      console.log('[LOGIN] getSession start')
      const getSessionPromise = supabase.auth.getSession()
      const { data: sessionData, error: sessionError } = await withTimeout(getSessionPromise)

      // 4. Si erreur sur getSession: afficher message clair
      if (sessionError) {
        console.error('[LOGIN] getSession error:', sessionError.message)
        setError('Session introuvable après login. Veuillez réessayer.')
        return
      }

      console.log('[LOGIN] getSession ok')

      // 5. Si session existe: rediriger vers la route fixe avec navigation navigateur
      if (sessionData?.session) {
        hardRedirect(REDIRECT_URL)
        return
      }

      // 6. Sinon: afficher erreur "Session absente après login" (rare)
      console.warn('[LOGIN] session missing after login')
      setError('Connexion réussie mais session absente. Vérifiez vos paramètres de cookies.')
    } catch (err) {
      // Gérer les timeouts et erreurs inconnues
      const errorMessage = err instanceof Error ? err.message : 'Erreur inconnue'
      console.error('[LOGIN] unexpected error:', errorMessage, err)
      
      if (errorMessage === 'Timeout') {
        setError('Connexion bloquée (timeout). Réessayez.')
      } else {
        setError('Connexion bloquée (timeout). Réessayez.')
      }
    } finally {
      // Toujours désactiver le loading, même en cas d'erreur
      setLoading(false)
    }
  }

  if (checkingSession) {
    return (
      <main className="min-h-screen relative bg-[#0a0e27] overflow-hidden flex items-center justify-center px-4 py-16 md:py-20">
        {/* Fond premium avec halos */}
        <div className="fixed inset-0 -z-10">
          <div className="absolute inset-0 bg-[#0a0e27]"></div>
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl"></div>
          <div className="absolute inset-0 bg-white/[0.02]"></div>
        </div>
        <div className="w-full max-w-[420px]">
          <div className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 backdrop-blur-sm rounded-3xl p-10 md:p-12 border border-white/10 shadow-[0_20px_80px_rgba(0,0,0,0.55)] bg-white/5">
            <p className="text-white/70 text-center text-base">Vérification de la session...</p>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen relative bg-[#0a0e27] overflow-hidden flex items-center justify-center px-4 py-16 md:py-20">
      {/* Fond premium avec halos */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-[#0a0e27]"></div>
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl"></div>
        <div className="absolute inset-0 bg-white/[0.02]"></div>
      </div>

      <div className="w-full max-w-[420px]">
        <div className="text-center mb-10 md:mb-12">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-white mb-4 md:mb-6">
            Connexion
          </h1>
          <p className="text-lg md:text-xl text-gray-300 leading-relaxed">
            Accédez à votre espace BTP PRO
          </p>
        </div>

        <div className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 backdrop-blur-sm rounded-3xl p-10 md:p-12 border border-white/10 shadow-[0_20px_80px_rgba(0,0,0,0.55)] bg-white/5">
          <form onSubmit={handleLogin} className="space-y-8">
            <Input
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="votre@email.com"
              variant="dark"
            />

            <Input
              label="Mot de passe"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              variant="dark"
            />

            <ErrorMessage message={error} variant="dark" />

            {/* Checkbox "Se souvenir de moi" */}
            <div className="flex items-center gap-3 pt-2">
              <input
                type="checkbox"
                id="rememberMe"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-5 h-5 rounded border-gray-600 bg-[#1a1f3a] text-orange-500 focus:ring-2 focus:ring-orange-400 focus:ring-offset-0 focus:ring-offset-transparent cursor-pointer"
              />
              <label htmlFor="rememberMe" className="text-base text-gray-300 cursor-pointer select-none font-medium">
                Se souvenir de moi
              </label>
            </div>

            <div className="pt-2">
              <Button
                type="submit"
                variant="primary"
                size="lg"
                className="w-full min-h-[56px] text-lg font-semibold !rounded-xl"
                disabled={loading || checkingSession}
              >
                {loading ? 'Connexion...' : 'Se connecter'}
              </Button>
            </div>
          </form>

          <div className="mt-8 pt-6 border-t border-white/10 text-center">
            <p className="text-base text-gray-300">
              Pas encore de compte ?{' '}
              <Link href="/register" className="text-orange-400 hover:text-orange-300 font-semibold transition-colors">
                Créer un compte
              </Link>
            </p>
          </div>
        </div>
      </div>
    </main>
  )
}
