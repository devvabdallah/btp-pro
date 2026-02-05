'use server'

import { createSupabaseServerClient } from './supabase/server'
import { generateEntrepriseCode } from './enterprise'
import { redirect } from 'next/navigation'

export type AuthResult = {
  success: boolean
  message?: string
}

export async function registerUser(formData: FormData): Promise<AuthResult | never> {
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const passwordConfirm = formData.get('passwordConfirm') as string
  const role = formData.get('role') as string
  const companyName = formData.get('companyName') as string | null
  const companyCode = formData.get('companyCode') as string | null

  // Validations
  if (!email || !password || !passwordConfirm || !role) {
    return {
      success: false,
      message: 'Veuillez remplir tous les champs.',
    }
  }

  if (password.length < 6) {
    return {
      success: false,
      message: 'Le mot de passe doit contenir au moins 6 caractères.',
    }
  }

  if (password !== passwordConfirm) {
    return {
      success: false,
      message: 'Les mots de passe ne correspondent pas.',
    }
  }

  if (role !== 'patron' && role !== 'employe') {
    return {
      success: false,
      message: 'Rôle invalide.',
    }
  }

  // Validation spécifique selon le rôle
  if (role === 'patron' && !companyName) {
    return {
      success: false,
      message: 'Veuillez saisir le nom de votre entreprise.',
    }
  }

  if (role === 'employe') {
    if (!companyCode) {
      return {
        success: false,
        message: 'Veuillez saisir le code entreprise.',
      }
    }
    if (!/^[0-9]{6}$/.test(companyCode)) {
      return {
        success: false,
        message: 'Le code entreprise doit contenir exactement 6 chiffres.',
      }
    }
  }

  try {
    const supabase = await createSupabaseServerClient()

    console.log('[Auth] Signup attempt for email:', email)

    // Créer l'utilisateur Supabase
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    })

    if (authError) {
      console.log('[Auth] Signup error:', authError)
      
      // Vérifier si c'est vraiment une erreur de duplication d'email
      const isDuplicateEmail = 
        authError.code === '23505' || 
        authError.message?.toLowerCase().includes('already registered') ||
        authError.message?.toLowerCase().includes('user already registered') ||
        authError.message?.toLowerCase().includes('email already registered')
      
      if (isDuplicateEmail) {
        return {
          success: false,
          message: 'Cet email est déjà utilisé.',
        }
      } else {
        // Afficher le message d'erreur générique de Supabase
        return {
          success: false,
          message: authError.message || 'Une erreur est survenue lors de la création du compte.',
        }
      }
    }

    console.log('[Auth] Signup success, user ID:', authData.user?.id)

    if (!authData.user) {
      return {
        success: false,
        message: 'Impossible de créer le compte utilisateur.',
      }
    }

    const userId = authData.user.id

    // Traitement selon le rôle
    if (role === 'patron') {
      // Générer le code entreprise
      const code = generateEntrepriseCode()

      // Créer l'entreprise avec période d'essai de 5 jours
      const trialStartDate = new Date()
      const trialEndDate = new Date()
      trialEndDate.setDate(trialEndDate.getDate() + 5)

      const { data: entrepriseData, error: entrepriseError } = await supabase
        .from('entreprises')
        .insert({
          name: companyName,
          code,
          owner_user_id: userId,
          trial_started_at: trialStartDate.toISOString(),
          trial_ends_at: trialEndDate.toISOString(),
          subscription_status: 'trialing',
        })
        .select()
        .single()

      if (entrepriseError || !entrepriseData) {
        return {
          success: false,
          message: 'Erreur lors de la création de l\'entreprise.',
        }
      }

      // Créer le profil
      const { error: profileError } = await supabase.from('profiles').insert({
        id: userId,
        role: 'patron',
        entreprise_id: entrepriseData.id,
      })

      if (profileError) {
        return {
          success: false,
          message: 'Erreur lors de la création du profil.',
        }
      }

      // Redirection vers le dashboard patron
      redirect('/dashboard/patron')
    } else {
      // Rôle employé
      // Chercher l'entreprise avec le code
      const { data: entrepriseData, error: entrepriseError } = await supabase
        .from('entreprises')
        .select('id')
        .eq('code', companyCode)
        .single()

      if (entrepriseError || !entrepriseData) {
        return {
          success: false,
          message: 'Code entreprise invalide.',
        }
      }

      // Créer le profil
      const { error: profileError } = await supabase.from('profiles').insert({
        id: userId,
        role: 'employe',
        entreprise_id: entrepriseData.id,
      })

      if (profileError) {
        return {
          success: false,
          message: 'Erreur lors de la création du profil.',
        }
      }

      // Redirection vers le dashboard employé
      redirect('/dashboard/employe')
    }
  } catch (error) {
    console.error('Register error:', error)
    return {
      success: false,
      message: 'Une erreur inattendue est survenue.',
    }
  }
}

export async function loginUser(formData: FormData): Promise<AuthResult | never> {
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  // Validations
  if (!email || !password) {
    return {
      success: false,
      message: 'Veuillez remplir tous les champs.',
    }
  }

  try {
    const supabase = await createSupabaseServerClient()

    console.log('[Auth] Login attempt for email:', email)

    // Connexion
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })

    if (authError) {
      console.error('[Auth] Login error:', authError.message, authError.status)
      return {
        success: false,
        message: 'Email ou mot de passe incorrect.',
      }
    }

    if (!authData.user) {
      console.error('[Auth] Login success but no user data')
      return {
        success: false,
        message: 'Email ou mot de passe incorrect.',
      }
    }

    console.log('[Auth] Login success, user ID:', authData.user.id)

    // Récupérer le profil
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', authData.user.id)
      .single()

    if (profileError || !profile) {
      return {
        success: false,
        message: 'Profil utilisateur introuvable.',
      }
    }

    // Redirection selon le rôle
    if (profile.role === 'patron') {
      redirect('/dashboard/patron')
    } else if (profile.role === 'employe') {
      redirect('/dashboard/employe')
    } else {
      redirect('/login')
    }
  } catch (error) {
    console.error('Login error:', error)
    return {
      success: false,
      message: 'Une erreur inattendue est survenue.',
    }
  }
}

