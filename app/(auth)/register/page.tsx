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
        // 1) Créer l'entreprise avec période d'essai de 5 jours
        const code = generateEntrepriseCode()
        const trialStartDate = new Date()
        const trialEndDate = new Date()
        trialEndDate.setDate(trialEndDate.getDate() + 5)

        const { data: entrepriseData, error: entrepriseError } = await supabase
          .from('entreprises')
          .insert({
            name: enterpriseName.trim(),
            code,
            owner_user_id: user.id,
            trial_started_at: trialStartDate.toISOString(),
            trial_ends_at: trialEndDate.toISOString(),
            subscription_status: 'trialing',
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
    <main className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 flex items-center justify-center px-4 py-16 md:py-20">
      <div className="w-full max-w-lg">
        <div className="text-center mb-10 md:mb-12">
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-4 md:mb-6 tracking-tight">
            Créer un compte
          </h1>
          <p className="text-lg md:text-xl text-gray-600 leading-relaxed">
            Commencez votre essai gratuit de 5 jours
          </p>
        </div>

        <div className="bg-white rounded-3xl p-10 md:p-12 border border-gray-200 shadow-xl shadow-gray-200/50">
          <form onSubmit={handleSubmit} className="space-y-8">
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
            <div className="space-y-4 pt-2">
              <label className="block text-base font-semibold text-gray-900 mb-3">
                Je suis
              </label>
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => setRole('patron')}
                  className={`flex-1 px-6 py-4 rounded-2xl font-semibold text-base transition-all ${
                    role === 'patron'
                      ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-lg shadow-orange-500/30'
                      : 'bg-gray-100 border-2 border-gray-200 text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Patron
                </button>
                <button
                  type="button"
                  onClick={() => setRole('employe')}
                  className={`flex-1 px-6 py-4 rounded-2xl font-semibold text-base transition-all ${
                    role === 'employe'
                      ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-lg shadow-orange-500/30'
                      : 'bg-gray-100 border-2 border-gray-200 text-gray-700 hover:border-gray-300'
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

            <div className="pt-2">
              <Button
                type="submit"
                variant="primary"
                size="lg"
                className="w-full min-h-[56px] text-lg font-semibold"
                disabled={loading}
              >
                {loading ? 'Création en cours...' : 'Créer mon compte'}
              </Button>
            </div>
          </form>

          <div className="mt-8 pt-6 border-t border-gray-200 text-center">
            <p className="text-base text-gray-600">
              Déjà un compte ?{' '}
              <Link href="/login" className="text-orange-600 hover:text-orange-700 font-semibold transition-colors">
                Me connecter
              </Link>
            </p>
          </div>
        </div>
      </div>
    </main>
  )
}
