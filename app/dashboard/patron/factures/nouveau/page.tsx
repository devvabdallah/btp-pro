'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import ErrorMessage from '@/components/ui/ErrorMessage'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'

interface DraftInvoiceLine {
  id: string
  description: string
  quantity: number
  unit: string
  unit_price_ht: number
}

export default function NouvelleFacturePage() {
  const router = useRouter()
  const [error, setError] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [isCompanyActive, setIsCompanyActive] = useState<boolean | null>(null)

  const [title, setTitle] = useState('')
  const [clientName, setClientName] = useState('')
  const [clientContact, setClientContact] = useState('')
  const [clientAddressLine1, setClientAddressLine1] = useState('')
  const [clientAddressLine2, setClientAddressLine2] = useState('')
  const [clientPostalCode, setClientPostalCode] = useState('')
  const [clientCity, setClientCity] = useState('')
  const [description, setDescription] = useState('')
  const [lines, setLines] = useState<DraftInvoiceLine[]>([])
  const [tva, setTva] = useState(20)

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

        // Utiliser la fonction centrale avec bypass admin
        const { checkCompanyActive } = await import('@/lib/subscription-check')
        const { active } = await checkCompanyActive(supabase, profile.entreprise_id)
        setIsCompanyActive(active)
      } catch (err) {
        // En cas d'erreur, laisser null (comportement par défaut)
        setIsCompanyActive(null)
      }
    }

    checkCompanyStatus()
  }, [])

  const addLine = () => {
    setLines([
      ...lines,
      {
        id: crypto.randomUUID(),
        description: '',
        quantity: 1,
        unit: 'pièce',
        unit_price_ht: 0,
      },
    ])
  }

  const removeLine = (id: string) => {
    setLines(lines.filter((line) => line.id !== id))
  }

  const updateLine = (id: string, field: keyof DraftInvoiceLine, value: string | number) => {
    setLines(
      lines.map((line) =>
        line.id === id ? { ...line, [field]: value } : line
      )
    )
  }

  const getLineTotal = (line: DraftInvoiceLine) => {
    return line.quantity * line.unit_price_ht
  }

  const getTotalHT = () => {
    return lines.reduce((sum, line) => sum + getLineTotal(line), 0)
  }

  const getTotalTTC = () => {
    return getTotalHT() * (1 + tva / 100)
  }

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
        console.error('Profile error:', profileError)
        setLoading(false)
        return
      }

      // 2.5 Vérifier si l'entreprise est active (abonnement/essai)
      const { checkCompanyActive } = await import('@/lib/subscription-check')
      const { active } = await checkCompanyActive(supabase, profile.entreprise_id)

      if (!active) {
        setError("Votre essai est expiré. Abonnez-vous pour continuer.")
        setLoading(false)
        router.push('/dashboard/patron/abonnement')
        return
      }

      // 3. Validation minimale
      if (!title.trim()) {
        setError('Veuillez saisir un titre pour la facture.')
        setLoading(false)
        return
      }

      if (!clientName.trim()) {
        setError('Veuillez saisir le nom du client.')
        setLoading(false)
        return
      }

      // 4. Calculer le total HT
      const totalHT = getTotalHT()

      // 5. Créer la facture
      const { data: invoiceData, error: invoiceError } = await supabase
        .from('invoices')
        .insert({
          entreprise_id: profile.entreprise_id,
          title: title.trim(),
          client: clientName.trim(),
          contact: clientContact.trim() || null,
          description: description.trim() || null,
          client_address_line1: clientAddressLine1.trim() || null,
          client_address_line2: clientAddressLine2.trim() || null,
          client_postal_code: clientPostalCode.trim() || null,
          client_city: clientCity.trim() || null,
          amount_ht: totalHT,
          status: 'draft'
        })
        .select('id')
        .single()

      if (invoiceError) {
        const errorMsg = invoiceError.message + (invoiceError.details ? ` - ${invoiceError.details}` : '')
        setError(errorMsg)
        console.error({
          context: 'create_invoice',
          message: invoiceError.message,
          details: invoiceError.details,
          hint: invoiceError.hint,
          code: invoiceError.code
        })
        setLoading(false)
        return
      }

      // 6. Insérer les lignes de facture (seulement celles avec description)
      const linesToInsert = lines
        .filter((line) => line.description.trim())
        .map((line) => ({
          invoice_id: invoiceData.id,
          description: line.description.trim(),
          quantity: line.quantity || 0,
          unit: line.unit || 'pièce',
          unit_price_ht: line.unit_price_ht || 0,
          total_ht: getLineTotal(line)
        }))

      if (linesToInsert.length > 0) {
        const { error: linesError } = await supabase
          .from('invoice_lines')
          .insert(linesToInsert)

        if (linesError) {
          const errorMsg = linesError.message + (linesError.details ? ` - ${linesError.details}` : '')
          setError(`Erreur enregistrement lignes: ${errorMsg}`)
          console.error({
            context: 'create_invoice_lines',
            message: linesError.message,
            details: linesError.details,
            hint: linesError.hint,
            code: linesError.code
          })
          setLoading(false)
          return
        }
      }

      // 7. Succès - rediriger vers la page détail
      router.push(`/dashboard/patron/factures/${invoiceData.id}`)
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Une erreur inattendue est survenue'
      setError(errorMsg)
      console.error('Unexpected error in handleSave:', err)
      setLoading(false)
    }
  }

  return (
    <div className="space-y-10 md:space-y-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6 md:gap-8">
        <div className="flex-1">
          <h1 className="text-[28px] md:text-4xl font-semibold text-white/95 mb-3.5 tracking-[-0.02em] leading-[1.15]">
            Créer une facture
          </h1>
          <p className="text-sm md:text-[15px] text-white/70 leading-relaxed font-normal">
            Remplissez les informations pour créer une nouvelle facture
          </p>
        </div>
      </div>

      <div className="space-y-6 md:space-y-8">
        {/* Informations client */}
        <div className="bg-white/[0.02] backdrop-blur-sm rounded-xl p-6 md:p-8 border border-white/[0.06] shadow-sm">
          <h2 className="text-lg md:text-xl font-semibold text-white/95 mb-6 tracking-tight">Informations client</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input
              label="Nom complet (obligatoire)"
              type="text"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              required
              placeholder="Jean Dupont"
            />
            <Input
              label="Téléphone ou email (optionnel)"
              type="text"
              value={clientContact}
              onChange={(e) => setClientContact(e.target.value)}
              placeholder="06..."
            />
            <Input
              label="Adresse"
              type="text"
              value={clientAddressLine1}
              onChange={(e) => setClientAddressLine1(e.target.value)}
              placeholder="12 rue..."
            />
            <Input
              label="Complément d'adresse (optionnel)"
              type="text"
              value={clientAddressLine2}
              onChange={(e) => setClientAddressLine2(e.target.value)}
              placeholder="Complément d'adresse"
            />
            <Input
              label="Code postal"
              type="text"
              value={clientPostalCode}
              onChange={(e) => setClientPostalCode(e.target.value)}
              placeholder="75000"
            />
            <Input
              label="Ville"
              type="text"
              value={clientCity}
              onChange={(e) => setClientCity(e.target.value)}
              placeholder="Paris"
            />
          </div>
        </div>

        {/* Informations de base */}
        <div className="bg-white/[0.02] backdrop-blur-sm rounded-xl p-6 md:p-8 border border-white/[0.06] shadow-sm">
          <h2 className="text-lg md:text-xl font-semibold text-white/95 mb-6 tracking-tight">Informations de base</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input
              label="Titre de la facture"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              placeholder="Ex: Facture travaux rénovation"
            />
          </div>
        </div>

        {/* Description */}
        <div className="bg-white/[0.02] backdrop-blur-sm rounded-xl p-6 md:p-8 border border-white/[0.06] shadow-sm">
          <h2 className="text-lg md:text-xl font-semibold text-white/95 mb-4 tracking-tight">Description des travaux</h2>
          <textarea
            className="w-full px-4 py-3 bg-white/[0.03] border border-white/[0.08] rounded-xl text-white/95 placeholder-gray-500/70 focus:outline-none focus:ring-2 focus:ring-yellow-500/50 focus:border-yellow-500/30 transition-all resize-none text-sm md:text-base"
            rows={5}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Décrivez les travaux facturés..."
          />
        </div>

        {/* Lignes de facture */}
        <div className="bg-white/[0.02] backdrop-blur-sm rounded-xl p-6 md:p-8 border border-white/[0.06] shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <h2 className="text-lg md:text-xl font-semibold text-white/95 tracking-tight">Lignes de facture</h2>
            <Button type="button" variant="secondary" size="md" onClick={addLine} className="min-h-[44px] px-6">
              + Ajouter une ligne
            </Button>
          </div>

          {lines.length === 0 ? (
            <p className="text-white/60 text-center py-8 text-sm md:text-base">Aucune ligne pour le moment. Cliquez sur "Ajouter une ligne" pour commencer.</p>
          ) : (
            <div className="space-y-4">
              {lines.map((line, index) => (
                <div
                  key={line.id}
                  className="bg-white/[0.03] backdrop-blur-sm rounded-xl p-5 md:p-6 border border-white/[0.08] hover:border-white/[0.12] hover:bg-white/[0.04] transition-all duration-200"
                >
                  {/* Mobile: Card layout */}
                  <div className="md:hidden space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-white/90 mb-2">
                        Description
                      </label>
                      <input
                        type="text"
                        value={line.description}
                        onChange={(e) => updateLine(line.id, 'description', e.target.value)}
                        className="w-full px-4 py-3 bg-white/[0.05] border border-white/[0.1] rounded-xl text-base text-white/95 placeholder-gray-500/70 focus:outline-none focus:ring-2 focus:ring-yellow-500/50 focus:border-yellow-500/30 transition-all"
                        placeholder="Description de la tâche"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-semibold text-white/90 mb-2">
                          Quantité
                        </label>
                        <input
                          type="number"
                          value={line.quantity}
                          onChange={(e) => updateLine(line.id, 'quantity', parseFloat(e.target.value) || 0)}
                          className="w-full px-4 py-3 bg-white/[0.05] border border-white/[0.1] rounded-xl text-base text-white/95 focus:outline-none focus:ring-2 focus:ring-yellow-500/50 focus:border-yellow-500/30 transition-all"
                          min="0"
                          step="0.01"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-white/90 mb-2">
                          Unité
                        </label>
                        <input
                          type="text"
                          value={line.unit}
                          onChange={(e) => updateLine(line.id, 'unit', e.target.value)}
                          className="w-full px-4 py-3 bg-white/[0.05] border border-white/[0.1] rounded-xl text-base text-white/95 placeholder-gray-500/70 focus:outline-none focus:ring-2 focus:ring-yellow-500/50 focus:border-yellow-500/30 transition-all"
                          placeholder="pièce"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-semibold text-white/90 mb-2">
                          Prix HT
                        </label>
                        <input
                          type="number"
                          value={line.unit_price_ht}
                          onChange={(e) => updateLine(line.id, 'unit_price_ht', parseFloat(e.target.value) || 0)}
                          className="w-full px-4 py-3 bg-white/[0.05] border border-white/[0.1] rounded-xl text-base text-white/95 focus:outline-none focus:ring-2 focus:ring-yellow-500/50 focus:border-yellow-500/30 transition-all"
                          min="0"
                          step="0.01"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-white/90 mb-2">
                          Total ligne
                        </label>
                        <div className="px-4 py-3 bg-white/[0.05] border border-white/[0.1] rounded-xl text-base text-white/95 font-semibold tabular-nums">
                          {new Intl.NumberFormat('fr-FR', {
                            style: 'currency',
                            currency: 'EUR',
                          }).format(getLineTotal(line))}
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeLine(line.id)}
                      className="w-full px-4 py-3 bg-red-500/15 border border-red-500/30 rounded-xl text-red-300/90 font-medium hover:bg-red-500/20 hover:border-red-500/40 transition-all duration-200 flex items-center justify-center gap-2"
                    >
                      <span>✕</span>
                      <span>Supprimer la ligne</span>
                    </button>
                  </div>

                  {/* Desktop: Grid layout */}
                  <div className="hidden md:grid md:grid-cols-12 gap-4 items-start">
                    <div className="md:col-span-5">
                      <label className="block text-sm font-medium text-white/90 mb-2">
                        Description
                      </label>
                      <input
                        type="text"
                        value={line.description}
                        onChange={(e) => updateLine(line.id, 'description', e.target.value)}
                        className="w-full px-4 py-2.5 bg-white/[0.05] border border-white/[0.1] rounded-xl text-white/95 placeholder-gray-500/70 focus:outline-none focus:ring-2 focus:ring-yellow-500/50 focus:border-yellow-500/30 transition-all"
                        placeholder="Description de la tâche"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-white/90 mb-2">
                        Quantité
                      </label>
                      <input
                        type="number"
                        value={line.quantity}
                        onChange={(e) => updateLine(line.id, 'quantity', parseFloat(e.target.value) || 0)}
                        className="w-full px-4 py-2.5 bg-white/[0.05] border border-white/[0.1] rounded-xl text-white/95 focus:outline-none focus:ring-2 focus:ring-yellow-500/50 focus:border-yellow-500/30 transition-all"
                        min="0"
                        step="0.01"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-white/90 mb-2">
                        Unité
                      </label>
                      <input
                        type="text"
                        value={line.unit}
                        onChange={(e) => updateLine(line.id, 'unit', e.target.value)}
                        className="w-full px-4 py-2.5 bg-white/[0.05] border border-white/[0.1] rounded-xl text-white/95 placeholder-gray-500/70 focus:outline-none focus:ring-2 focus:ring-yellow-500/50 focus:border-yellow-500/30 transition-all"
                        placeholder="m, pièce..."
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-white/90 mb-2">
                        Prix unitaire (€)
                      </label>
                      <input
                        type="number"
                        value={line.unit_price_ht}
                        onChange={(e) => updateLine(line.id, 'unit_price_ht', parseFloat(e.target.value) || 0)}
                        className="w-full px-4 py-2.5 bg-white/[0.05] border border-white/[0.1] rounded-xl text-white/95 focus:outline-none focus:ring-2 focus:ring-yellow-500/50 focus:border-yellow-500/30 transition-all"
                        min="0"
                        step="0.01"
                      />
                    </div>
                    <div className="md:col-span-1 flex items-end">
                      <button
                        type="button"
                        onClick={() => removeLine(line.id)}
                        className="text-red-400 hover:text-red-300 p-2"
                        title="Supprimer"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                  <div className="hidden md:block mt-4 pt-4 border-t border-white/[0.08]">
                    <div className="flex justify-between items-center">
                      <span className="text-white/70 text-sm font-medium">Total ligne:</span>
                      <span className="text-white/95 font-semibold text-base tabular-nums">
                        {new Intl.NumberFormat('fr-FR', {
                          style: 'currency',
                          currency: 'EUR',
                        }).format(getLineTotal(line))}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {/* Total HT visible */}
          {lines.length > 0 && (
            <div className="mt-6 pt-6 border-t border-white/[0.08]">
              <div className="flex justify-between items-center">
                <span className="text-base md:text-lg font-semibold text-white/95">Total HT:</span>
                <span className="text-xl md:text-2xl font-semibold text-white/95 tabular-nums tracking-tight">
                  {new Intl.NumberFormat('fr-FR', {
                    style: 'currency',
                    currency: 'EUR',
                  }).format(getTotalHT())}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Résumé */}
        {lines.length > 0 && (
          <div className="bg-white/[0.02] backdrop-blur-sm rounded-xl p-6 md:p-8 border border-white/[0.06] shadow-sm">
            <h2 className="text-lg md:text-xl font-semibold text-white/95 mb-6 tracking-tight">Résumé</h2>
            <div className="space-y-4">
              <div className="flex justify-between items-center py-2">
                <span className="text-white/70 text-sm md:text-base">Total HT:</span>
                <span className="text-white/95 font-semibold text-base md:text-lg tabular-nums">
                  {new Intl.NumberFormat('fr-FR', {
                    style: 'currency',
                    currency: 'EUR',
                  }).format(getTotalHT())}
                </span>
              </div>
              <div className="flex items-center justify-between py-2">
                <div className="flex items-center gap-2">
                  <label className="text-white/70 text-sm md:text-base">TVA (%):</label>
                  <input
                    type="number"
                    value={tva}
                    onChange={(e) => setTva(parseFloat(e.target.value) || 0)}
                    className="w-20 px-3 py-1.5 bg-white/[0.05] border border-white/[0.1] rounded-lg text-white/95 focus:outline-none focus:ring-2 focus:ring-yellow-500/50 focus:border-yellow-500/30 transition-all"
                    min="0"
                    max="100"
                  />
                </div>
                <span className="text-white/60 text-sm tabular-nums">
                  TVA: {new Intl.NumberFormat('fr-FR', {
                    style: 'currency',
                    currency: 'EUR',
                  }).format(getTotalHT() * (tva / 100))}
                </span>
              </div>
              <div className="flex justify-between items-center text-lg md:text-xl font-semibold text-white/95 pt-4 border-t border-white/[0.08]">
                <span>Total TTC:</span>
                <span className="tabular-nums tracking-tight">
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
              disabled={loading || !title.trim() || !clientName.trim() || isCompanyActive === false}
              className="w-full sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Création...' : 'Créer la facture'}
            </Button>
            {isCompanyActive === false && (
              <p className="mt-2 text-sm text-red-300">
                Essai expiré : abonnez-vous pour créer de nouvelles factures.
              </p>
            )}
          </div>
          <Link href="/dashboard/patron/factures" className="w-full sm:w-auto">
            <Button type="button" variant="secondary" size="lg" className="w-full sm:w-auto">
              Annuler
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
