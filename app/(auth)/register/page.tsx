'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import ErrorMessage from '@/components/ui/ErrorMessage'
import { supabase } from '@/lib/supabaseClient'
import { generateEntrepriseCode } from '@/lib/enterprise'

type Role = 'patron' | 'employe'

export default function RegisterPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [role, setRole] = useState<Role>('patron')
  const [enterpriseName, setEnterpriseName] = useState('')
  const [companyCode, setCompanyCode] = useState('')
  const [error, setError] = useState<string>('')
  const [loading, setLoading] = useState(false)

  // Vérifier si l'utilisateur est déjà connecté
  useEffect(() => {
    const checkSession = async () => {
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) return

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      if (profileError || !profile) return

      if (profile.role === 'patron') {
        router.replace('/dashboard/patron')
      } else if (profile.role === 'employe') {
        router.replace('/dashboard/employe')
      }
    }

    checkSession()
  }, [router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    // Étape 2.1 : Validation côté frontend
    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas.')
      setLoading(false)
      return
    }

    if (role === 'patron' && !enterpriseName.trim()) {
      setError('Veuillez saisir le nom de votre entreprise.')
      setLoading(false)
      return
    }

    if (role === 'employe') {
      if (!companyCode.trim()) {
        setError('Veuillez saisir le code entreprise.')
        setLoading(false)
        return
      }
      if (!/^[0-9]{6}$/.test(companyCode)) {
        setError('Le code entreprise doit contenir exactement 6 chiffres.')
        setLoading(false)
        return
      }
    }

    try {
      // Étape 2.2 : Création de l'utilisateur dans Supabase Auth
      const { data, error: authError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
      })

      console.log('[Signup] auth result:', { data, error: authError })

      if (authError) {
        // Gestion d'un email déjà utilisé
        if (
          authError.code === '23505' ||
          authError.message?.toLowerCase().includes('already registered')
        ) {
          setError('Cet email est déjà utilisé.')
        } else {
          setError(authError.message || 'Erreur lors de la création du compte.')
        }
        setLoading(false)
        return
      }

      const user = data.user
      if (!user) {
        setError("Impossible de récupérer l'utilisateur après inscription.")
        setLoading(false)
        return
      }

      // Étape 2.3 : Création de l'entreprise + profil
      if (role === 'patron') {
        // 1) Créer l'entreprise
        const code = generateEntrepriseCode()
        const { data: entrepriseData, error: entrepriseError } = await supabase
          .from('entreprises')
          .insert({
            name: enterpriseName.trim(),
            code,
            owner_user_id: user.id,
          })
          .select('id')
          .single()

        console.log('[Signup] entreprise insert:', { entrepriseData, entrepriseError })

        if (entrepriseError) {
          setError(entrepriseError.message || "Erreur lors de la création de l'entreprise.")
          setLoading(false)
          return
        }

        // 2) Créer le profil
        const { error: profileError } = await supabase.from('profiles').insert({
          id: user.id,
          role: 'patron',
          entreprise_id: entrepriseData.id,
        })

        console.log('[Signup] profile insert:', { profileError })

        if (profileError) {
          setError(profileError.message || 'Erreur lors de la création du profil.')
          setLoading(false)
          return
        }

        // Redirection vers le dashboard patron
        router.push('/dashboard/patron')
      } else {
        // Rôle employé
        // Chercher l'entreprise avec le code
        const { data: entrepriseData, error: entrepriseError } = await supabase
          .from('entreprises')
          .select('id')
          .eq('code', companyCode)
          .single()

        if (entrepriseError || !entrepriseData) {
          setError('Code entreprise invalide.')
          setLoading(false)
          return
        }

        // Créer le profil
        const { error: profileError } = await supabase.from('profiles').insert({
          id: user.id,
          role: 'employe',
          entreprise_id: entrepriseData.id,
        })

        console.log('[Signup] profile insert:', { profileError })

        if (profileError) {
          setError(profileError.message || 'Erreur lors de la création du profil.')
          setLoading(false)
          return
        }

        // Redirection vers le dashboard employé
        router.push('/dashboard/employe')
      }
    } catch (err) {
      console.error('[Signup] unexpected error:', err)
      setError('Une erreur inattendue est survenue.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-[#0a0e27] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-2">
            Créer un compte
          </h1>
        </div>

        <div className="bg-[#1a1f3a] rounded-3xl p-8 border border-[#2a2f4a]">
          <form onSubmit={handleSubmit} className="space-y-6">
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

            <Input
              label="Confirmer le mot de passe"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              placeholder="••••••••"
              error={password && confirmPassword && password !== confirmPassword ? 'Les mots de passe ne correspondent pas' : ''}
            />

            {/* Choix du rôle */}
            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Je suis
              </label>
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => setRole('patron')}
                  className={`flex-1 px-4 py-3 rounded-2xl font-semibold transition-all ${
                    role === 'patron'
                      ? 'bg-gradient-to-r from-yellow-400 to-orange-500 text-[#0a0e27]'
                      : 'bg-[#0f1429] border border-gray-600 text-gray-300'
                  }`}
                >
                  Patron
                </button>
                <button
                  type="button"
                  onClick={() => setRole('employe')}
                  className={`flex-1 px-4 py-3 rounded-2xl font-semibold transition-all ${
                    role === 'employe'
                      ? 'bg-gradient-to-r from-yellow-400 to-orange-500 text-[#0a0e27]'
                      : 'bg-[#0f1429] border border-gray-600 text-gray-300'
                  }`}
                >
                  Employé
                </button>
              </div>
            </div>

            {/* Champ conditionnel selon le rôle */}
            {role === 'patron' ? (
              <Input
                label="Nom de l'entreprise"
                type="text"
                value={enterpriseName}
                onChange={(e) => setEnterpriseName(e.target.value)}
                required
                placeholder="Mon Entreprise BTP"
              />
            ) : (
              <Input
                label="Code entreprise (6 chiffres)"
                type="text"
                value={companyCode}
                onChange={(e) => setCompanyCode(e.target.value)}
                required
                placeholder="123456"
                maxLength={6}
              />
            )}

            <ErrorMessage message={error} />

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full"
              disabled={loading}
            >
              {loading ? 'Création en cours...' : 'Créer mon compte'}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-gray-400">
              Déjà un compte ?{' '}
              <Link href="/login" className="text-yellow-400 hover:text-yellow-500 font-semibold">
                Me connecter
              </Link>
            </p>
          </div>
        </div>
      </div>
    </main>
  )
}
