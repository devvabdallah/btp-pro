'use client'

import Link from 'next/link'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'

type QuoteStatus = 'brouillon' | 'envoye' | 'accepte' | 'refuse'

interface QuoteDetailViewProps {
  quote: any | null
  loading?: boolean
  error?: string | null
  quoteNotFound?: boolean
  quoteId?: string | null
  formatDate: (dateString: string) => string
  getStatusBadge: (status: string) => JSX.Element
  formatAmount: (amount: number) => string
  existingInvoiceId: string | null
  handleCreateInvoice: () => void
  creatingInvoice: boolean
  isCompanyActive: boolean | null
  invoiceError: string | null
  statusError: string | null
  handleStatusChange: (status: QuoteStatus) => void
  updatingStatus: boolean
  handlePrintPdf: () => void
  isEditing?: boolean
  editedQuote?: any
  quoteLines?: any[]
  editedLines?: any[]
  saving?: boolean
  saveError?: string | null
  onEdit?: () => void
  onCancel?: () => void
  onSave?: () => void
  updateEditedQuote?: (field: string, value: any) => void
  updateEditedLine?: (index: number, field: string, value: any) => void
  addEditedLine?: () => void
  removeEditedLine?: (index: number) => void
  onDelete?: () => void
  deleting?: boolean
  deleteError?: string | null
}

