'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import ErrorMessage from '@/components/ui/ErrorMessage'
import { useQuoteCatalogue } from '@/lib/hooks/useQuoteCatalogue'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'

interface DraftQuoteLine {
  id: string
  description: string
  quantite: number
  unite: string
  prix_unitaire: number
}

export default function NouveauDevisPage() {
  const router = useRouter()
  const { saveLinesAsModels, getSuggestions } = useQuoteCatalogue()
  const [error, setError] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [isCompanyActive, setIsCompanyActive] = useState<boolean | null>(null)

  const [clientName, setClientName] = useState('')
  const [clientContact, setClientContact] = useState('')
  const [chantierName, setChantierName] = useState('')
  const [description, setDescription] = useState('')
  const [lines, setLines] = useState<DraftQuoteLine[]>([])
  const [tva, setTva] = useState(20)

  // Fonction stub pour générer des lignes depuis la description
  function generateDraftLinesFromDescription(description: string): DraftQuoteLine[] {
    const baseLines: DraftQuoteLine[] = [
      {
        id: crypto.randomUUID(),
        description: 'Préparation du chantier et protection des surfaces',
        quantite: 1,
        unite: 'lot',
        prix_unitaire: 0,
      },
      {
        id: crypto.randomUUID(),
        description: 'Fourniture et pose de matériaux',
        quantite: 1,
        unite: 'lot',
        prix_unitaire: 0,
      },
      {
        id: crypto.randomUUID(),
        description: 'Travaux de finition',
        quantite: 1,
        unite: 'lot',
        prix_unitaire: 0,
      },
      {
        id: crypto.randomUUID(),
        description: 'Nettoyage de fin de chantier',
        quantite: 1,
        unite: 'lot',
        prix_unitaire: 0,
      },
    ]

    // Si la description contient certains mots-clés, adapter les lignes
    const descLower = description.toLowerCase()
    if (descLower.includes('peinture')) {
      baseLines[1].description = 'Fourniture et application de peinture'
    }
    if (descLower.includes('plomberie')) {
      baseLines[1].description = 'Fourniture et pose de plomberie'
    }
    if (descLower.includes('électricité')) {
      baseLines[1].description = 'Fourniture et pose d\'électricité'
    }

    return baseLines
  }

  const handleGenerateLines = () => {
    if (!description.trim()) {
      setError('Veuillez saisir une description du chantier.')
      return
    }

    const generatedLines = generateDraftLinesFromDescription(description)
    setLines(generatedLines)
    setError('')
  }

  const addLine = () => {
    setLines([
      ...lines,
      {
        id: crypto.randomUUID(),
        description: '',
        quantite: 1,
        unite: 'pièce',
        prix_unitaire: 0,
      },
    ])
  }

  const removeLine = (id: string) => {
    setLines(lines.filter((line) => line.id !== id))
  }

  const updateLine = (id: string, field: keyof DraftQuoteLine, value: string | number) => {
    setLines(
      lines.map((line) =>
        line.id === id ? { ...line, [field]: value } : line
      )
    )
  }

  const getLineTotal = (line: DraftQuoteLine) => {
    return line.quantite * line.prix_unitaire
  }

  const getTotalHT = () => {
    return lines.reduce((sum, line) => sum + getLineTotal(line), 0)
  }

  const getTotalTTC = () => {
    return getTotalHT() * (1 + tva / 100)
  }

  // Vérifier le statut de l'entreprise au chargement
  useEffect(() => {
    async function checkCompanyStatus() {
      try {
        const supabase = createSupabaseBrowserClient()
        
        // Récupérer l'utilisateur
        const { data: { user }, error: userError } = await supabase.auth.getUser()
        
        if (userError || !user) {
          setIsCompanyActive(null)
          return
        }

        // Lire profiles.entreprise_id
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('entreprise_id')
          .eq('id', user.id)
          .single()

        if (profileError || !profile || !profile.entreprise_id) {
          setIsCompanyActive(null)
          return
        }

        // Appeler RPC is_company_active
        const { data: isActive, error: activeError } = await supabase
          .rpc('is_company_active', { entreprise_id: profile.entreprise_id })

        if (!activeError && isActive !== null && isActive !== undefined) {
          setIsCompanyActive(Boolean(isActive))
        } else {
          // Si erreur => laisser null (ne pas bloquer)
          setIsCompanyActive(null)
        }
      } catch (err) {
        // En cas d'erreur, laisser null (comportement par défaut)
        setIsCompanyActive(null)
      }
    }

    checkCompanyStatus()
  }, [])

  const handleSave = async () => {
    setLoading(true)
    setError('')

    try {
      const supabase = createSupabaseBrowserClient()

      // 1. Récupérer l'utilisateur connecté
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      
      if (userError || !user) {
        setError('Utilisateur non connecté')
        setLoading(false)
        return
      }

      // 2. Récupérer le profil pour obtenir entreprise_id
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('entreprise_id')
        .eq('id', user.id)
        .single()

      if (profileError || !profile || !profile.entreprise_id) {
        const errorMsg = profileError?.message || 'Profil introuvable'
        setError(`Erreur: ${errorMsg}`)
        console.error('Profile error:', {
          context: 'create_quote',
          message: profileError?.message,
          details: profileError?.details,
          hint: profileError?.hint,
          code: profileError?.code
        })
        setLoading(false)
        return
      }

      // 2.5 Vérifier si l'entreprise est active (abonnement/essai)
      const { data: isActive, error: activeError } = await supabase
        .rpc('is_company_active', { entreprise_id: profile.entreprise_id })

      if (activeError) {
        console.error('[create_quote] RPC is_company_active error:', activeError)
        setError("Impossible de vérifier l'abonnement. Réessayez.")
        setLoading(false)
        return
      }

      if (!isActive) {
        setError("Votre essai est expiré. Abonnez-vous pour continuer.")
        setLoading(false)
        router.push('/dashboard/patron/abonnement')
        return
      }

      // 3. Préparer le payload
      const totalHT = getTotalHT()
      const payload = {
        entreprise_id: profile.entreprise_id,
        title: chantierName.trim() || 'Devis sans titre',
        client: clientName.trim(),
        contact: clientContact.trim() || null,
        description: description.trim() || null,
        amount_ht: totalHT,
        status: 'brouillon' as const
      }

      console.log('QUOTE PAYLOAD', payload)

      // 4. Insérer dans la table quotes
      const { data, error: insertError } = await supabase
        .from('quotes')
        .insert(payload)
        .select('id')
        .single()

      if (insertError) {
        const errorMsg = insertError.message + (insertError.details ? ` - ${insertError.details}` : '')
        setError(errorMsg)
        console.error({
          context: 'create_quote',
          message: insertError.message,
          details: insertError.details,
          hint: insertError.hint,
          code: insertError.code
        })
        setLoading(false)
        return
      }

      // 5. Insérer les lignes dans quote_lines
      if (lines.length > 0) {
        // Filtrer les lignes vides (description vide) et construire le payload
        const linesPayload = lines
          .filter((line) => line.description.trim() !== '')
          .map((line) => ({
            quote_id: data.id,
            description: line.description.trim(),
            quantity: line.quantite,
            unit: line.unite,
            unit_price_ht: line.prix_unitaire,
            total_ht: line.quantite * line.prix_unitaire
          }))

        // Insérer les lignes seulement s'il y en a
        if (linesPayload.length > 0) {
          const { error: linesError } = await supabase
            .from('quote_lines')
            .insert(linesPayload)

          if (linesError) {
            const errorMsg = linesError.message + (linesError.details ? ` - ${linesError.details}` : '')
            setError(`Erreur enregistrement lignes: ${errorMsg}`)
            console.error({
              context: 'create_quote_lines',
              message: linesError.message,
              details: linesError.details,
              hint: linesError.hint,
              code: linesError.code
            })
            setLoading(false)
            return
          }
        }
      }

      // 6. Succès
      console.log('QUOTE CREATED', data)

      // Sauvegarder dans le catalogue (conservé pour compatibilité)
      saveLinesAsModels(lines)

      // Rediriger vers la liste des devis
      router.push('/dashboard/patron/devis')
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Une erreur inattendue est survenue'
      setError(errorMsg)
      console.error('Unexpected error in handleSave:', err)
      setLoading(false)
    }
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-4xl md:text-5xl font-bold text-white mb-2">Créer un devis</h1>
        <p className="text-gray-400">Remplissez les informations pour créer un nouveau devis.</p>
      </div>

      <div className="space-y-8">
        {/* Informations de base */}
        <div className="bg-[#1a1f3a] rounded-3xl p-6 md:p-8 border border-[#2a2f4a]">
          <h2 className="text-2xl font-bold text-white mb-6">Informations de base</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input
              label="Nom du client"
              type="text"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              required
              placeholder="Nom complet"
            />
            <Input
              label="Contact client (optionnel)"
              type="text"
              value={clientContact}
              onChange={(e) => setClientContact(e.target.value)}
              placeholder="Téléphone ou email"
            />
            <div className="md:col-span-2">
              <Input
                label="Nom du chantier"
                type="text"
                value={chantierName}
                onChange={(e) => setChantierName(e.target.value)}
                required
                placeholder="Ex: Rénovation salle de bain"
              />
            </div>
          </div>
        </div>

        {/* Description du chantier */}
        <div className="bg-[#1a1f3a] rounded-3xl p-6 md:p-8 border border-[#2a2f4a]">
          <h2 className="text-2xl font-bold text-white mb-4">Description du chantier</h2>
          <textarea
            className="w-full px-4 py-3 bg-[#0f1429] border border-gray-600 rounded-2xl text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent transition-all resize-none mb-4"
            rows={5}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Décrivez les travaux à réaliser..."
          />
          <Button
            type="button"
            variant="primary"
            size="lg"
            onClick={handleGenerateLines}
            disabled={!description.trim()}
          >
            Préparer mon devis automatiquement
          </Button>
        </div>

        {/* Lignes de devis */}
        {lines.length > 0 && (
          <div className="bg-[#1a1f3a] rounded-3xl p-6 md:p-8 border border-[#2a2f4a]">
            <div className="mb-4">
              <p className="text-gray-300 text-sm mb-6">
                Ce devis est automatiquement pré-rempli pour vous faire gagner du temps. Vous pouvez ajuster librement les quantités et les prix avant validation.
              </p>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-white">Lignes de devis</h2>
                <Button type="button" variant="secondary" size="sm" onClick={addLine}>
                  + Ajouter une ligne
                </Button>
              </div>
            </div>

            <div className="space-y-4">
              {lines.map((line, index) => (
                <div
                  key={line.id}
                  className="bg-[#0f1429] rounded-2xl p-4 border border-[#2a2f4a]"
                >
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
                    <div className="md:col-span-5">
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Description
                      </label>
                      <input
                        type="text"
                        value={line.description}
                        onChange={(e) => {
                          updateLine(line.id, 'description', e.target.value)
                          // TODO: Afficher suggestions si getSuggestions retourne des résultats
                        }}
                        className="w-full px-4 py-2 bg-[#020617] border border-gray-600 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-yellow-400"
                        placeholder="Description de la tâche"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Quantité
                      </label>
                      <input
                        type="number"
                        value={line.quantite}
                        onChange={(e) => updateLine(line.id, 'quantite', parseFloat(e.target.value) || 0)}
                        className="w-full px-4 py-2 bg-[#020617] border border-gray-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-yellow-400"
                        min="0"
                        step="0.01"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Unité
                      </label>
                      <input
                        type="text"
                        value={line.unite}
                        onChange={(e) => updateLine(line.id, 'unite', e.target.value)}
                        className="w-full px-4 py-2 bg-[#020617] border border-gray-600 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-yellow-400"
                        placeholder="m, pièce, heure..."
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Prix unitaire (€)
                      </label>
                      <input
                        type="number"
                        value={line.prix_unitaire}
                        onChange={(e) => updateLine(line.id, 'prix_unitaire', parseFloat(e.target.value) || 0)}
                        className="w-full px-4 py-2 bg-[#020617] border border-gray-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-yellow-400"
                        min="0"
                        step="0.01"
                      />
                    </div>
                    <div className="md:col-span-1 flex items-end">
                      <button
                        type="button"
                        onClick={() => removeLine(line.id)}
                        className="text-red-400 hover:text-red-300 p-2"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                  <div className="mt-2 text-right">
                    <span className="text-gray-400 text-sm">Total ligne: </span>
                    <span className="text-white font-semibold">
                      {new Intl.NumberFormat('fr-FR', {
                        style: 'currency',
                        currency: 'EUR',
                      }).format(getLineTotal(line))}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Résumé */}
        {lines.length > 0 && (
          <div className="bg-[#1a1f3a] rounded-3xl p-6 md:p-8 border border-[#2a2f4a]">
            <h2 className="text-2xl font-bold text-white mb-6">Résumé</h2>
            <div className="space-y-4">
              <div className="flex justify-between text-gray-300">
                <span>Total HT:</span>
                <span className="text-white font-semibold text-lg">
                  {new Intl.NumberFormat('fr-FR', {
                    style: 'currency',
                    currency: 'EUR',
                  }).format(getTotalHT())}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <label className="text-gray-300">TVA (%):</label>
                  <input
                    type="number"
                    value={tva}
                    onChange={(e) => setTva(parseFloat(e.target.value) || 0)}
                    className="w-20 px-3 py-1 bg-[#0f1429] border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-yellow-400"
                    min="0"
                    max="100"
                  />
                </div>
                <span className="text-gray-400 text-sm">
                  TVA: {new Intl.NumberFormat('fr-FR', {
                    style: 'currency',
                    currency: 'EUR',
                  }).format(getTotalHT() * (tva / 100))}
                </span>
              </div>
              <div className="flex justify-between text-xl font-bold text-white pt-4 border-t border-[#2a2f4a]">
                <span>Total TTC:</span>
                <span>
                  {new Intl.NumberFormat('fr-FR', {
                    style: 'currency',
                    currency: 'EUR',
                  }).format(getTotalTTC())}
                </span>
              </div>
            </div>
          </div>
        )}

        <ErrorMessage message={error} />

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex flex-col">
            <Button
              type="button"
              variant="primary"
              size="lg"
              onClick={handleSave}
              disabled={loading || lines.length === 0 || isCompanyActive === false}
              className="w-full sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Enregistrement...' : 'Enregistrer le devis'}
            </Button>
            {isCompanyActive === false && (
              <p className="mt-2 text-sm text-red-300">
                Essai expiré : abonnez-vous pour créer de nouveaux devis.
              </p>
            )}
          </div>
          <Link href="/dashboard/patron" className="w-full sm:w-auto">
            <Button type="button" variant="secondary" size="lg" className="w-full sm:w-auto">
              Annuler
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}

