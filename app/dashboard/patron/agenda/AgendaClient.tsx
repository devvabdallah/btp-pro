'use client'

import Link from 'next/link'
import { AgendaEvent } from '@/lib/agenda-actions'
import Button from '@/components/ui/Button'

interface AgendaClientProps {
  events: AgendaEvent[]
}

export default function AgendaClient({ events }: AgendaClientProps) {
  // Grouper les événements par jour
  const groupedEvents = () => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)
    const in7Days = new Date(today)
    in7Days.setDate(in7Days.getDate() + 7)

    const todayEvents: AgendaEvent[] = []
    const tomorrowEvents: AgendaEvent[] = []
    const weekEvents: AgendaEvent[] = []

    events.forEach((event) => {
      const eventDate = new Date(event.starts_at)
      eventDate.setHours(0, 0, 0, 0)

      if (eventDate.getTime() === today.getTime()) {
        todayEvents.push(event)
      } else if (eventDate.getTime() === tomorrow.getTime()) {
        tomorrowEvents.push(event)
      } else if (eventDate < in7Days) {
        weekEvents.push(event)
      }
    })

    return { todayEvents, tomorrowEvents, weekEvents }
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
  }

  const getStatusBadge = (status: string) => {
    const styles = {
      planned: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
      confirmed: 'bg-green-500/20 text-green-300 border-green-500/30',
      completed: 'bg-gray-500/20 text-gray-300 border-gray-500/30',
      cancelled: 'bg-red-500/20 text-red-300 border-red-500/30',
    }
    const labels = {
      planned: 'Prévu',
      confirmed: 'Confirmé',
      completed: 'Terminé',
      cancelled: 'Annulé',
    }
    return (
      <span className={`px-2.5 py-1 rounded-lg text-xs font-medium border ${styles[status as keyof typeof styles] || styles.planned}`}>
        {labels[status as keyof typeof labels] || status}
      </span>
    )
  }

  const { todayEvents, tomorrowEvents, weekEvents } = groupedEvents()

  return (
    <div className="space-y-10 md:space-y-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
        <h1 className="text-3xl md:text-5xl font-bold tracking-tight text-white">Agenda</h1>
        <Link href="/dashboard/patron/agenda/nouveau">
          <Button variant="primary" size="md">
            + Ajouter
          </Button>
        </Link>
      </div>

      {/* Aujourd'hui */}
      {todayEvents.length > 0 && (
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-white mb-4 md:mb-6">Aujourd'hui</h2>
          <div className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 rounded-xl border border-white/10 divide-y divide-white/10 overflow-hidden">
            {todayEvents.map((event) => (
              <div key={event.id} className="p-4 md:p-6 hover:bg-white/5 transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-sm md:text-base font-semibold text-white">{formatTime(event.starts_at)}</span>
                      <h3 className="text-base md:text-lg font-semibold text-white">{event.title}</h3>
                    </div>
                    {event.chantiers && (
                      <div className="mb-2">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-orange-500/20 text-orange-300 border border-orange-500/30">
                          {event.chantiers.title}
                        </span>
                      </div>
                    )}
                    {event.notes && (
                      <p className="text-sm text-gray-400 mt-2">{event.notes}</p>
                    )}
                  </div>
                  <div className="flex-shrink-0">
                    {getStatusBadge(event.status)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Demain */}
      {tomorrowEvents.length > 0 && (
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-white mb-4 md:mb-6">Demain</h2>
          <div className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 rounded-xl border border-white/10 divide-y divide-white/10 overflow-hidden">
            {tomorrowEvents.map((event) => (
              <div key={event.id} className="p-4 md:p-6 hover:bg-white/5 transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-sm md:text-base font-semibold text-white">{formatTime(event.starts_at)}</span>
                      <h3 className="text-base md:text-lg font-semibold text-white">{event.title}</h3>
                    </div>
                    {event.chantiers && (
                      <div className="mb-2">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-orange-500/20 text-orange-300 border border-orange-500/30">
                          {event.chantiers.title}
                        </span>
                      </div>
                    )}
                    {event.notes && (
                      <p className="text-sm text-gray-400 mt-2">{event.notes}</p>
                    )}
                  </div>
                  <div className="flex-shrink-0">
                    {getStatusBadge(event.status)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Cette semaine */}
      {weekEvents.length > 0 && (
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-white mb-4 md:mb-6">Cette semaine</h2>
          <div className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 rounded-xl border border-white/10 divide-y divide-white/10 overflow-hidden">
            {weekEvents.map((event) => (
              <div key={event.id} className="p-4 md:p-6 hover:bg-white/5 transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                      <span className="text-sm md:text-base font-semibold text-white">{formatTime(event.starts_at)}</span>
                      <span className="text-xs text-gray-400">{formatDate(event.starts_at)}</span>
                      <h3 className="text-base md:text-lg font-semibold text-white">{event.title}</h3>
                    </div>
                    {event.chantiers && (
                      <div className="mb-2">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-orange-500/20 text-orange-300 border border-orange-500/30">
                          {event.chantiers.title}
                        </span>
                      </div>
                    )}
                    {event.notes && (
                      <p className="text-sm text-gray-400 mt-2">{event.notes}</p>
                    )}
                  </div>
                  <div className="flex-shrink-0">
                    {getStatusBadge(event.status)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* État vide */}
      {events.length === 0 && (
        <div className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 rounded-xl border border-white/10 p-12 md:p-16 text-center">
          <p className="text-gray-400 mb-6">Aucun événement prévu pour les 7 prochains jours.</p>
          <Link href="/dashboard/patron/agenda/nouveau">
            <Button variant="primary" size="md">
              + Ajouter un événement
            </Button>
          </Link>
        </div>
      )}
    </div>
  )
}
