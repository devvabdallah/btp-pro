// Liste des métiers autorisés avec leurs emojis et libellés
export const CHANTIER_TRADES = [
  { value: 'plomberie', emoji: '🛠️', label: 'Plomberie' },
  { value: 'electricite', emoji: '⚡', label: 'Électricité' },
  { value: 'macon', emoji: '🧱', label: 'Maçonnerie' },
  { value: 'enduiseur', emoji: '🧴', label: 'Enduit / Façade' },
  { value: 'carreleur', emoji: '🧩', label: 'Carrelage' },
  { value: 'charpentier', emoji: '🪚', label: 'Charpente' },
  { value: 'chauffagiste', emoji: '🔥', label: 'Chauffage' },
  { value: 'couvreur', emoji: '🏠', label: 'Couverture' },
  { value: 'menuisier', emoji: '🪵', label: 'Menuiserie' },
  { value: 'peintre', emoji: '🎨', label: 'Peinture' },
  { value: 'autre', emoji: '🔧', label: 'Autre' },
] as const

export type TradeValue = typeof CHANTIER_TRADES[number]['value']

// Fonction pour obtenir l'emoji et le libellé d'un métier
export function getTradeDisplay(trade: string | null | undefined): { emoji: string; label: string } {
  if (!trade) {
    return { emoji: '🔧', label: 'Autre' }
  }
  const tradeObj = CHANTIER_TRADES.find((t) => t.value === trade)
  return tradeObj || { emoji: '🔧', label: 'Autre' }
}

// Fonction pour obtenir le libellé complet avec emoji
export function getTradeLabel(trade: string | null | undefined): string {
  const { emoji, label } = getTradeDisplay(trade)
  return `${emoji} ${label}`
}

