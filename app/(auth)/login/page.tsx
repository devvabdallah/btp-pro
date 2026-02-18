"use client";

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from "next/link";
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

// Composant interne pour lire les searchParams (requis car useSearchParams doit être dans un Suspense)
function LoginForm() {
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  // Afficher les raisons de redirection depuis l'URL (?reason=... ou ?error=...)
  useEffect(() => {
    const reason = searchParams.get('reason')
    const urlError = searchParams.get('error')
    if (reason === 'session_stuck') {
      setError('Session expirée ou bloquée. Reconnectez-vous.')
    } else if (reason === 'unauthorized') {
      setError('Accès non autorisé. Connectez-vous pour continuer.')
    } else if (urlError === 'profile_missing') {
      setError('Profil introuvable. Contactez le support.')
    } else if (urlError) {
      setError(`Erreur : ${urlError}`)
    }
  }, [searchParams])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (loading) return

    console.log('[LOGIN] submit clicked', { email })

    setLoading(true)
    setError(null)

    try {
      // Vérifier que les variables d'env sont présentes
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      if (!supabaseUrl || !supabaseKey) {
        console.error('[LOGIN] Variables Supabase manquantes', { supabaseUrl: !!supabaseUrl, supabaseKey: !!supabaseKey })
        setError('Configuration serveur incorrecte (variables manquantes).')
        setLoading(false)
        return
      }

      console.log('[LOGIN] creating Supabase client', { rememberMe })
      const supabase = createSupabaseBrowserClient(rememberMe)

      console.log('[LOGIN] calling signInWithPassword...')
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      console.log('[LOGIN] signIn result', {
        hasUser: !!authData?.user,
        hasSession: !!authData?.session,
        error: authError?.message,
        errorCode: (authError as any)?.status,
      })

      if (authError) {
        setError(authError.message || 'Erreur de connexion')
        setLoading(false)
        return
      }

      if (!authData?.user) {
        setError('Connexion échouée — aucun utilisateur retourné.')
        setLoading(false)
        return
      }

      // Récupérer le profil pour déterminer le rôle
      console.log('[LOGIN] fetching profile for user', authData.user.id)
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', authData.user.id)
        .single()

      if (profileError) {
        console.error('[LOGIN] profileError', profileError.message)
      }

      let redirectPath = '/dashboard/patron'
      if (profile?.role === 'employe') {
        redirectPath = '/dashboard/employe'
      }

      console.log('[LOGIN] redirecting to', redirectPath)
      window.location.href = redirectPath

    } catch (err: any) {
      console.error('[LOGIN] unexpected error', err?.message ?? err)
      setError(err?.message || 'Erreur inattendue. Réessaie.')
      setLoading(false)
    }
  }

  return (
    <div className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 backdrop-blur-sm rounded-3xl p-10 md:p-12 border border-white/10 shadow-[0_20px_80px_rgba(0,0,0,0.55)] bg-white/5">
      <form onSubmit={handleSubmit} className="space-y-8">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="votre@email.com"
            className="w-full px-4 py-3 rounded-xl bg-[#1a1f3a] border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:ring-offset-0 focus:ring-offset-transparent transition-all"
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
            Mot de passe
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            placeholder="••••••••"
            className="w-full px-4 py-3 rounded-xl bg-[#1a1f3a] border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:ring-offset-0 focus:ring-offset-transparent transition-all"
          />
        </div>

        <div className="flex items-center">
          <input
            id="rememberMe"
            type="checkbox"
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
            className="w-4 h-4 rounded border-white/20 bg-[#1a1f3a] text-orange-500 focus:ring-2 focus:ring-orange-400 focus:ring-offset-0 focus:ring-offset-transparent cursor-pointer"
          />
          <label htmlFor="rememberMe" className="ml-3 text-sm text-gray-300 cursor-pointer">
            Se souvenir de moi
          </label>
        </div>

        {error && (
          <div className="rounded-xl bg-red-500/10 border border-red-500/30 px-4 py-3 text-red-400 text-sm">
            {error}
          </div>
        )}

        <div className="pt-2">
          <button
            type="submit"
            disabled={loading}
            className="w-full min-h-[56px] text-lg font-semibold rounded-xl bg-gradient-to-r from-yellow-400 to-orange-500 text-[#0a0e27] shadow-lg shadow-orange-500/25 hover:brightness-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Connexion en cours…' : 'Se connecter'}
          </button>
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
  )
}

export default function LoginPage() {
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

        {/* Suspense requis par Next.js pour useSearchParams dans un client component */}
        <Suspense fallback={
          <div className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 rounded-3xl p-10 md:p-12 border border-white/10">
            <div className="h-64 flex items-center justify-center">
              <p className="text-gray-400 text-sm">Chargement…</p>
            </div>
          </div>
        }>
          <LoginForm />
        </Suspense>
      </div>
    </main>
  )
}
