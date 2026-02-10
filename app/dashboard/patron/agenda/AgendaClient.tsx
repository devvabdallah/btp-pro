'use client'

import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { AgendaEvent } from '@/lib/agenda-actions'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import Button from '@/components/ui/Button'
import CreateEventModal from './CreateEventModal'

interface AgendaClientProps {
  events?: AgendaEvent[]
  error?: string
}

export default function AgendaClient({ events: initialEvents = [], error }: AgendaClientProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [allEvents, setAllEvents] = useState<AgendaEvent[]>(initialEvents)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const pathname = usePathname()
  const role = pathname.includes('/patron/') ? 'patron' : 'employe'

  // Mode debug activé par URL
  const debug = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('debug') === '1'

  const loadEvents = async () => {
    try {
      setLoading(true)
      const supabase = createSupabaseBrowserClient()

      // Récupérer la session de façon robuste avec fallback
      let { data: sess } = await supabase.auth.getSession()
      
      if (!sess?.session) {
        await supabase.auth.refreshSession()
        sess = await supabase.auth.getSession()
      }

      if (!sess?.session) {
        console.warn('[Agenda] no session')
        setAllEvents([])
        setLoading(false)
        return
      }

      const userId = sess.session.user.id

      // En mode debug, charger tous les événements sans filtre
      if (debug) {
        const { data, error } = await supabase
          .from('agenda_events')
          .select('*')
          .order('starts_at', { ascending: true })
        
        console.log('[Agenda] select agenda_events', { count: data?.length ?? 0, error, sample: data?.[0] })
        setAllEvents(data ?? [])
        setLoading(false)
        return
      }

      // Charger les événements filtrés par user_id
      const { data, error } = await supabase
        .from('agenda_events')
        .select('*')
        .eq('user_id', userId)
        .order('starts_at', { ascending: true })

      if (error) {
        console.error('[Agenda] agenda_events select error', error)
        setAllEvents([])
      } else {
        setAllEvents(data ?? [])
      }
    } catch (err) {
      console.error('Error loading events:', err)
      setAllEvents([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadEvents()
  }, [])

  const handleSuccess = () => {
    loadEvents()
  }

  // Fonction timezone-safe pour comparer les dates locales
  const isSameLocalDay = (iso: string, ref: Date) => {
    const d = new Date(iso)
    return d.getFullYear() === ref.getFullYear()
      && d.getMonth() === ref.getMonth()
      && d.getDate() === ref.getDate()
  }

  // Séparer les événements en "Aujourd'hui" et "À venir"
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const now = new Date()

  const todayEvents: AgendaEvent[] = []
  const upcomingEvents: AgendaEvent[] = []

  allEvents.forEach((event) => {
    const eventDate = new Date(event.starts_at)
    if (isSameLocalDay(event.starts_at, today)) {
      todayEvents.push(event)
    } else if (eventDate >= now) {
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
      <div className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 rounded-xl border border-white/10 p-4 md:p-5 hover:bg-white/7 transition-colors shadow-lg shadow-black/20 bg-white/5">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0">
            <div className="text-2xl md:text-3xl font-semibold text-white">
              {formatTime(event.starts_at)}
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-base md:text-lg font-bold text-white mb-2 truncate">{event.title}</h3>
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <span className="text-sm text-gray-400">{duration} min</span>
              {hasChantier && (
                <>
                  <span className="text-gray-500">•</span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-white/10 text-white/80 border border-white/10">
                    Chantier
                  </span>
                  <span className="text-sm font-semibold text-white">
                    {event.chantiers.title}
                  </span>
                  {event.chantiers.client && (
                    <>
                      <span className="text-gray-500">•</span>
                      <span className="text-sm text-gray-400">
                        {event.chantiers.client.first_name} {event.chantiers.client.last_name}
                      </span>
                    </>
                  )}
                </>
              )}
              {event.notes && (
                <>
                  <span className="text-gray-500">•</span>
                  <span className="text-sm text-gray-400 truncate max-w-[200px]">{event.notes}</span>
                </>
              )}
            </div>
            {hasChantier && (
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/10">
                {hasAddress && (
                  <a
                    href={getGoogleMapsUrl(event.chantiers.address)}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="text-xs text-white/70 hover:text-white transition-colors"
                  >
                    Itinéraire
                  </a>
                )}
                {chantierUrl && (
                  <span className="text-xs text-white/70 ml-auto">Ouvrir</span>
                )}
              </div>
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

  // Afficher l'erreur si présente
  if (error) {
    return (
      <div className="space-y-8 md:space-y-10">
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6 md:p-8 text-center">
          <p className="text-red-300 mb-4">{error}</p>
          <Link href="/login">
            <Button variant="primary" size="md">
              Se reconnecter
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <>
      <CreateEventModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={handleSuccess}
      />
      <div className="space-y-8 md:space-y-10">
        {/* Bloc debug */}
        {debug && (
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 text-sm">
            <p className="text-yellow-300 font-semibold mb-2">Events total: {allEvents.length}</p>
            {allEvents.length > 0 && (
              <pre className="text-xs text-yellow-200 overflow-auto max-h-96 bg-black/20 p-3 rounded">
                {JSON.stringify(allEvents.slice(0, 10), null, 2)}
              </pre>
            )}
          </div>
        )}

        {/* Header */}
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 md:gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-4 flex-wrap">
                <h1 className="text-3xl md:text-5xl font-bold tracking-tight text-white">Agenda</h1>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10">
                  <span className="text-sm text-white/70">{formatTodayDate()}</span>
                  {todayEvents.length > 0 && (
                    <span className="text-sm font-semibold text-white">{todayEvents.length} rdv</span>
                  )}
                </div>
              </div>
              <p className="text-base text-white/70">Tes rendez-vous et chantiers, au clair.</p>
            </div>
            <div className="hidden md:block">
              <div className="flex flex-col items-end gap-1">
                <Button variant="primary" size="md" onClick={() => setIsModalOpen(true)}>
                  Nouveau rendez-vous
                </Button>
                <span className="text-xs text-white/50">2 clics — 1 minute</span>
              </div>
            </div>
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
          <div className="flex items-center justify-between mb-4 md:mb-6">
            <h2 className="text-xl md:text-2xl font-bold text-white">Aujourd'hui</h2>
            <span className="text-sm text-white/50">{formatTodayDate()}</span>
          </div>
          {todayEvents.length > 0 ? (
            <div className="space-y-3">
              {todayEvents.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
          ) : (
            <div className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 rounded-xl border border-white/10 p-8 md:p-10 text-center shadow-lg shadow-black/20 bg-white/5">
              <p className="text-gray-400 mb-2">Rien aujourd'hui. Tu peux ajouter un rendez-vous.</p>
            </div>
          )}
        </div>

        {/* Section À venir */}
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-white mb-4 md:mb-6">À venir</h2>
          {upcomingEvents.length > 0 ? (
            <div className="space-y-6">
              {Object.entries(upcomingGroups)
                .sort(([dateA], [dateB]) => new Date(dateA).getTime() - new Date(dateB).getTime())
                .map(([dateKey, events], index) => (
                  <div key={dateKey}>
                    {index > 0 && <div className="h-px bg-white/10 mb-6"></div>}
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
            <div className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 rounded-xl border border-white/10 p-8 md:p-10 text-center shadow-lg shadow-black/20 bg-white/5">
              <p className="text-gray-400 mb-2">Aucun rendez-vous prévu.</p>
            </div>
          )}
        </div>

        {/* Liste brute de debug si les sections filtrées sont vides mais qu'il y a des événements */}
        {!loading && allEvents.length > 0 && todayEvents.length === 0 && upcomingEvents.length === 0 && (
          <div className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 rounded-xl border border-white/10 p-8 md:p-10 shadow-lg shadow-black/20 bg-white/5">
            <h3 className="text-lg font-semibold text-white mb-4">Rendez-vous (debug)</h3>
            <div className="space-y-2">
              {allEvents.map((event) => (
                <div key={event.id} className="text-sm text-gray-300 border-b border-white/10 pb-2">
                  <span className="font-medium">{event.title}</span>
                  <span className="text-gray-500 ml-2">
                    {new Date(event.starts_at).toLocaleString('fr-FR', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* État vide global */}
        {!loading && allEvents.length === 0 && todayEvents.length === 0 && upcomingEvents.length === 0 && (
          <div className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 rounded-xl border border-white/10 p-12 md:p-16 text-center shadow-lg shadow-black/20 bg-white/5">
            <p className="text-gray-400 mb-6">Aucun rendez-vous prévu.</p>
            <Button variant="primary" size="md" onClick={() => setIsModalOpen(true)}>
              + Ajouter un rendez-vous
            </Button>
          </div>
        )}

        {/* État de chargement */}
        {loading && (
          <div className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 rounded-xl border border-white/10 p-12 md:p-16 text-center shadow-lg shadow-black/20 bg-white/5">
            <p className="text-gray-400">Chargement des rendez-vous...</p>
          </div>
        )}

        {/* Spacer pour le bouton sticky mobile */}
        <div className="md:hidden h-20"></div>
      </div>
    </>
  )
}
