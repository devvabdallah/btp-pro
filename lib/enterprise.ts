/**
 * Génère un code entreprise à 6 chiffres
 * @returns Un code à 6 chiffres (ex: "123456")
 */
export function generateEntrepriseCode(): string {
  return String(Math.floor(Math.random() * 1000000)).padStart(6, '0')
}

