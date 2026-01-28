'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import ErrorMessage from '@/components/ui/ErrorMessage'
import { supabase } from '@/lib/supabaseClient'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string>('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault() // IMPORTANT : bloque le reload de page

    setLoading(true)
    setError('')

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

  return (
    <main className="min-h-screen bg-[#0a0e27] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-2">
            Connexion
          </h1>
        </div>

        <div className="bg-[#1a1f3a] rounded-3xl p-8 border border-[#2a2f4a]">
          <form onSubmit={handleLogin} className="space-y-6">
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

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full"
              disabled={loading}
            >
              {loading ? 'Connexion...' : 'Se connecter'}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-gray-400">
              Pas encore de compte ?{' '}
              <Link href="/register" className="text-yellow-400 hover:text-yellow-500 font-semibold">
                Créer un compte
              </Link>
            </p>
          </div>
        </div>
      </div>
    </main>
  )
}
