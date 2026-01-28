import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createSupabaseServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    // Récupérer le profil pour rediriger vers le bon dashboard
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile) {
      if (profile.role === 'patron') {
        redirect('/dashboard/patron')
      } else if (profile.role === 'employe') {
        redirect('/dashboard/employe')
      }
    }
  }

  return <>{children}</>
}

