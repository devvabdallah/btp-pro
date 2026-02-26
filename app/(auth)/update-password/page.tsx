'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabaseClient'

type SessionState = 'checking' | 'ready' | 'invalid'

export default function UpdatePasswordPage() {
  const router = useRouter()
  const [sessionState, setSessionState] = useState<SessionState>('checking')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    console.log('[UpdatePassword] mount')

    const initSession = async () => {
      // 1) Vérifier session existante
      const { data: s1 } = await supabase.auth.getSession()
      if (s1?.session) {
        setSessionState('ready')
        return
      }

      // 2) Tenter d'échanger un code PKCE si présent dans l'URL
      const url = window.location.href
      if (url.includes('code=')) {
        try {
          await supabase.auth.exchangeCodeForSession(url)
          console.log('[UpdatePassword] exchangeCodeForSession ok')
        } catch (err) {
          console.log('[UpdatePassword] exchangeCodeForSession err', err)
        }

        // Re-check session après échange
        const { data: s2 } = await supabase.auth.getSession()
        if (s2?.session) {
          setSessionState('ready')
          return
        }
      }

      // 3) Toujours pas de session
      setSessionState('invalid')
    }

    initSession()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (newPassword.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caractères.')
      return
    }
    if (newPassword !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas.')
      return
    }

    setLoading(true)
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password: newPassword })

      if (updateError) {
        console.log('[UpdatePassword] updateUser err', updateError.message)
        setError(updateError.message)
        return
      }

      console.log('[UpdatePassword] updateUser ok')
      setSuccess(true)

      setTimeout(async () => {
        await supabase.auth.signOut()
        router.replace('/login')
      }, 1200)
    } catch (err: any) {
      setError(err?.message || 'Erreur inattendue.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen relative bg-[#0a0e27] overflow-hidden flex items-center justify-center px-4 py-16 md:py-20">
      {/* Halos background */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-[#0a0e27]" />
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl" />
        <div className="absolute inset-0 bg-white/[0.02]" />
      </div>

      <div className="w-full max-w-[420px]">
        <div className="text-center mb-10 md:mb-12">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-white mb-4">
            Nouveau mot de passe
          </h1>
          <p className="text-lg text-gray-300 leading-relaxed">
            Choisis ton nouveau mot de passe.
          </p>
        </div>

        <div className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 backdrop-blur-sm rounded-3xl p-10 md:p-12 border border-white/10 shadow-[0_20px_80px_rgba(0,0,0,0.55)] bg-white/5">

          {/* Chargement */}
          {sessionState === 'checking' && (
            <p className="text-center text-gray-400 text-sm py-8">Vérification du lien…</p>
          )}

          {/* Lien invalide ou expiré */}
          {sessionState === 'invalid' && (
            <div className="space-y-6 text-center">
              <div className="rounded-xl bg-red-500/10 border border-red-500/30 px-4 py-4 text-red-400 text-sm">
                Lien invalide ou expiré. Redemandez un email de réinitialisation.
              </div>
              <Link
                href="/forgot-password"
                className="inline-flex w-full items-center justify-center min-h-[52px] rounded-xl bg-gradient-to-r from-yellow-400 to-orange-500 text-white font-semibold shadow-lg shadow-orange-500/25 hover:brightness-105 transition-all duration-200"
              >
                Renvoyer un email
              </Link>
              <p className="text-sm text-gray-500">
                <Link href="/login" className="hover:text-gray-300 transition-colors">
                  ← Retour à la connexion
                </Link>
              </p>
            </div>
          )}

          {/* Succès */}
          {sessionState === 'ready' && success && (
            <div className="text-center space-y-4 py-4">
              <div className="rounded-xl bg-green-500/10 border border-green-500/30 px-4 py-4 text-green-400 text-base">
                Mot de passe mis à jour. Redirection…
              </div>
            </div>
          )}

          {/* Formulaire */}
          {sessionState === 'ready' && !success && (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="newPassword" className="block text-sm font-medium text-gray-300 mb-2">
                  Nouveau mot de passe
                </label>
                <input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="w-full px-4 py-3 rounded-xl bg-[#1a1f3a] border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:ring-offset-0 transition-all"
                />
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-300 mb-2">
                  Confirmer le mot de passe
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="w-full px-4 py-3 rounded-xl bg-[#1a1f3a] border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:ring-offset-0 transition-all"
                />
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
                  className="w-full min-h-[56px] text-lg font-semibold rounded-xl bg-gradient-to-r from-yellow-400 to-orange-500 text-white shadow-lg shadow-orange-500/25 hover:brightness-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Mise à jour…' : 'Mettre à jour le mot de passe'}
                </button>
              </div>

              <div className="pt-2 text-center">
                <Link href="/login" className="text-sm text-gray-500 hover:text-gray-300 transition-colors">
                  ← Retour à la connexion
                </Link>
              </div>
            </form>
          )}

        </div>
      </div>
    </main>
  )
}
