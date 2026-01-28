'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import Link from 'next/link'
import Button from '@/components/ui/Button'
import ErrorMessage from '@/components/ui/ErrorMessage'

type QuoteStatus = 'brouillon' | 'envoye' | 'accepte' | 'refuse'

export default function QuoteDetailPage() {
  const router = useRouter()
  const params = useParams()
  const quoteId = params?.id as string | undefined
  
  const [loading, setLoading] = useState(true)
  const [quote, setQuote] = useState<any>(null)
  const [quoteLines, setQuoteLines] = useState<any[]>([])
  const [company, setCompany] = useState<{ 
    id: string; 
    name: string; 
    code: string;
    legal_name?: string | null;
    address_line1?: string | null;
    address_line2?: string | null;
    postal_code?: string | null;
    city?: string | null;
    siret?: string | null;
    vat_number?: string | null;
    vat_exemption_text?: string | null;
  } | null>(null)
  const [entrepriseInfo, setEntrepriseInfo] = useState<{ 
    name: string; 
    code: string;
    legal_name?: string | null;
    address_line1?: string | null;
    address_line2?: string | null;
    postal_code?: string | null;
    city?: string | null;
    siret?: string | null;
    vat_number?: string | null;
    vat_exemption_text?: string | null;
  } | null>(null)
  const [quoteNotFound, setQuoteNotFound] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [statusError, setStatusError] = useState<string | null>(null)
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const [creatingInvoice, setCreatingInvoice] = useState(false)
  const [invoiceError, setInvoiceError] = useState<string | null>(null)
  const [invoiceSuccess, setInvoiceSuccess] = useState<string | null>(null)
  const [isCompanyActive, setIsCompanyActive] = useState<boolean | null>(null)
  const [existingInvoiceId, setExistingInvoiceId] = useState<string | null>(null)

  useEffect(() => {
    if (!quoteId) return

    async function load() {
      setLoading(true)
      setError(null)
      setQuoteNotFound(false)

      // 1. Récupérer l'utilisateur
      const { data: { user }, error: userError } = await supabase.auth.getUser()

      if (userError || !user) {
        setError('Non connecté')
        setLoading(false)
        return
      }

      // 2. Récupérer entreprise_id via profiles
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('entreprise_id')
        .eq('id', user.id)
        .single()

      if (profileError || !profile) {
        setError('Entreprise introuvable')
        setLoading(false)
        return
      }

      if (!profile.entreprise_id) {
        setError('Entreprise introuvable')
        setLoading(false)
        return
      }

      // 2.5 Vérifier si l'entreprise est active (abonnement/essai)
      try {
        const { data, error: activeError } = await supabase.rpc('is_company_active')

        if (!activeError && data !== null && data !== undefined) {
          // Interpréter data de façon robuste
          let active = false
          if (typeof data === 'boolean') {
            active = data
          } else if (data && typeof (data as any).active === 'boolean') {
            active = (data as any).active
          }
          setIsCompanyActive(active)
        } else {
          // Si la RPC échoue, on laisse null (comportement par défaut)
          setIsCompanyActive(null)
        }
      } catch (err) {
        // En cas d'erreur, on laisse null (comportement par défaut)
        setIsCompanyActive(null)
      }

      // 2.6 Vérifier si une facture existe déjà pour ce devis
      try {
        const { data: existingInvoice, error: checkError } = await supabase
          .from('invoices')
          .select('id')
          .eq('quote_id', quoteId)
          .eq('entreprise_id', profile.entreprise_id)
          .limit(1)
          .maybeSingle()

        if (!checkError && existingInvoice) {
          setExistingInvoiceId(existingInvoice.id)
        } else {
          setExistingInvoiceId(null)
        }
      } catch (err) {
        // En cas d'erreur, on laisse null
        setExistingInvoiceId(null)
      }

      // 3. Charger le devis avec les filtres id et entreprise_id
      const { data: quoteData, error: quoteError } = await supabase
        .from('quotes')
        .select('id, entreprise_id, title, client, contact, description, amount_ht, status, created_at, number')
        .eq('id', quoteId)
        .eq('entreprise_id', profile.entreprise_id)
        .single()

      if (quoteError || !quoteData) {
        setQuoteNotFound(true)
        setLoading(false)
        return
      }

      setQuote(quoteData)

      // 4. Charger les infos entreprise depuis quote.entreprise_id (source fiable)
      if (quoteData?.entreprise_id) {
        try {
          const { data: companyData, error: companyError } = await supabase
            .from('entreprises')
            .select('id, name, code, legal_name, address_line1, address_line2, postal_code, city, siret, vat_number, vat_exemption_text')
            .eq('id', quoteData.entreprise_id)
            .single()

          if (!companyError && companyData) {
            setCompany({
              id: companyData.id,
              name: companyData.name || "Nom de l'entreprise",
              code: companyData.code || '',
              legal_name: companyData.legal_name || null,
              address_line1: companyData.address_line1 || null,
              address_line2: companyData.address_line2 || null,
              postal_code: companyData.postal_code || null,
              city: companyData.city || null,
              siret: companyData.siret || null,
              vat_number: companyData.vat_number || null,
              vat_exemption_text: companyData.vat_exemption_text || null
            })
            setEntrepriseInfo({
              name: companyData.legal_name || companyData.name || "Nom de l'entreprise",
              code: companyData.siret || companyData.code || '',
              legal_name: companyData.legal_name || null,
              address_line1: companyData.address_line1 || null,
              address_line2: companyData.address_line2 || null,
              postal_code: companyData.postal_code || null,
              city: companyData.city || null,
              siret: companyData.siret || null,
              vat_number: companyData.vat_number || null,
              vat_exemption_text: companyData.vat_exemption_text || null
            })
          } else {
            // Ne pas bloquer : entreprise non trouvée mais on continue
            setCompany(null)
            setEntrepriseInfo({ name: "Nom de l'entreprise", code: '' })
          }
        } catch (err) {
          // Ne pas bloquer : erreur de chargement entreprise mais on continue
          setCompany(null)
          setEntrepriseInfo({ name: "Nom de l'entreprise", code: '' })
        }
      } else {
        setCompany(null)
        setEntrepriseInfo({ name: "Nom de l'entreprise", code: '' })
      }

      // 5. Charger les lignes associées (si la table existe)
      try {
        const { data: linesData, error: linesError } = await supabase
          .from('quote_lines')
          .select('id, quote_id, description, quantity, unit, unit_price_ht, total_ht, created_at')
          .eq('quote_id', quoteId)
          .order('created_at', { ascending: true })

        if (!linesError && linesData) {
          setQuoteLines(linesData || [])
        }
        // Si la table n'existe pas, on ignore l'erreur (pas de lignes)
      } catch (err) {
        // Table quote_lines peut ne pas exister, on continue sans lignes
      }

      setLoading(false)
    }

    load()
  }, [quoteId])

  // Garde si quoteId n'est pas disponible
  if (!quoteId) {
    return (
      <main className="min-h-screen bg-[#0a0e27]">
        <div className="max-w-4xl mx-auto px-4 py-12 md:px-8">
          <div className="bg-[#1a1f3a] rounded-3xl p-8 border border-[#2a2f4a] text-center">
            <p className="text-red-400 text-xl mb-6">Devis introuvable</p>
            <Link href="/dashboard/patron/devis">
              <Button variant="primary" size="md">
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
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-2xl flex items-center justify-center">
                <span className="text-2xl font-bold text-[#0a0e27]">B</span>
              </div>
              <h1 className="text-2xl md:text-3xl font-bold text-white">BTP PRO</h1>
            </div>
            <Link href="/dashboard/patron/devis">
              <Button variant="secondary" size="sm">
                Retour aux devis
              </Button>
            </Link>
          </div>
        </header>
        <div className="max-w-4xl mx-auto px-4 py-12 md:px-8">
          <div className="bg-[#1a1f3a] rounded-3xl p-8 border border-[#2a2f4a] text-center">
            <p className="text-red-400 text-xl mb-6">{error}</p>
            <Link href="/dashboard/patron/devis">
              <Button variant="primary" size="md">
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
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-2xl flex items-center justify-center">
                <span className="text-2xl font-bold text-[#0a0e27]">B</span>
              </div>
              <h1 className="text-2xl md:text-3xl font-bold text-white">BTP PRO</h1>
            </div>
            <Link href="/dashboard/patron/devis">
              <Button variant="secondary" size="sm">
                Retour aux devis
              </Button>
            </Link>
          </div>
        </header>
        <div className="max-w-4xl mx-auto px-4 py-12 md:px-8">
          <div className="bg-[#1a1f3a] rounded-3xl p-8 border border-[#2a2f4a] text-center">
            <p className="text-white text-xl mb-6">Devis introuvable</p>
            <Link href="/dashboard/patron/devis">
              <Button variant="primary" size="md">
                Retour aux devis
              </Button>
            </Link>
          </div>
        </div>
      </main>
    )
  }

  // Formater le montant
  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount)
  }

  // Formater la date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  // Badge de statut
  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      brouillon: 'bg-gray-500/20 text-gray-300 border-gray-500/30',
      draft: 'bg-gray-500/20 text-gray-300 border-gray-500/30',
      envoye: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
      sent: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
      accepte: 'bg-green-500/20 text-green-300 border-green-500/30',
      refuse: 'bg-red-500/20 text-red-300 border-red-500/30',
    }
    const labels: Record<string, string> = {
      brouillon: 'Brouillon',
      draft: 'Brouillon',
      envoye: 'Envoyé',
      sent: 'Envoyé',
      accepte: 'Accepté',
      refuse: 'Refusé',
    }
    const statusKey = status as keyof typeof styles
    const style = styles[statusKey] || styles.brouillon
    const label = labels[statusKey] || status
    return (
      <span
        className={`px-4 py-2 rounded-full text-sm font-semibold border ${style}`}
      >
        {label}
      </span>
    )
  }

  // Changer le statut du devis
  const handleStatusChange = async (newStatus: QuoteStatus) => {
    if (!quote?.id) {
      setStatusError('Devis introuvable.')
      return
    }

    if (!quote?.entreprise_id) {
      setStatusError('Entreprise introuvable. Le devis n\'a pas d\'entreprise associée.')
      return
    }

    setUpdatingStatus(true)
      setStatusError(null)

      try {
        const { error: updateError } = await supabase
          .from('quotes')
          .update({ status: newStatus })
          .eq('id', quote.id)
          .eq('entreprise_id', quote.entreprise_id)

        if (updateError) {
        setStatusError(updateError.message || 'Erreur lors de la mise à jour du statut.')
        setUpdatingStatus(false)
        return
      }

      // Mettre à jour le quote localement
      setQuote({ ...quote, status: newStatus })
      setUpdatingStatus(false)
      router.refresh()
      } catch (err) {
      console.error('Unexpected error updating status:', err)
      setStatusError('Erreur lors de la mise à jour du statut.')
      setUpdatingStatus(false)
    }
  }

  // Transformer le devis en facture
  const handleCreateInvoice = async () => {
    if (!quote || !quoteId) return

    if (!quote?.entreprise_id) {
      setInvoiceError('Entreprise introuvable. Le devis n\'a pas d\'entreprise associée.')
      return
    }

    setCreatingInvoice(true)
    setInvoiceError(null)
    setInvoiceSuccess(null)

    try {
      // Récupérer le profil pour obtenir entreprise_id
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      
      if (userError || !user) {
        setInvoiceError('Utilisateur non connecté')
        setCreatingInvoice(false)
        return
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('entreprise_id')
        .eq('id', user.id)
        .single()

      if (profileError || !profile || !profile.entreprise_id) {
        setInvoiceError('Profil introuvable')
        setCreatingInvoice(false)
        return
      }

      // Vérification abonnement / essai
      const { data, error: activeError } = await supabase.rpc('is_company_active')

      if (activeError) {
        console.error('[transform_invoice] RPC is_company_active error:', activeError)
        setInvoiceError("Impossible de vérifier l'abonnement. Réessayez.")
        setCreatingInvoice(false)
        return
      }

      // Interpréter data de façon robuste
      let active = false
      if (typeof data === 'boolean') {
        active = data
      } else if (data && typeof (data as any).active === 'boolean') {
        active = (data as any).active
      }

      if (!active) {
        setInvoiceError("Votre essai est expiré. Abonnez-vous pour continuer.")
        setCreatingInvoice(false)
        router.push('/dashboard/patron/abonnement')
        return
      }

      // 1. Vérifier si une facture existe déjà pour ce devis
      const { data: existingInvoice, error: checkError } = await supabase
        .from('invoices')
        .select('id')
        .eq('quote_id', quote.id)
        .eq('entreprise_id', quote.entreprise_id)
        .limit(1)
        .maybeSingle()

      if (!checkError && existingInvoice) {
        // Facture existe déjà, stocker l'ID et afficher le message
        setExistingInvoiceId(existingInvoice.id)
        setCreatingInvoice(false)
        return
      }

      // 2. Créer la facture
      const { data: invoiceData, error: invoiceError } = await supabase
        .from('invoices')
        .insert({
          entreprise_id: quote.entreprise_id,
          quote_id: quote.id,
          title: quote.title ?? null,
          client: quote.client,
          contact: quote.contact ?? null,
          description: quote.description ?? null,
          amount_ht: quote.amount_ht ?? 0,
          status: 'draft'
        })
        .select('id')
        .single()

      if (invoiceError) {
        console.error(JSON.stringify({
          context: "create_invoice",
          message: invoiceError.message,
          details: invoiceError.details,
          hint: invoiceError.hint
        }, null, 2))

        const errorMessage = invoiceError.message
        const errorDetails = invoiceError.details ? `\n${invoiceError.details}` : ''
        setInvoiceError(`Erreur lors de la création de la facture: ${errorMessage}${errorDetails}`)
        setCreatingInvoice(false)
        return
      }

      // 3. Copier les lignes de quote_lines vers invoice_lines
      if (quoteLines.length > 0) {
        const invoiceLinesPayload = quoteLines.map((line) => ({
          invoice_id: invoiceData.id,
          description: line.description || '',
          quantity: line.quantity || 0,
          unit: line.unit || '',
          unit_price_ht: line.unit_price_ht || 0,
          total_ht: line.total_ht || 0
        }))

        const { error: linesError } = await supabase
          .from('invoice_lines')
          .insert(invoiceLinesPayload)

        if (linesError) {
          console.error(JSON.stringify({
            context: "create_invoice_lines",
            message: linesError.message,
            details: linesError.details,
            hint: linesError.hint
          }, null, 2))

          setInvoiceError(`Erreur lors de la copie des lignes: ${linesError.message}`)
          setCreatingInvoice(false)
          return
        }
      }

      // 4. Succès - stocker l'ID et rediriger vers la page détail facture
      setExistingInvoiceId(invoiceData.id)
      router.push(`/dashboard/patron/factures/${invoiceData.id}`)
    } catch (err) {
      console.error('Unexpected error creating invoice:', err)
      setInvoiceError('Erreur lors de la création de la facture.')
      setCreatingInvoice(false)
    }
  }

  // Helper pour formater les montants dans le PDF
  const formatAmountForPrint = (amount: number): string => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2
    }).format(amount)
  }

  // Helper pour les labels de statut
  const getStatusLabel = (status: string): string => {
    const labels: Record<string, string> = {
      'brouillon': 'Brouillon',
      'envoye': 'Envoyé',
      'accepte': 'Accepté',
      'refuse': 'Refusé'
    }
    return labels[status] || status
  }

  // Générer et télécharger le PDF
  const handlePrintPdf = () => {
    if (!quote) return

    const companyName = entrepriseInfo?.legal_name || entrepriseInfo?.name || "Nom de l'entreprise"
    const companyCode = entrepriseInfo?.siret || entrepriseInfo?.code || ''
    const addressLine1 = entrepriseInfo?.address_line1 || ''
    const addressLine2 = entrepriseInfo?.address_line2 || ''
    const postalCode = entrepriseInfo?.postal_code || ''
    const city = entrepriseInfo?.city || ''
    const siret = entrepriseInfo?.siret || ''
    const vatNumber = entrepriseInfo?.vat_number || ''
    const vatExemptionText = entrepriseInfo?.vat_exemption_text || ''
    const date = new Date(quote.created_at).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    })

    // Calculer les totaux
    const totalHT = quoteLines.reduce((sum, line) => sum + (parseFloat(line.total_ht) || 0), 0) || (parseFloat(quote.amount_ht) || 0)
    const tva = totalHT * 0.20 // TVA 20%
    const totalTTC = totalHT + tva

    // Pré-formater les données pour le template
    const statusLabel = getStatusLabel(quote.status)
    const formattedTotalHT = formatAmountForPrint(totalHT)
    const formattedTVA = formatAmountForPrint(tva)
    const formattedTotalTTC = formatAmountForPrint(totalTTC)
    
    // Formater les lignes
    const formattedLines = quoteLines.map(line => ({
      description: line.description || '—',
      quantity: line.quantity || '—',
      unit: line.unit || '—',
      unitPrice: formatAmountForPrint(line.unit_price_ht || 0),
      total: formatAmountForPrint(line.total_ht || 0)
    }))

    // Créer le HTML pour l'impression
    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Devis - ${quote.title}</title>
  <style>
    @page {
      size: A4;
      margin: 2cm;
    }
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      font-size: 12pt;
      line-height: 1.6;
      color: #000;
      background: #fff;
    }
    .header {
      margin-bottom: 30px;
      padding-bottom: 20px;
      border-bottom: 2px solid #333;
    }
    .header h1 {
      font-size: 24pt;
      font-weight: bold;
      margin-bottom: 5px;
    }
    .header .subtitle {
      font-size: 14pt;
      color: #666;
    }
    .info-section {
      margin-bottom: 30px;
    }
    .info-row {
      margin-bottom: 10px;
    }
    .info-label {
      font-weight: bold;
      display: inline-block;
      width: 120px;
    }
    .description {
      margin: 20px 0;
      padding: 15px;
      background: #f5f5f5;
      border-left: 4px solid #333;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
    }
    thead {
      background: #333;
      color: #fff;
    }
    th, td {
      padding: 10px;
      text-align: left;
      border-bottom: 1px solid #ddd;
    }
    th {
      font-weight: bold;
    }
    tbody tr:hover {
      background: #f9f9f9;
    }
    .text-right {
      text-align: right;
    }
    .totals {
      margin-top: 20px;
      margin-left: auto;
      width: 300px;
    }
    .totals-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px solid #ddd;
    }
    .totals-row.total {
      font-weight: bold;
      font-size: 14pt;
      border-top: 2px solid #333;
      border-bottom: 2px solid #333;
      padding-top: 10px;
      margin-top: 10px;
    }
    .status {
      display: inline-block;
      padding: 5px 15px;
      border-radius: 20px;
      font-size: 10pt;
      font-weight: bold;
      margin-left: 10px;
    }
    .status-brouillon { background: #e0e0e0; color: #333; }
    .status-envoye { background: #2196F3; color: #fff; }
    .status-accepte { background: #4CAF50; color: #fff; }
    .status-refuse { background: #f44336; color: #fff; }
  </style>
</head>
<body>
  <div class="header">
    <h1>${companyName}</h1>
    <div style="margin-top: 15px; font-size: 11pt; line-height: 1.8;">
      ${addressLine1 ? `<div>${addressLine1}</div>` : ''}
      ${addressLine2 ? `<div>${addressLine2}</div>` : ''}
      ${postalCode && city ? `<div>${postalCode} ${city}</div>` : ''}
      ${siret ? `<div style="margin-top: 8px;"><strong>SIRET:</strong> ${siret}</div>` : ''}
      ${vatNumber ? `<div><strong>TVA:</strong> ${vatNumber}</div>` : vatExemptionText ? `<div>${vatExemptionText}</div>` : ''}
    </div>
  </div>

  <div style="text-align: right; margin-bottom: 30px;">
    <h2 style="font-size: 20pt; margin-bottom: 10px;">DEVIS</h2>
    <div style="margin-bottom: 5px;">
      <strong>Devis n°:</strong> ${quote.number || '—'}
    </div>
    <div>Date: ${date}</div>
  </div>

  <div class="info-section">
    <div class="info-row">
      <span class="info-label">Client:</span>
      <span>${quote.client || '—'}</span>
    </div>
    ${quote.contact ? `
    <div class="info-row">
      <span class="info-label">Contact:</span>
      <span>${quote.contact}</span>
    </div>
    ` : ''}
    <div class="info-row">
      <span class="info-label">Statut:</span>
      <span>${statusLabel}</span>
      <span class="status status-${quote.status}">${statusLabel}</span>
    </div>
  </div>

  ${quote.description ? `
  <div class="description">
    <strong>Description des travaux:</strong><br>
    ${quote.description.replace(/\n/g, '<br>')}
  </div>
  ` : ''}

  ${quoteLines.length > 0 ? `
  <table>
    <thead>
      <tr>
        <th>Description</th>
        <th class="text-right">Qté</th>
        <th>Unité</th>
        <th class="text-right">PU HT</th>
        <th class="text-right">Total HT</th>
      </tr>
    </thead>
    <tbody>
      ${formattedLines.map(line => `
      <tr>
        <td>${line.description}</td>
        <td class="text-right">${line.quantity}</td>
        <td>${line.unit}</td>
        <td class="text-right">${line.unitPrice}</td>
        <td class="text-right">${line.total}</td>
      </tr>
      `).join('')}
    </tbody>
  </table>
  ` : ''}

  <div class="totals">
    <div class="totals-row">
      <span>Total HT:</span>
      <span>${formattedTotalHT}</span>
    </div>
    <div class="totals-row">
      <span>TVA (20%):</span>
      <span>${formattedTVA}</span>
    </div>
    <div class="totals-row total">
      <span>Total TTC:</span>
      <span>${formattedTotalTTC}</span>
    </div>
  </div>
</body>
</html>
    `

    printWindow.document.write(htmlContent)
    printWindow.document.close()

    // Attendre que le contenu soit chargé puis imprimer
    setTimeout(() => {
      printWindow.print()
      // Fermer la fenêtre après impression (optionnel)
      setTimeout(() => {
        printWindow.close()
      }, 1000)
    }, 250)

  return (
    <main className="min-h-screen bg-[#0a0e27]">
      {/* Header */}
      <header className="w-full px-4 py-6 md:px-8 border-b border-[#2a2f4a]">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-2xl flex items-center justify-center">
              <span className="text-2xl font-bold text-[#0a0e27]">B</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-white">BTP PRO</h1>
          </div>
          <Link href="/dashboard/patron">
            <Button variant="secondary" size="sm">
              Retour aux devis
            </Button>
          </Link>
        </div>
      </header>

      {/* Contenu principal */}
      <div className="max-w-4xl mx-auto px-4 py-12 md:px-8">
        <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-2">
              {quote.title}
            </h2>
            <p className="text-gray-400">
              Créé le {formatDate(quote.created_at)}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {getStatusBadge(quote.status)}
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
                  <Button variant="primary" size="md">
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
                className="w-full sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed"
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
        )

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Informations client */}
          <div className="bg-[#1a1f3a] rounded-3xl p-6 border border-[#2a2f4a]">
            <h3 className="text-lg font-semibold text-white mb-4">Client</h3>
            <p className="text-gray-200 mb-2">{quote.client}</p>
            {quote.contact && (
              <p className="text-gray-400 text-sm">{quote.contact}</p>
            )}
          </div>

          {/* Montant */}
          <div className="bg-[#1a1f3a] rounded-3xl p-6 border border-[#2a2f4a]">
            <h3 className="text-lg font-semibold text-white mb-4">Montant</h3>
            <p className="text-2xl font-bold text-white">{formatAmount(quote.amount_ht)}</p>
            <p className="text-gray-400 text-sm mt-1">Hors taxes</p>
          </div>

          {/* Statut */}
          <div className="bg-[#1a1f3a] rounded-3xl p-6 border border-[#2a2f4a]">
            <h3 className="text-lg font-semibold text-white mb-4">Statut</h3>
            {getStatusBadge(quote.status)}
          </div>
        </div>

        {/* Description */}
        {quote.description && (
          <div className="bg-[#1a1f3a] rounded-3xl p-6 border border-[#2a2f4a] mb-8">
            <h3 className="text-lg font-semibold text-white mb-4">Description des travaux</h3>
            <p className="text-gray-200 whitespace-pre-wrap leading-relaxed">
              {quote.description}
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="bg-[#1a1f3a] rounded-3xl p-6 border border-[#2a2f4a]">
          <h3 className="text-lg font-semibold text-white mb-4">Actions</h3>
          
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
                    className="bg-green-500 hover:bg-green-600"
                  >
                    Marquer comme accepté
                  </Button>
                  <Button
                    variant="secondary"
                    size="md"
                    onClick={() => handleStatusChange('refuse')}
                    disabled={updatingStatus}
                    className="border-red-500/50 text-red-300 hover:bg-red-500/10"
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
              className="w-full sm:w-auto mb-4"
            >
              📄 Télécharger en PDF
            </Button>
          </div>

        </div>
      </div>
    </main>
  )
}
