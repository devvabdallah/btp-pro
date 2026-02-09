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

  const result = await getAgendaEvents()
  const events = result.success && result.events ? result.events : []

  return <AgendaClient events={events} />
}

