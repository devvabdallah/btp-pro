import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getAgendaEvents, AgendaEvent } from '@/lib/agenda-actions'
import AgendaClient from './AgendaClient'

export default async function AgendaPage() {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Récupérer le profil pour obtenir entreprise_id
  const { data: profile } = await supabase
    .from('profiles')
    .select('entreprise_id')
    .eq('id', user.id)
    .single()

  if (!profile?.entreprise_id) {
    redirect('/login')
  }

  // Vérifier que l'entreprise est active (même logique que middleware)
  const bypassEnabled = process.env.NEXT_PUBLIC_BTPPRO_BYPASS_SUBSCRIPTION === 'true'
  const adminBypassEnabled = process.env.NEXT_PUBLIC_BTPPRO_ADMIN_BYPASS_SUBSCRIPTION === 'true'
  
  if (!bypassEnabled) {
    if (adminBypassEnabled && user.email === 'abdallah.gabonn@gmail.com') {
      // Bypass admin activé
    } else {
      // Appeler le RPC is_company_active
      const { data: isActive, error } = await supabase.rpc('is_company_active', {
        p_entreprise_id: profile.entreprise_id,
      })

      if (!error && (isActive === null || isActive === undefined || !isActive)) {
        redirect('/abonnement-expire')
      }
    }
  }

  const result = await getAgendaEvents()
  const events = result.success && result.events ? result.events : []

  return <AgendaClient events={events} />
}
