'use client'

import { useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabaseClient'

export default function ResetPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/update-password`,
      })

      if (resetError) {
        setError(resetError.message)
        return
      }

      setSuccess(true)
    } catch (err: any) {
      setError(err?.message || 'Erreur inattendue.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen relative bg-[#0a0e27] overflow-hidden flex items-center justify-center px-4 py-16">
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-[#0a0e27]" />
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-[420px]">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold tracking-tight text-white mb-4">
            Mot de passe oublié
          </h1>
          <p className="text-lg text-gray-300 leading-relaxed">
            Saisis ton email pour recevoir un lien de réinitialisation.
          </p>
        </div>

        <div className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 backdrop-blur-sm rounded-3xl p-10 border border-white/10 shadow-[0_20px_80px_rgba(0,0,0,0.55)]">
          {success ? (
            <div className="text-center space-y-6">
              <div className="rounded-xl bg-green-500/10 border border-green-500/30 px-4 py-4 text-green-400 text-base">
                Email envoyé. Vérifie ta boîte mail.
              </div>
              <Link
                href="/login"
                className="inline-block text-sm text-orange-400 hover:text-orange-300 transition-colors"
              >
                ← Retour à la connexion
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
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
                  className="w-full px-4 py-3 rounded-xl bg-[#1a1f3a] border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-400 transition-all"
                />
              </div>

              {error && (
                <div className="rounded-xl bg-red-500/10 border border-red-500/30 px-4 py-3 text-red-400 text-sm">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full min-h-[52px] text-base font-semibold rounded-xl bg-gradient-to-r from-yellow-400 to-orange-500 text-white shadow-lg shadow-orange-500/25 hover:brightness-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Envoi en cours…' : 'Envoyer le lien'}
              </button>

              <p className="text-center text-sm text-gray-500">
                <Link href="/login" className="hover:text-gray-300 transition-colors">
                  ← Retour à la connexion
                </Link>
              </p>
            </form>
          )}
        </div>
      </div>
    </main>
  )
}