export default function QuoteDetailView({
  quote,
  loading = false,
  error = null,
  quoteNotFound = false,
  quoteId = null,
  formatDate,
  getStatusBadge,
  formatAmount,
  existingInvoiceId,
  handleCreateInvoice,
  creatingInvoice,
  isCompanyActive,
  invoiceError,
  statusError,
  handleStatusChange,
  updatingStatus,
  handlePrintPdf,
  isEditing = false,
  editedQuote,
  quoteLines = [],
  editedLines = [],
  saving = false,
  saveError,
  onEdit,
  onCancel,
  onSave,
  updateEditedQuote,
  updateEditedLine,
  addEditedLine,
  removeEditedLine,
  onDelete,
  deleting = false,
  deleteError = null,
}: QuoteDetailViewProps) {
  // Garde si quoteId n'est pas disponible
  if (!quoteId) {
    return (
      <main className="min-h-screen bg-[#0a0e27]">
        <div className="max-w-4xl mx-auto px-4 py-12 md:px-8">
          <div className="bg-[#1a1f3a] rounded-3xl p-8 border border-[#2a2f4a] text-center">
            <p className="text-red-400 text-xl mb-6">Devis introuvable</p>
            <Link href="/dashboard/patron/devis">
              <Button variant="primary" size="md" className="min-h-[48px] px-6 text-base font-semibold">
                Retour aux devis
              </Button>
            </Link>
          </div>
        </div>
      </main>
    )
  }

  // État de chargement
  if (loading) {
    return (
      <main className="min-h-screen bg-[#0a0e27] flex items-center justify-center">
        <div className="text-center">
          <p className="text-white text-lg mb-4">Chargement du devis…</p>
        </div>
      </main>
    )
  }

  // Erreur de chargement
  if (error) {
    return (
      <main className="min-h-screen bg-[#0a0e27]">
        <header className="w-full px-4 py-6 md:px-8 border-b border-[#2a2f4a]">
          <div className="max-w-7xl mx-auto flex items-center justify-end">
            <Link href="/dashboard/patron/devis">
              <Button variant="secondary" size="sm" className="min-h-[48px] px-6 text-base font-semibold">
                Retour aux devis
              </Button>
            </Link>
          </div>
        </header>
        <div className="max-w-4xl mx-auto px-4 py-12 md:px-8">
          <div className="bg-[#1a1f3a] rounded-3xl p-8 border border-[#2a2f4a] text-center">
            <p className="text-red-400 text-xl mb-6">{error}</p>
            <Link href="/dashboard/patron/devis">
              <Button variant="primary" size="md" className="min-h-[48px] px-6 text-base font-semibold">
                Retour aux devis
              </Button>
            </Link>
          </div>
        </div>
      </main>
    )
  }

  // Devis introuvable
  if (quoteNotFound || !quote) {
    return (
      <main className="min-h-screen bg-[#0a0e27]">
        <header className="w-full px-4 py-6 md:px-8 border-b border-[#2a2f4a]">
          <div className="max-w-7xl mx-auto flex items-center justify-end">
            <Link href="/dashboard/patron/devis">
              <Button variant="secondary" size="sm" className="min-h-[48px] px-6 text-base font-semibold">
                Retour aux devis
              </Button>
            </Link>
          </div>
        </header>
        <div className="max-w-4xl mx-auto px-4 py-12 md:px-8">
          <div className="bg-[#1a1f3a] rounded-3xl p-8 border border-[#2a2f4a] text-center">
            <p className="text-white text-xl mb-6">Devis introuvable</p>
            <Link href="/dashboard/patron/devis">
              <Button variant="primary" size="md" className="min-h-[48px] px-6 text-base font-semibold">
                Retour aux devis
              </Button>
            </Link>
          </div>
        </div>
      </main>
    )
  }

  const displayQuote = isEditing && editedQuote ? editedQuote : quote
  
  const getTotalHT = () => {
    if (isEditing && editedLines.length > 0) {
      return editedLines.reduce((sum, line) => {
        const qty = parseFloat(line.quantity) || 0
        const price = parseFloat(line.unit_price_ht) || 0
        return sum + (qty * price)
      }, 0)
    }
    return quote?.amount_ht || 0
  }
  return (
    <main className="min-h-screen bg-[#0a0e27]">
      {/* Header */}
      <header className="w-full px-4 py-6 md:px-8 border-b border-[#2a2f4a]">
        <div className="max-w-7xl mx-auto flex items-center justify-end">
          <Link href="/dashboard/patron">
            <Button variant="secondary" size="sm" className="min-h-[48px] px-6 text-base font-semibold">
              Retour aux devis
            </Button>
          </Link>
        </div>
      </header>

      {/* Contenu principal */}
      <div className="max-w-4xl mx-auto px-4 py-12 md:px-8 lg:py-16">
        <div className="mb-10 md:mb-12 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="flex-1">
            {isEditing && updateEditedQuote ? (
              <Input
                label=""
                value={displayQuote.title || ''}
                onChange={(e) => updateEditedQuote('title', e.target.value)}
                placeholder="Titre du devis"
                className="text-3xl md:text-4xl font-bold"
                variant="dark"
              />
            ) : (
              <>
                <h2 className="text-3xl md:text-4xl font-bold text-white mb-2">
                  {quote.title}
                </h2>
                <p className="text-gray-400">
                  Créé le {formatDate(quote.created_at)}
                </p>
              </>
            )}
          </div>
          <div className="flex items-center gap-3">
            {getStatusBadge(quote.status)}
            {!isEditing && onEdit && (
              <Button
                variant="secondary"
                size="md"
                onClick={onEdit}
                disabled={!!existingInvoiceId}
                className="min-h-[48px] px-6 text-base font-semibold"
                title={existingInvoiceId ? 'Devis verrouillé car déjà facturé' : ''}
              >
                ✏️ Modifier
              </Button>
            )}
            {existingInvoiceId && !isEditing && (
              <p className="text-xs text-gray-400">Devis verrouillé car déjà facturé</p>
            )}
          </div>
        </div>

        {/* Bouton principal "Facturer ce devis" */}
        {quote && (
          existingInvoiceId ? (
            <div className="mb-8 bg-blue-500/20 border border-blue-500/50 rounded-3xl p-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <p className="text-blue-300 font-semibold mb-1">Ce devis est déjà facturé</p>
                  <p className="text-gray-400 text-sm">Une facture a déjà été créée à partir de ce devis.</p>
                </div>
                <Link href={`/dashboard/patron/factures/${existingInvoiceId}`}>
                  <Button variant="primary" size="md" className="min-h-[48px] px-6 text-base font-semibold">
                    Voir la facture
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            <div className="mb-8">
              <Button
                variant="primary"
                size="lg"
                onClick={handleCreateInvoice}
                disabled={creatingInvoice || isCompanyActive === false || !quote}
                className="w-full sm:w-auto min-h-[48px] px-6 text-base font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {creatingInvoice ? 'Création de la facture...' : '💰 Facturer ce devis'}
              </Button>
              
              {/* Message si entreprise inactive */}
              {isCompanyActive === false && (
                <p className="mt-3 text-sm text-red-300">
                  Essai expiré : abonnez-vous pour facturer ce devis.
                </p>
              )}
              
              {/* Message d'erreur */}
              {invoiceError && (
                <div className="mt-4 bg-red-500/20 border border-red-500/50 rounded-xl p-3">
                  <p className="text-red-400 text-sm whitespace-pre-line">{invoiceError}</p>
                </div>
              )}
            </div>
          )
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 mb-10 md:mb-12">
          {/* Informations client */}
          <div className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 rounded-3xl p-7 md:p-8 border border-white/10 shadow-lg shadow-black/30 backdrop-blur-sm">
            <h3 className="text-lg font-semibold text-white mb-4">Client</h3>
            {isEditing && updateEditedQuote ? (
              <div className="space-y-4">
                <Input
                  label="Nom complet (obligatoire)"
                  value={displayQuote.client || ''}
                  onChange={(e) => updateEditedQuote('client', e.target.value)}
                  placeholder="Jean Dupont"
                  className="text-white placeholder:text-gray-500"
                  variant="dark"
                />
                <Input
                  label="Téléphone ou email (optionnel)"
                  value={displayQuote.contact || ''}
                  onChange={(e) => updateEditedQuote('contact', e.target.value)}
                  placeholder="06..."
                  className="text-white text-sm placeholder:text-gray-500"
                  variant="dark"
                />
                <Input
                  label="Adresse"
                  value={displayQuote.client_address_line1 || ''}
                  onChange={(e) => updateEditedQuote('client_address_line1', e.target.value)}
                  placeholder="12 rue..."
                  className="text-white text-sm placeholder:text-gray-500"
                  variant="dark"
                />
                <Input
                  label="Complément d'adresse (optionnel)"
                  value={displayQuote.client_address_line2 || ''}
                  onChange={(e) => updateEditedQuote('client_address_line2', e.target.value)}
                  placeholder="Complément d'adresse"
                  className="text-white text-sm placeholder:text-gray-500"
                  variant="dark"
                />
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label="Code postal"
                    value={displayQuote.client_postal_code || ''}
                    onChange={(e) => updateEditedQuote('client_postal_code', e.target.value)}
                    placeholder="75000"
                    className="text-white text-sm placeholder:text-gray-500"
                    variant="dark"
                  />
                  <Input
                    label="Ville"
                    value={displayQuote.client_city || ''}
                    onChange={(e) => updateEditedQuote('client_city', e.target.value)}
                    placeholder="Paris"
                    className="text-white text-sm placeholder:text-gray-500"
                    variant="dark"
                  />
                </div>
              </div>
            ) : (
              <>
                <p className="text-white mb-2 font-medium">{quote.client}</p>
                {quote.contact && (
                  <p className="text-gray-400 text-sm">{quote.contact}</p>
                )}
                {(quote.client_address_line1 || quote.client_postal_code || quote.client_city) && (
                  <div className="mt-3 text-gray-400 text-sm">
                    {quote.client_address_line1 && <p>{quote.client_address_line1}</p>}
                    {quote.client_address_line2 && <p>{quote.client_address_line2}</p>}
                    {(quote.client_postal_code || quote.client_city) && (
                      <p>{[quote.client_postal_code, quote.client_city].filter(Boolean).join(' ')}</p>
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Montant */}
          <div className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 rounded-3xl p-7 md:p-8 border border-white/10 shadow-lg shadow-black/30 backdrop-blur-sm">
            <h3 className="text-lg font-semibold text-white mb-4">Montant</h3>
            <p className="text-2xl font-bold text-white">{formatAmount(getTotalHT())}</p>
            <p className="text-gray-400 text-sm mt-1">Hors taxes</p>
          </div>

          {/* Statut */}
          <div className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 rounded-3xl p-7 md:p-8 border border-white/10 shadow-lg shadow-black/30 backdrop-blur-sm">
            <h3 className="text-lg font-semibold text-white mb-4">Statut</h3>
            {getStatusBadge(quote.status)}
          </div>
        </div>

        {/* Informations de paiement */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 mb-10 md:mb-12">
          <div className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 rounded-3xl p-7 md:p-8 border border-white/10 shadow-lg shadow-black/30 backdrop-blur-sm">
            <h3 className="text-lg font-semibold text-white mb-4">Mode de paiement</h3>
            {isEditing && updateEditedQuote ? (
              <select
                value={displayQuote.payment_method || ''}
                onChange={(e) => updateEditedQuote('payment_method', e.target.value || null)}
                className="w-full px-5 py-4 bg-[#0f1429] border border-[#2a2f4a] rounded-2xl text-white focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent transition-all"
              >
                <option value="">Sélectionner...</option>
                <option value="Virement">Virement</option>
                <option value="Chèque">Chèque</option>
                <option value="Espèces">Espèces</option>
                <option value="CB">CB</option>
              </select>
            ) : (
              <p className="text-white">
                {quote.payment_method || '—'}
              </p>
            )}
          </div>

          <div className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 rounded-3xl p-7 md:p-8 border border-white/10 shadow-lg shadow-black/30 backdrop-blur-sm">
            <h3 className="text-lg font-semibold text-white mb-4">Acompte (montant)</h3>
            {isEditing && updateEditedQuote ? (
              <Input
                type="number"
                step="0.01"
                label=""
                value={displayQuote.deposit_amount || ''}
                onChange={(e) => updateEditedQuote('deposit_amount', e.target.value || null)}
                placeholder="Montant en €"
                className="text-white placeholder:text-gray-500"
                variant="dark"
              />
            ) : (
              <p className="text-white">
                {quote.deposit_amount ? `${formatAmount(parseFloat(quote.deposit_amount))}` : '—'}
              </p>
            )}
          </div>

          <div className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 rounded-3xl p-7 md:p-8 border border-white/10 shadow-lg shadow-black/30 backdrop-blur-sm">
            <h3 className="text-lg font-semibold text-white mb-4">Acompte (%)</h3>
            {isEditing && updateEditedQuote ? (
              <Input
                type="number"
                step="0.01"
                min="0"
                max="100"
                label=""
                value={displayQuote.deposit_percent || ''}
                onChange={(e) => updateEditedQuote('deposit_percent', e.target.value || null)}
                placeholder="Pourcentage"
                className="text-white placeholder:text-gray-500"
                variant="dark"
              />
            ) : (
              <p className="text-white">
                {quote.deposit_percent ? `${quote.deposit_percent}%` : '—'}
              </p>
            )}
          </div>
        </div>

        {/* Description */}
        {(quote.description || isEditing) && (
          <div className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 rounded-3xl p-7 md:p-8 border border-white/10 shadow-lg shadow-black/30 backdrop-blur-sm mb-10 md:mb-12">
            <h3 className="text-lg font-semibold text-white mb-4">Description des travaux</h3>
            {isEditing && updateEditedQuote ? (
              <textarea
                value={displayQuote.description || ''}
                onChange={(e) => updateEditedQuote('description', e.target.value)}
                placeholder="Description des travaux..."
                className="w-full px-5 py-4 bg-white border-2 border-gray-300 rounded-2xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all resize-none"
                rows={5}
              />
            ) : (
              <p className="text-gray-300 whitespace-pre-wrap leading-relaxed">
                {quote.description}
              </p>
            )}
          </div>
        )}

        {/* Lignes de devis - Mode édition */}
        {isEditing && editedLines && updateEditedLine && addEditedLine && removeEditedLine && (
          <div className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 rounded-3xl p-7 md:p-8 border border-white/10 shadow-lg shadow-black/30 backdrop-blur-sm mb-10 md:mb-12">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
              <h3 className="text-lg font-semibold text-white">Lignes de devis</h3>
              <Button
                type="button"
                variant="secondary"
                size="md"
                onClick={addEditedLine}
                className="min-h-[44px] px-6"
              >
                + Ajouter une ligne
              </Button>
            </div>
            <div className="space-y-4">
              {editedLines.map((line, index) => (
                <div
                  key={line.id || index}
                  className="bg-white/5 rounded-2xl p-5 md:p-4 border-2 border-white/10 hover:border-orange-500/40 transition-all"
                >
                  {/* Mobile: Card layout */}
                  <div className="md:hidden space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-300 mb-2">
                        Description
                      </label>
                      <input
                        type="text"
                        value={line.description || ''}
                        onChange={(e) => updateEditedLine(index, 'description', e.target.value)}
                        className="w-full px-4 py-3 bg-white border-2 border-gray-300 rounded-xl text-base text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                        placeholder="Description de la tâche"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-semibold text-gray-300 mb-2">
                          Quantité
                        </label>
                        <input
                          type="number"
                          value={line.quantity || 0}
                          onChange={(e) => updateEditedLine(index, 'quantity', parseFloat(e.target.value) || 0)}
                          className="w-full px-4 py-3 bg-[#020617] border border-gray-600 rounded-xl text-base text-white focus:outline-none focus:ring-2 focus:ring-yellow-400"
                          min="0"
                          step="0.01"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-300 mb-2">
                          Unité
                        </label>
                        <input
                          type="text"
                          value={line.unit || ''}
                          onChange={(e) => updateEditedLine(index, 'unit', e.target.value)}
                          className="w-full px-4 py-3 bg-[#020617] border border-gray-600 rounded-xl text-base text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-yellow-400"
                          placeholder="pièce"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-semibold text-gray-300 mb-2">
                          Prix HT
                        </label>
                        <input
                          type="number"
                          value={line.unit_price_ht || 0}
                          onChange={(e) => updateEditedLine(index, 'unit_price_ht', parseFloat(e.target.value) || 0)}
                          className="w-full px-4 py-3 bg-[#020617] border border-gray-600 rounded-xl text-base text-white focus:outline-none focus:ring-2 focus:ring-yellow-400"
                          min="0"
                          step="0.01"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-300 mb-2">
                          Total ligne
                        </label>
                        <div className="px-4 py-3 bg-[#1a1f3a] border border-gray-600 rounded-xl text-base text-white font-semibold">
                          {formatAmount((parseFloat(line.quantity) || 0) * (parseFloat(line.unit_price_ht) || 0))}
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeEditedLine(index)}
                      className="w-full px-4 py-3 bg-red-500/20 border border-red-500/50 rounded-xl text-red-300 font-semibold hover:bg-red-500/30 transition-colors flex items-center justify-center gap-2"
                    >
                      <span>✕</span>
                      <span>Supprimer la ligne</span>
                    </button>
                  </div>

                  {/* Desktop: Grid layout */}
                  <div className="hidden md:grid md:grid-cols-12 gap-4 items-start">
                    <div className="md:col-span-5">
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Description
                      </label>
                      <input
                        type="text"
                        value={line.description || ''}
                        onChange={(e) => updateEditedLine(index, 'description', e.target.value)}
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
                        value={line.quantity || 0}
                        onChange={(e) => updateEditedLine(index, 'quantity', parseFloat(e.target.value) || 0)}
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
                        value={line.unit || ''}
                        onChange={(e) => updateEditedLine(index, 'unit', e.target.value)}
                        className="w-full px-4 py-2 bg-[#020617] border border-gray-600 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-yellow-400"
                        placeholder="m, pièce..."
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Prix unitaire (€)
                      </label>
                      <input
                        type="number"
                        value={line.unit_price_ht || 0}
                        onChange={(e) => updateEditedLine(index, 'unit_price_ht', parseFloat(e.target.value) || 0)}
                        className="w-full px-4 py-2 bg-[#020617] border border-gray-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-yellow-400"
                        min="0"
                        step="0.01"
                      />
                    </div>
                    <div className="md:col-span-1 flex items-end">
                      <button
                        type="button"
                        onClick={() => removeEditedLine(index)}
                        className="text-red-400 hover:text-red-300 p-2"
                        title="Supprimer"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                  <div className="hidden md:block mt-3 pt-3 border-t border-[#2a2f4a]">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400 text-sm">Total ligne:</span>
                      <span className="text-white font-semibold text-base">
                        {formatAmount((parseFloat(line.quantity) || 0) * (parseFloat(line.unit_price_ht) || 0))}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            {/* Total HT visible */}
            {editedLines.length > 0 && (
              <div className="mt-6 pt-6 border-t-2 border-[#2a2f4a]">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-semibold text-white">Total HT:</span>
                  <span className="text-xl md:text-2xl font-bold text-white">
                    {formatAmount(editedLines.reduce((sum, line) => {
                      const qty = parseFloat(line.quantity) || 0
                      const price = parseFloat(line.unit_price_ht) || 0
                      return sum + (qty * price)
                    }, 0))}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Lignes de devis - Mode lecture */}
        {!isEditing && quoteLines && quoteLines.length > 0 && (
          <div className="bg-[#1a1f3a] rounded-3xl p-6 border border-[#2a2f4a] mb-8">
            <h3 className="text-lg font-semibold text-white mb-4">Lignes de devis</h3>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-[#2a2f4a]">
                    <th className="text-left py-3 px-4 text-white font-semibold">Description</th>
                    <th className="text-right py-3 px-4 text-white font-semibold">Qté</th>
                    <th className="text-left py-3 px-4 text-white font-semibold">Unité</th>
                    <th className="text-right py-3 px-4 text-white font-semibold">PU HT</th>
                    <th className="text-right py-3 px-4 text-white font-semibold">Total HT</th>
                  </tr>
                </thead>
                <tbody>
                  {quoteLines.map((line) => (
                    <tr key={line.id} className="border-b border-[#2a2f4a]">
                      <td className="py-3 md:py-1 px-4 text-base md:text-sm text-gray-200 leading-relaxed whitespace-normal break-words">{line.description || '—'}</td>
                      <td className="py-3 md:py-1 px-4 text-base md:text-sm text-gray-200 text-right">{line.quantity || '—'}</td>
                      <td className="py-3 md:py-1 px-4 text-base md:text-sm text-gray-200">{line.unit || '—'}</td>
                      <td className="py-3 md:py-1 px-4 text-base md:text-sm text-gray-200 text-right">{formatAmount(line.unit_price_ht || 0)}</td>
                      <td className="py-3 md:py-1 px-4 text-base md:text-sm text-white font-semibold text-right">{formatAmount(line.total_ht || 0)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-[#2a2f4a]">
                    <td colSpan={4} className="py-3 px-4 text-white font-semibold text-right">Total HT</td>
                    <td className="py-3 px-4 text-white font-bold text-right">
                      {formatAmount(quoteLines.reduce((sum, line) => sum + (parseFloat(line.total_ht) || 0), 0))}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="bg-[#1a1f3a] rounded-3xl p-6 border border-[#2a2f4a]">
          <h3 className="text-lg font-semibold text-white mb-4">Actions</h3>
          
          {/* Messages d'erreur sauvegarde */}
          {saveError && (
            <div className="mb-4 bg-red-500/20 border border-red-500/50 rounded-xl p-3">
              <p className="text-red-400 text-sm">{saveError}</p>
            </div>
          )}

          {/* Boutons Enregistrer/Annuler en mode édition */}
          {isEditing && onSave && onCancel && (
            <div className="mb-6 flex flex-wrap gap-3">
              <Button
                variant="primary"
                size="md"
                onClick={onSave}
                disabled={saving}
                className="min-h-[48px] px-6 text-base font-semibold"
              >
                {saving ? 'Enregistrement...' : '💾 Enregistrer'}
              </Button>
              <Button
                variant="secondary"
                size="md"
                onClick={onCancel}
                disabled={saving}
                className="min-h-[48px] px-6 text-base font-semibold"
              >
                Annuler
              </Button>
            </div>
          )}
          
          {/* Messages d'erreur statut */}
          {statusError && (
            <div className="mb-4 bg-red-500/20 border border-red-500/50 rounded-xl p-3">
              <p className="text-red-400 text-sm">{statusError}</p>
            </div>
          )}

          {/* Boutons changement de statut */}
          <div className="space-y-4">
            <div className="flex flex-wrap gap-3">
              {quote.status === 'brouillon' && (
                <Button
                  variant="primary"
                  size="md"
                  onClick={() => handleStatusChange('envoye')}
                  disabled={updatingStatus}
                  className="min-h-[48px] px-6 text-base font-semibold"
                >
                  Marquer comme envoyé
                </Button>
              )}
              
              {quote.status === 'envoye' && (
                <>
                  <Button
                    variant="primary"
                    size="md"
                    onClick={() => handleStatusChange('accepte')}
                    disabled={updatingStatus}
                    className="bg-green-500 hover:bg-green-600 min-h-[48px] px-6 text-base font-semibold"
                  >
                    Marquer comme accepté
                  </Button>
                  <Button
                    variant="secondary"
                    size="md"
                    onClick={() => handleStatusChange('refuse')}
                    disabled={updatingStatus}
                    className="border-red-500/50 text-red-300 hover:bg-red-500/10 min-h-[48px] px-6 text-base font-semibold"
                  >
                    Marquer comme refusé
                  </Button>
                </>
              )}

              {(quote.status === 'accepte' || quote.status === 'refuse') && (
                <Button
                  variant="secondary"
                  size="md"
                  onClick={() => handleStatusChange('brouillon')}
                  disabled={updatingStatus}
                  className="min-h-[48px] px-6 text-base font-semibold"
                >
                  Remettre en brouillon
                </Button>
              )}
            </div>
          </div>
          
          {/* Télécharger en PDF */}
          <div className="mt-6 pt-6 border-t border-[#2a2f4a]">
            <Button
              variant="secondary"
              size="md"
              onClick={handlePrintPdf}
              className="w-full sm:w-auto min-h-[48px] px-6 text-base font-semibold mb-4"
            >
              📄 Télécharger en PDF
            </Button>
          </div>

          {/* Supprimer le devis */}
          {!isEditing && onDelete && (
            <div className="mt-6 pt-6 border-t border-[#2a2f4a]">
              {deleteError && (
                <div className="mb-4 bg-red-500/20 border border-red-500/50 rounded-xl p-3">
                  <p className="text-red-400 text-sm">{deleteError}</p>
                </div>
              )}
              {existingInvoiceId && (
                <div className="mb-4 bg-yellow-500/20 border border-yellow-500/50 rounded-xl p-3">
                  <p className="text-yellow-300 text-sm">
                    ⚠️ Ce devis a une facture liée. La suppression du devis supprimera aussi la facture.
                  </p>
                </div>
              )}
              <Button
                variant="secondary"
                size="md"
                onClick={onDelete}
                disabled={deleting}
                className="w-full sm:w-auto min-h-[48px] px-6 text-base font-semibold border-red-500/50 text-red-300 hover:bg-red-500/10 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {deleting ? 'Suppression...' : '🗑️ Supprimer ce devis'}
              </Button>
            </div>
          )}

        </div>
      </div>
    </main>
  )
}
