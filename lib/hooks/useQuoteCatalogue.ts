import { useCallback } from 'react'

export interface DraftQuoteLine {
  id?: string
  description: string
  quantite: number
  unite: string
  prix_unitaire: number
}

const STORAGE_KEY = 'btp_pro_quote_catalogue'

export function useQuoteCatalogue() {
  const saveLinesAsModels = useCallback((lines: DraftQuoteLine[]) => {
    try {
      const existing = localStorage.getItem(STORAGE_KEY)
      const existingModels: DraftQuoteLine[] = existing ? JSON.parse(existing) : []

      // Ajouter les nouvelles lignes (sans les doublons exacts)
      const newModels = lines.filter(
        (line) =>
          line.description.trim() &&
          !existingModels.some(
            (existing) =>
              existing.description.toLowerCase() === line.description.toLowerCase() &&
              existing.prix_unitaire === line.prix_unitaire &&
              existing.unite === line.unite
          )
      )

      const updated = [...existingModels, ...newModels]

      // Limiter à 100 modèles pour éviter de surcharger localStorage
      const limited = updated.slice(-100)

      localStorage.setItem(STORAGE_KEY, JSON.stringify(limited))
    } catch (error) {
      console.error('Erreur lors de la sauvegarde du catalogue:', error)
    }
  }, [])

  const getSuggestions = useCallback((query: string): DraftQuoteLine[] => {
    if (!query.trim()) return []

    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (!stored) return []

      const models: DraftQuoteLine[] = JSON.parse(stored)
      const queryLower = query.toLowerCase()

      return models
        .filter((model) => model.description.toLowerCase().includes(queryLower))
        .slice(0, 5) // Limiter à 5 suggestions
    } catch (error) {
      console.error('Erreur lors de la lecture du catalogue:', error)
      return []
    }
  }, [])

  return {
    saveLinesAsModels,
    getSuggestions,
  }
}

