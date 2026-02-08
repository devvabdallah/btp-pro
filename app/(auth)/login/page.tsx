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
      <main className="min-h-screen bg-gradient-to-br from-[#0a0e27] via-[#0d1228] to-[#0a0e27] flex items-center justify-center px-4 py-16 md:py-20">
        <div className="w-full max-w-lg">
          <div className="bg-white/95 backdrop-blur-sm rounded-3xl p-10 md:p-12 border border-gray-200 shadow-xl">
            <p className="text-gray-600 text-center text-base">Vérification de la session...</p>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 flex items-center justify-center px-4 py-16 md:py-20">
      <div className="w-full max-w-lg">
        <div className="text-center mb-10 md:mb-12">
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-4 md:mb-6 tracking-tight">
            Connexion
          </h1>
          <p className="text-lg md:text-xl text-gray-600 leading-relaxed">
            Accédez à votre espace BTP PRO
          </p>
        </div>

        <div className="bg-white rounded-3xl p-10 md:p-12 border border-gray-200 shadow-xl shadow-gray-200/50">
          <form onSubmit={handleLogin} className="space-y-8">
            <Input
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="votre@email.com"
            />

            <Input
              label="Mot de passe"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
            />

            <ErrorMessage message={error} />

            {/* Checkbox "Se souvenir de moi" */}
            <div className="flex items-center gap-3 pt-2">
              <input
                type="checkbox"
                id="rememberMe"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-5 h-5 rounded border-gray-300 bg-white text-orange-500 focus:ring-2 focus:ring-orange-500 focus:ring-offset-0 cursor-pointer"
              />
              <label htmlFor="rememberMe" className="text-base text-gray-700 cursor-pointer select-none font-medium">
                Se souvenir de moi
              </label>
            </div>

            <div className="pt-2">
              <Button
                type="submit"
                variant="primary"
                size="lg"
                className="w-full min-h-[56px] text-lg font-semibold"
                disabled={loading || checkingSession}
              >
                {loading ? 'Connexion...' : 'Se connecter'}
              </Button>
            </div>
          </form>

          <div className="mt-8 pt-6 border-t border-gray-200 text-center">
            <p className="text-base text-gray-600">
              Pas encore de compte ?{' '}
              <Link href="/register" className="text-orange-600 hover:text-orange-700 font-semibold transition-colors">
                Créer un compte
              </Link>
            </p>
          </div>
        </div>
      </div>
    </main>
  )
}
