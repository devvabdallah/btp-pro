import { getAgendaEvents } from '@/lib/agenda-actions'
import AgendaClient from './AgendaClient'

export default async function AgendaPage() {
  const result = await getAgendaEvents()
  const events = result.success && result.events ? result.events : []

  return <AgendaClient events={events} />
}

