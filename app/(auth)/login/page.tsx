"use client";

import { useState } from 'react'
import Link from "next/link";
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (loading) return

    setLoading(true)
    setError(null)

    try {
      // Créer le client Supabase avec le bon storage selon rememberMe
      const supabase = createSupabaseBrowserClient(rememberMe)
      
      // Connexion côté client avec Supabase
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (authError) {
        setError(authError.message || 'Erreur de connexion')
        setLoading(false)
        return
      }

      if (!authData.user) {
        setError('Connexion échouée')
        setLoading(false)
        return
      }

      // Récupérer le profil pour déterminer le rôle et rediriger
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', authData.user.id)
        .single()

      if (profileError || !profile) {
        setError('Profil introuvable')
        setLoading(false)
        return
      }

      // Rediriger selon le rôle avec window.location.href pour forcer un reload propre
      let redirectPath = '/dashboard/patron'
      if (profile.role === 'patron') {
        redirectPath = '/dashboard/patron'
      } else if (profile.role === 'employe') {
        redirectPath = '/dashboard/employe'
      }

      window.location.href = redirectPath
    } catch (err) {
      setError("Erreur inattendue. Réessaie.")
      setLoading(false)
    }
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
              <div className="text-red-400 text-sm">
                {error}
              </div>
            )}

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full min-h-[56px] text-lg font-semibold rounded-xl bg-gradient-to-r from-yellow-400 to-orange-500 text-[#0a0e27] shadow-lg shadow-orange-500/25 hover:brightness-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Connexion...' : 'Se connecter'}
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
      </div>
    </main>
  );
}
