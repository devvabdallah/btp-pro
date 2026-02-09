'use client'

import { useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { AgendaEvent } from '@/lib/agenda-actions'
import Button from '@/components/ui/Button'
import CreateEventModal from './CreateEventModal'

interface AgendaClientProps {
  events: AgendaEvent[]
}

export default function AgendaClient({ events: initialEvents }: AgendaClientProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const router = useRouter()
  const pathname = usePathname()
  const role = pathname.includes('/patron/') ? 'patron' : 'employe'

  const handleSuccess = () => {
    router.refresh()
  }

  // Séparer les événements en "Aujourd'hui" et "Prochains"
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const endOfToday = new Date(today)
  endOfToday.setHours(23, 59, 59, 999)

  const todayEvents: AgendaEvent[] = []
  const upcomingEvents: AgendaEvent[] = []

  initialEvents.forEach((event) => {
    const eventDate = new Date(event.starts_at)
    if (eventDate >= today && eventDate <= endOfToday) {
      todayEvents.push(event)
    } else if (eventDate > endOfToday) {
      upcomingEvents.push(event)
    }
  })

  // Formater l'heure
  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    return new Intl.DateTimeFormat('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(date)
  }

  // Formater la date pour les headers (ex: "lun. 10 févr.")
  const formatDateHeader = (dateString: string) => {
    const date = new Date(dateString)
    return new Intl.DateTimeFormat('fr-FR', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    }).format(date)
  }

  // Formater la date du jour (ex: "Lun. 10 fév.")
  const formatTodayDate = () => {
    return new Intl.DateTimeFormat('fr-FR', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    }).format(today)
  }

  // Calculer la durée en minutes
  const getDuration = (startsAt: string, endsAt: string) => {
    const start = new Date(startsAt)
    const end = new Date(endsAt)
    const diffMs = end.getTime() - start.getTime()
    const diffMins = Math.round(diffMs / (1000 * 60))
    return diffMins
  }

  // Grouper les événements à venir par date
  const groupedByDate = () => {
    const groups: { [key: string]: AgendaEvent[] } = {}
    upcomingEvents.forEach((event) => {
      const dateKey = new Date(event.starts_at).toDateString()
      if (!groups[dateKey]) {
        groups[dateKey] = []
      }
      groups[dateKey].push(event)
    })
    return groups
  }

  const upcomingGroups = groupedByDate()

  // Fonction pour obtenir l'URL Google Maps
  const getGoogleMapsUrl = (address: string | null | undefined): string => {
    if (!address) return ''
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`
  }

  // Composant EventCard local
  const EventCard = ({ event }: { event: AgendaEvent }) => {
    const duration = getDuration(event.starts_at, event.ends_at)
    const hasChantier = event.chantiers && event.chantiers.id
    const chantierUrl = hasChantier ? `/dashboard/${role}/chantiers/${event.chantiers.id}` : null
    const hasAddress = event.chantiers?.address

    const cardContent = (
      <div className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 rounded-xl border border-white/10 p-4 md:p-5 hover:bg-white/5 transition-colors shadow-lg shadow-black/20">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0">
            <div className="text-2xl md:text-3xl font-bold text-white">
              {formatTime(event.starts_at)}
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-base md:text-lg font-bold text-white mb-2">{event.title}</h3>
            <div className="flex items-center gap-3 flex-wrap mb-2">
              <span className="text-sm text-gray-400">{duration} min</span>
              {hasChantier && (
                <>
                  <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-orange-500/20 text-orange-300 border border-orange-500/30">
                    Chantier
                  </span>
                  <span className="text-sm font-semibold text-white/90">
                    {event.chantiers.title}
                  </span>
                  {event.chantiers.client && (
                    <span className="text-sm text-gray-400">
                      {event.chantiers.client.first_name} {event.chantiers.client.last_name}
                    </span>
                  )}
                  {hasAddress && (
                    <a
                      href={getGoogleMapsUrl(event.chantiers.address)}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="text-xs text-orange-400 hover:text-orange-300 transition-colors inline-flex items-center gap-1"
                    >
                      <span>📍</span>
                      <span>Itinéraire</span>
                    </a>
                  )}
                </>
              )}
            </div>
            {event.notes && (
              <p className="text-sm text-gray-400 mt-2 truncate">{event.notes}</p>
            )}
          </div>
        </div>
      </div>
    )

    if (chantierUrl) {
      return (
        <Link href={chantierUrl} className="block">
          {cardContent}
        </Link>
      )
    }

    return cardContent
  }

  return (
    <>
      <CreateEventModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={handleSuccess}
      />
      <div className="space-y-8 md:space-y-10">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 md:gap-6">
          <div className="flex items-center gap-4">
            <h1 className="text-3xl md:text-5xl font-bold tracking-tight text-white">Agenda</h1>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10">
              <span className="text-sm text-white/70">{formatTodayDate()}</span>
              {todayEvents.length > 0 && (
                <span className="text-sm font-semibold text-white">{todayEvents.length} rdv</span>
              )}
            </div>
          </div>
          <div className="hidden md:block">
            <Button variant="primary" size="md" onClick={() => setIsModalOpen(true)}>
              Nouveau rendez-vous
            </Button>
          </div>
        </div>

        {/* CTA Mobile Sticky */}
        <div className="md:hidden fixed bottom-6 left-4 right-4 z-40">
          <Button
            variant="primary"
            size="lg"
            onClick={() => setIsModalOpen(true)}
            className="w-full shadow-xl shadow-orange-500/30"
          >
            Nouveau rendez-vous
          </Button>
        </div>

        {/* Section Aujourd'hui */}
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-white mb-4 md:mb-6">Aujourd'hui</h2>
          {todayEvents.length > 0 ? (
            <div className="space-y-3">
              {todayEvents.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
          ) : (
            <div className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 rounded-xl border border-white/10 p-8 md:p-10 text-center shadow-lg shadow-black/20">
              <p className="text-gray-400 mb-2">Rien aujourd'hui. Ajoute un rendez-vous pour t'organiser.</p>
            </div>
          )}
        </div>

        {/* Section Prochains */}
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-white mb-4 md:mb-6">Prochains</h2>
          {upcomingEvents.length > 0 ? (
            <div className="space-y-6">
              {Object.entries(upcomingGroups)
                .sort(([dateA], [dateB]) => new Date(dateA).getTime() - new Date(dateB).getTime())
                .map(([dateKey, events]) => (
                  <div key={dateKey}>
                    <div className="flex items-center gap-3 mb-4">
                      <h3 className="text-base md:text-lg font-semibold text-white/70">
                        {formatDateHeader(events[0].starts_at)}
                      </h3>
                      <div className="flex-1 h-px bg-white/10"></div>
                    </div>
                    <div className="space-y-3">
                      {events.map((event) => (
                        <EventCard key={event.id} event={event} />
                      ))}
                    </div>
                  </div>
                ))}
            </div>
          ) : (
            <div className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 rounded-xl border border-white/10 p-8 md:p-10 text-center shadow-lg shadow-black/20">
              <p className="text-gray-400 mb-2">Aucun rendez-vous à venir.</p>
            </div>
          )}
        </div>

        {/* État vide global */}
        {initialEvents.length === 0 && todayEvents.length === 0 && upcomingEvents.length === 0 && (
          <div className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 rounded-xl border border-white/10 p-12 md:p-16 text-center shadow-lg shadow-black/20">
            <p className="text-gray-400 mb-6">Aucun rendez-vous prévu.</p>
            <Button variant="primary" size="md" onClick={() => setIsModalOpen(true)}>
              + Ajouter un rendez-vous
            </Button>
          </div>
        )}

        {/* Spacer pour le bouton sticky mobile */}
        <div className="md:hidden h-20"></div>
      </div>
    </>
  )
}
