import { redirect } from 'next/navigation'
import { createSupabaseServer } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = createSupabaseServer()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  // Pas de session: laisser passer (afficher login/register)
  if (userError || !user) {
    return <>{children}</>
  }

  // Session trouvée: vérifier le profil
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  // Profil manquant: rediriger vers login avec erreur
  if (profileError || !profile) {
    redirect('/login?error=profile_missing')
  }

  // Profil OK: rediriger vers le bon dashboard
  if (profile.role === 'patron') {
    redirect('/dashboard/patron')
  } else if (profile.role === 'employe') {
    redirect('/dashboard/employe')
  }

  // Rôle inconnu: rediriger vers patron par défaut
  redirect('/dashboard/patron')
}

