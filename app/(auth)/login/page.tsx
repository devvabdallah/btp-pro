'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import ErrorMessage from '@/components/ui/ErrorMessage'
import { createBrowserClient } from '@supabase/ssr'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [rememberMe, setRememberMe] = useState(true)
  const [checkingSession, setCheckingSession] = useState(true)

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

  // Vérifier la session au mount et rediriger si connecté
  // Vérifier d'abord localStorage, puis sessionStorage
  useEffect(() => {
    async function checkSession() {
      try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
        const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

        // Vérifier localStorage d'abord (rememberMe = true par défaut)
        const localStorageClient = createBrowserClient(supabaseUrl, supabaseAnonKey, {
          auth: {
            storage: {
              getItem: (key: string) => {
                try {
                  return window.localStorage.getItem(key)
                } catch {
                  return null
                }
              },
              setItem: () => {},
              removeItem: () => {},
            },
            persistSession: true,
            autoRefreshToken: true,
          },
        })

        let { data: { session } } = await localStorageClient.auth.getSession()

        // Si pas de session dans localStorage, vérifier sessionStorage
        if (!session) {
          const sessionStorageClient = createBrowserClient(supabaseUrl, supabaseAnonKey, {
            auth: {
              storage: {
                getItem: (key: string) => {
                  try {
                    return window.sessionStorage.getItem(key)
                  } catch {
                    return null
                  }
                },
                setItem: () => {},
                removeItem: () => {},
              },
              persistSession: true,
              autoRefreshToken: true,
            },
          })

          const sessionResult = await sessionStorageClient.auth.getSession()
          session = sessionResult.data.session
        }

        if (session) {
          // Utiliser le client avec le bon storage pour récupérer le profil
          const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', session.user.id)
            .single()

          if (profile) {
            if (profile.role === 'patron') {
              router.replace('/dashboard/patron')
            } else if (profile.role === 'employe') {
              router.replace('/dashboard/employe')
            } else {
              router.replace('/dashboard/patron')
            }
          } else {
            router.replace('/dashboard/patron')
          }
        }
      } catch (err) {
        console.error('[Login] Erreur lors de la vérification de session:', err)
      } finally {
        setCheckingSession(false)
      }
    }

    checkSession()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault() // IMPORTANT : bloque le reload de page

    setLoading(true)
    setError('')

    // Utiliser le client Supabase avec le bon storage selon rememberMe
    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    console.log('[LOGIN][DATA] =>', JSON.stringify(data, null, 2))
    console.log('[LOGIN][ERROR] =>', JSON.stringify(authError, null, 2))

    if (authError) {
      setError(authError.message)
      setLoading(false)
      return
    }

    // Attendre la session avant de naviguer
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (session) {
      // Récupérer le profil pour redirection selon le rôle
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single()

      if (profile) {
        if (profile.role === 'patron') {
          router.push('/dashboard/patron')
        } else if (profile.role === 'employe') {
          router.push('/dashboard/employe')
        } else {
          router.push('/dashboard/patron')
        }
      } else {
        router.push('/dashboard/patron')
      }
    }

    setLoading(false)
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
