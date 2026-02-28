"use client";

import { useState, useEffect, useRef, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from "next/link";
import { createBrowserClient } from "@supabase/ssr";
import { APP_NAME } from "@/lib/app-config";

function LoginForm() {
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const formRef = useRef<HTMLFormElement | null>(null)

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

  const handleSubmit = async (e?: any) => {
    console.log("[LOGIN] submit fired")
    if (e?.preventDefault) e.preventDefault()
    console.log("[LOGIN] handleSubmit triggered", { email })
    setError(null)
    setLoading(true)

    try {
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )

      const { error: authError } = await supabase.auth.signInWithPassword({ email, password })

      if (authError) {
        console.warn("[LOGIN] signInWithPassword error:", authError.message)
        setError(authError.message)
        return
      }

      console.log("[LOGIN] success, hard redirect to /dashboard/patron")
      window.location.assign("/dashboard/patron")
    } catch (err: any) {
      console.error("[LOGIN] unexpected error", err)
      setError(err?.message || "Erreur serveur.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 backdrop-blur-sm rounded-3xl p-10 md:p-12 border border-white/10 shadow-[0_20px_80px_rgba(0,0,0,0.55)] bg-white/5">
      <form ref={formRef} onSubmit={handleSubmit} onSubmitCapture={() => console.log("[LOGIN] submit CAPTURE")} className="space-y-8">
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

        {error && (
          <div className="rounded-xl bg-red-500/10 border border-red-500/30 px-4 py-3 text-red-400 text-sm">
            {error}
          </div>
        )}

        <div className="pt-2">
          <button
            type="button"
            disabled={loading}
            onClick={() => { console.log("[LOGIN] button clicked"); handleSubmit(); }}
            className="w-full min-h-[56px] text-lg font-semibold rounded-xl bg-gradient-to-r from-yellow-400 to-orange-500 text-white shadow-lg shadow-orange-500/25 hover:brightness-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Connexion en cours…' : 'Se connecter'}
          </button>
        </div>
      </form>

      <div className="mt-8 pt-6 border-t border-white/10 text-center space-y-3">
        <p className="text-base text-gray-300">
          Pas encore de compte ?{' '}
          <Link href="/register" className="text-orange-400 hover:text-orange-300 font-semibold transition-colors">
            Créer un compte
          </Link>
        </p>
        <p className="text-sm text-gray-500">
          <Link href="/reset-password" className="text-orange-400 hover:text-orange-300 font-semibold transition-colors">
            Mot de passe oublié ?
          </Link>
        </p>
      </div>
    </div>
  )
}

export default function LoginPage() {
  useEffect(() => {
    console.log("[LOGIN_PAGE] mounted", new Date().toISOString());
  }, []);

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
            Accédez à votre espace {APP_NAME}
          </p>
        </div>

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
