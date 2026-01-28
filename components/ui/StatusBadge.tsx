interface StatusBadgeProps {
  status: string | null | undefined
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  // Capitaliser une chaîne (pour fallback)
  const capitalize = (str: string): string => {
    return str
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ')
  }

  // Mapping des statuts vers leurs libellés
  const getStatusLabel = (status: string | null | undefined): string => {
    if (!status || !status.trim()) return 'Statut'
    const normalized = status.toLowerCase().trim()
    switch (normalized) {
      case 'en_cours':
        return 'En cours'
      case 'termine':
        return 'Terminé'
      case 'en_attente':
        return 'En attente'
      case 'a_facturer':
        return 'À facturer'
      default:
        // Fallback : capitaliser le statut brut
        return capitalize(status)
    }
  }

  // Couleur de la pastille selon le statut
  const getDotColor = (status: string | null | undefined): string => {
    if (!status || !status.trim()) return 'bg-gray-400'
    const normalized = status.toLowerCase().trim()
    switch (normalized) {
      case 'en_cours':
        return 'bg-blue-500'
      case 'termine':
        return 'bg-green-500'
      case 'en_attente':
        return 'bg-orange-500'
      case 'a_facturer':
        return 'bg-yellow-500'
      default:
        return 'bg-gray-400'
    }
  }

  const label = getStatusLabel(status)
  const dotColor = getDotColor(status)

  return (
    <span className="inline-flex items-center gap-2.5 px-4 py-2.5 rounded-full text-base md:text-sm font-semibold bg-gray-800/70 border border-gray-700/70 shadow-sm min-h-[36px]">
      <span className={`w-2.5 h-2.5 rounded-full ${dotColor} shadow-sm flex-shrink-0`}></span>
      <span className="text-white font-semibold leading-tight">{label}</span>
    </span>
  )
}

