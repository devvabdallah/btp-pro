'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import Link from 'next/link'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'

export default function InvoiceDetailPage() {
  const { id } = useParams()
  const router = useRouter()
  const invoiceId = id as string | undefined
  
  const [loading, setLoading] = useState(true)
  const [invoice, setInvoice] = useState<any>(null)
  const [invoiceLines, setInvoiceLines] = useState<any[]>([])
  const [updating, setUpdating] = useState(false)
  const [actionError, setActionError] = useState<string>('')
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [editedInvoice, setEditedInvoice] = useState<any>(null)
  const [editedLines, setEditedLines] = useState<any[]>([])
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saveSuccess, setSaveSuccess] = useState(false)
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
  const [invoiceNotFound, setInvoiceNotFound] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!invoiceId) return

    async function load() {
      setLoading(true)
      setError(null)
      setInvoiceNotFound(false)

      try {
        // 1. Récupérer l'utilisateur
        const { data: { user }, error: userError } = await supabase.auth.getUser()

        if (userError || !user) {
          setError('Non connecté')
          setLoading(false)
          return
        }

        // 2. Charger la facture
        const { data: invoiceData, error: invoiceError } = await supabase
          .from('invoices')
          .select('id, entreprise_id, quote_id, title, client, contact, description, amount_ht, status, created_at, updated_at, number')
          .eq('id', invoiceId)
          .single()

        if (invoiceError || !invoiceData) {
          setInvoiceNotFound(true)
          setLoading(false)
          return
        }

        setInvoice(invoiceData)
        // Initialiser les états d'édition avec les données chargées
        setEditedInvoice({ ...invoiceData })

        // 3. Charger les lignes de facture
        try {
          const { data: linesData, error: linesError } = await supabase
            .from('invoice_lines')
            .select('id, invoice_id, description, quantity, unit, unit_price_ht, total_ht')
            .eq('invoice_id', invoiceData.id)
            .order('created_at', { ascending: true })

          if (!linesError && linesData) {
            const lines = linesData || []
            setInvoiceLines(lines)
            // Initialiser les lignes éditées
            setEditedLines(lines.map((line: any) => ({
              id: line.id || crypto.randomUUID(),
              description: line.description || '',
              quantity: line.quantity || 0,
              unit: line.unit || 'pièce',
              unit_price_ht: line.unit_price_ht || 0,
              total_ht: line.total_ht || 0
            })))
          } else {
            // Ne pas bloquer si les lignes ne sont pas trouvées
            setInvoiceLines([])
            setEditedLines([])
          }
        } catch (err) {
          // Table invoice_lines peut ne pas exister, on continue sans lignes
          console.log('invoice_lines table may not exist, continuing without lines')
          setInvoiceLines([])
        }

        // 4. Charger l'entreprise pour le PDF
        if (invoiceData?.entreprise_id) {
          try {
            const { data: companyData, error: companyError } = await supabase
              .from('entreprises')
              .select('id, name, code, legal_name, address_line1, address_line2, postal_code, city, siret, vat_number, vat_exemption_text')
              .eq('id', invoiceData.entreprise_id)
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
            } else {
              setCompany(null)
            }
          } catch (err) {
            setCompany(null)
          }
        }
      } catch (err) {
        console.error('Unexpected error:', err)
        setError('Une erreur inattendue est survenue.')
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [invoiceId])

  // Formater le montant
  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2
    }).format(amount)
  }

  // Formater la date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    })
  }

  // Badge de statut
  const getStatusBadge = (status: string) => {
    const styles = {
      draft: 'bg-gray-500/20 text-gray-300 border-gray-500/30',
      sent: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
      paid: 'bg-green-500/20 text-green-300 border-green-500/30',
    }
    const labels = {
      draft: 'Brouillon',
      sent: 'Envoyée',
      paid: 'Payée',
    }
    return (
      <span
        className={`px-3 py-1 rounded-full text-xs font-semibold border ${styles[status as keyof typeof styles] || styles.draft}`}
      >
        {labels[status as keyof typeof labels] || status}
      </span>
    )
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
      'draft': 'Brouillon',
      'sent': 'Envoyée',
      'paid': 'Payée'
    }
    return labels[status] || status
  }

  // Marquer la facture comme payée
  const handleMarkPaid = async () => {
    if (!invoice || !invoiceId) return

    setUpdating(true)
    setActionError('')

    try {
      // 1. Récupérer l'utilisateur
      const { data: { user }, error: userError } = await supabase.auth.getUser()

      if (userError || !user) {
        setActionError('Utilisateur non connecté')
        setUpdating(false)
        return
      }

      // 2. Récupérer entreprise_id via profiles
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('entreprise_id')
        .eq('id', user.id)
        .single()

      if (profileError || !profile || !profile.entreprise_id) {
        setActionError('Entreprise introuvable')
        setUpdating(false)
        return
      }

      // 3. Mettre à jour le statut
      const { error: updateError } = await supabase
        .from('invoices')
        .update({ status: 'paid' })
        .eq('id', invoice.id)
        .eq('entreprise_id', profile.entreprise_id)

      if (updateError) {
        setActionError(updateError.message || 'Erreur lors de la mise à jour')
        setUpdating(false)
        return
      }

      // 4. Mettre à jour le state local
      setInvoice({ ...invoice, status: 'paid' })
      setUpdating(false)
    } catch (err) {
      console.error('Unexpected error marking invoice as paid:', err)
      setActionError('Erreur lors de la mise à jour')
      setUpdating(false)
    }
  }

  // Handlers pour l'édition
  const handleEdit = () => {
    setIsEditing(true)
    setEditedInvoice({ ...invoice })
    setEditedLines(invoiceLines.map((line: any) => ({
      id: line.id || crypto.randomUUID(),
      description: line.description || '',
      quantity: line.quantity || 0,
      unit: line.unit || 'pièce',
      unit_price_ht: line.unit_price_ht || 0,
      total_ht: line.total_ht || 0
    })))
    setSaveError(null)
    setSaveSuccess(false)
  }

  const handleCancel = () => {
    setIsEditing(false)
    setEditedInvoice({ ...invoice })
    setEditedLines(invoiceLines.map((line: any) => ({
      id: line.id || crypto.randomUUID(),
      description: line.description || '',
      quantity: line.quantity || 0,
      unit: line.unit || 'pièce',
      unit_price_ht: line.unit_price_ht || 0,
      total_ht: line.total_ht || 0
    })))
    setSaveError(null)
    setSaveSuccess(false)
  }

  const handleSave = async () => {
    if (!invoice?.id || !invoice?.entreprise_id) {
      setSaveError('Facture introuvable')
      return
    }

    setSaving(true)
    setSaveError(null)
    setSaveSuccess(false)

    try {
      const supabase = createSupabaseBrowserClient()

      // 1. Calculer le total HT depuis les lignes
      const totalHT = editedLines.reduce((sum, line) => {
        const qty = parseFloat(line.quantity) || 0
        const price = parseFloat(line.unit_price_ht) || 0
        return sum + (qty * price)
      }, 0)

      // 2. Mettre à jour la facture
      const { error: updateError } = await supabase
        .from('invoices')
        .update({
          title: editedInvoice.title?.trim() || 'Facture sans titre',
          client: editedInvoice.client?.trim() || '',
          contact: editedInvoice.contact?.trim() || null,
          description: editedInvoice.description?.trim() || null,
          amount_ht: totalHT,
          updated_at: new Date().toISOString()
        })
        .eq('id', invoice.id)
        .eq('entreprise_id', invoice.entreprise_id)

      if (updateError) {
        setSaveError(`Erreur lors de la mise à jour: ${updateError.message}`)
        setSaving(false)
        return
      }

      // 3. Supprimer toutes les lignes existantes
      const { error: deleteError } = await supabase
        .from('invoice_lines')
        .delete()
        .eq('invoice_id', invoice.id)

      if (deleteError) {
        console.error('Error deleting lines:', deleteError)
        // Ne pas bloquer si la suppression échoue (peut-être pas de lignes)
      }

      // 4. Insérer les nouvelles lignes (seulement celles avec description)
      const linesToInsert = editedLines
        .filter((line) => line.description?.trim())
        .map((line) => {
          const qty = parseFloat(line.quantity) || 0
          const price = parseFloat(line.unit_price_ht) || 0
          return {
            invoice_id: invoice.id,
            description: line.description.trim(),
            quantity: qty,
            unit: line.unit?.trim() || 'pièce',
            unit_price_ht: price,
            total_ht: qty * price
          }
        })

      if (linesToInsert.length > 0) {
        const { error: insertError } = await supabase
          .from('invoice_lines')
          .insert(linesToInsert)

        if (insertError) {
          setSaveError(`Erreur lors de la sauvegarde des lignes: ${insertError.message}`)
          setSaving(false)
          return
        }
      }

      // 5. Recharger les données
      router.refresh()
      
      // Recharger manuellement les données
      const { data: updatedInvoice } = await supabase
        .from('invoices')
        .select('id, entreprise_id, quote_id, title, client, contact, description, amount_ht, status, created_at, updated_at, number')
        .eq('id', invoice.id)
        .single()

      if (updatedInvoice) {
        setInvoice(updatedInvoice)
        setEditedInvoice({ ...updatedInvoice })
      }

      const { data: updatedLines } = await supabase
        .from('invoice_lines')
        .select('id, invoice_id, description, quantity, unit, unit_price_ht, total_ht')
        .eq('invoice_id', invoice.id)
        .order('created_at', { ascending: true })

      if (updatedLines) {
        setInvoiceLines(updatedLines)
        setEditedLines(updatedLines.map((line: any) => ({
          id: line.id || crypto.randomUUID(),
          description: line.description || '',
          quantity: line.quantity || 0,
          unit: line.unit || 'pièce',
          unit_price_ht: line.unit_price_ht || 0,
          total_ht: line.total_ht || 0
        })))
      }

      setIsEditing(false)
      setSaving(false)
      setSaveSuccess(true)
      // Masquer le message de succès après 3 secondes
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch (err) {
      console.error('Unexpected error saving invoice:', err)
      setSaveError('Erreur lors de la sauvegarde')
      setSaving(false)
    }
  }

  const updateEditedInvoice = (field: string, value: any) => {
    setEditedInvoice({ ...editedInvoice, [field]: value })
  }

  const updateEditedLine = (index: number, field: string, value: any) => {
    const updated = [...editedLines]
    updated[index] = { ...updated[index], [field]: value }
    // Recalculer total_ht si quantity ou unit_price_ht change
    if (field === 'quantity' || field === 'unit_price_ht') {
      const qty = parseFloat(updated[index].quantity) || 0
      const price = parseFloat(updated[index].unit_price_ht) || 0
      updated[index].total_ht = qty * price
    }
    setEditedLines(updated)
    
    // Recalculer le total HT de la facture
    const totalHT = updated.reduce((sum, line) => {
      const qty = parseFloat(line.quantity) || 0
      const price = parseFloat(line.unit_price_ht) || 0
      return sum + (qty * price)
    }, 0)
    setEditedInvoice({ ...editedInvoice, amount_ht: totalHT })
  }

  const addEditedLine = () => {
    setEditedLines([
      ...editedLines,
      {
        id: crypto.randomUUID(),
        description: '',
        quantity: 1,
        unit: 'pièce',
        unit_price_ht: 0,
        total_ht: 0
      }
    ])
  }

  const removeEditedLine = (index: number) => {
    setEditedLines(editedLines.filter((_, i) => i !== index))
    
    // Recalculer le total HT
    const updated = editedLines.filter((_, i) => i !== index)
    const totalHT = updated.reduce((sum, line) => {
      const qty = parseFloat(line.quantity) || 0
      const price = parseFloat(line.unit_price_ht) || 0
      return sum + (qty * price)
    }, 0)
    setEditedInvoice({ ...editedInvoice, amount_ht: totalHT })
  }

  const getTotalHT = () => {
    if (isEditing && editedLines.length > 0) {
      return editedLines.reduce((sum, line) => {
        const qty = parseFloat(line.quantity) || 0
        const price = parseFloat(line.unit_price_ht) || 0
        return sum + (qty * price)
      }, 0)
    }
    return invoiceLines.length > 0
      ? invoiceLines.reduce((sum, line) => sum + (parseFloat(line.total_ht) || 0), 0)
      : (parseFloat(invoice?.amount_ht) || 0)
  }

  const displayInvoice = isEditing && editedInvoice ? editedInvoice : invoice

  // Supprimer la facture
  const handleDelete = async () => {
    if (!invoice?.id) {
      setDeleteError('Facture introuvable')
      return
    }

    // Confirmation
    const confirmed = window.confirm('Supprimer cette facture ? Cette action est irréversible.')
    if (!confirmed) {
      return
    }

    setDeleting(true)
    setDeleteError(null)

    try {
      // Récupérer la session Supabase pour obtenir le token
      const supabaseClient = createSupabaseBrowserClient()
      const { data: { session }, error: sessionError } = await supabaseClient.auth.getSession()

      if (sessionError || !session || !session.access_token) {
        setDeleteError('Veuillez vous reconnecter')
        setDeleting(false)
        return
      }

      // Appeler la route API centralisée avec le token dans le header
      const response = await fetch('/api/admin/delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ type: 'invoice', id: invoice.id }),
      })

      const data = await response.json()

      if (!data.ok) {
        setDeleteError(data.message || 'Erreur lors de la suppression de la facture')
        setDeleting(false)
        return
      }

      // Rediriger vers la liste des factures
      router.push('/dashboard/patron/factures')
    } catch (err) {
      console.error('Unexpected error deleting invoice:', err)
      setDeleteError('Erreur lors de la suppression de la facture')
      setDeleting(false)
    }
  }

  // Générer et télécharger le PDF
  const handlePrintPdf = () => {
    if (!invoice) return

    const companyName = company?.legal_name || company?.name || "Nom de l'entreprise"
    const companyCode = company?.siret || company?.code || ''
    const addressLine1 = company?.address_line1 || ''
    const addressLine2 = company?.address_line2 || ''
    const postalCode = company?.postal_code || ''
    const city = company?.city || ''
    const siret = company?.siret || ''
    const vatNumber = company?.vat_number || ''
    const vatExemptionText = company?.vat_exemption_text || ''
    const date = new Date(invoice.created_at).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    })

    // Calculer les totaux : utiliser les lignes si disponibles, sinon fallback sur invoice.amount_ht
    const totalHT = invoiceLines.length > 0
      ? invoiceLines.reduce((sum, line) => sum + (parseFloat(line.total_ht) || 0), 0)
      : (parseFloat(invoice.amount_ht) || 0)
    const tva = totalHT * 0.20 // TVA 20%
    const totalTTC = totalHT + tva

    // Pré-formater les données pour le template
    const statusLabel = getStatusLabel(invoice.status)
    const formattedTotalHT = formatAmountForPrint(totalHT)
    const formattedTVA = formatAmountForPrint(tva)
    const formattedTotalTTC = formatAmountForPrint(totalTTC)
    
    // Formater les lignes pour le PDF
    const formattedLines = invoiceLines.map(line => ({
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
  <title>Facture - ${invoice.title || invoice.client}</title>
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
    .status-draft { background: #e0e0e0; color: #333; }
    .status-sent { background: #2196F3; color: #fff; }
    .status-paid { background: #4CAF50; color: #fff; }
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
    <h2 style="font-size: 20pt; margin-bottom: 10px;">FACTURE</h2>
    <div style="margin-bottom: 5px;">
      <strong>Facture n°:</strong> ${invoice.number || '—'}
    </div>
    <div>Date: ${date}</div>
  </div>

  <div class="info-section">
    <div class="info-row">
      <span class="info-label">Client:</span>
      <span>${invoice.client || '—'}</span>
    </div>
    ${invoice.contact ? `
    <div class="info-row">
      <span class="info-label">Contact:</span>
      <span>${invoice.contact}</span>
    </div>
    ` : ''}
    <div class="info-row">
      <span class="info-label">Statut:</span>
      <span>${statusLabel}</span>
      <span class="status status-${invoice.status}">${statusLabel}</span>
    </div>
  </div>

  ${invoice.description ? `
  <div class="description">
    <strong>Description des travaux:</strong><br>
    ${invoice.description.replace(/\n/g, '<br>')}
  </div>
  ` : ''}

  ${formattedLines.length > 0 ? `
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
  }

  // Garde si invoiceId n'est pas disponible
  if (!invoiceId) {
    return (
      <main className="min-h-screen bg-[#0a0e27] flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-400 mb-4">Chargement...</p>
        </div>
      </main>
    )
  }

  // État de chargement
  if (loading) {
    return (
      <main className="min-h-screen bg-[#0a0e27] flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-400">Chargement de la facture...</p>
        </div>
      </main>
    )
  }

  // Erreur
  if (error) {
    return (
      <main className="min-h-screen bg-[#0a0e27]">
        <div className="max-w-4xl mx-auto px-4 py-12 md:px-8">
          <div className="bg-red-500/20 border border-red-500/50 rounded-3xl p-6 mb-6">
            <p className="text-red-400">{error}</p>
          </div>
          <Link href="/dashboard/patron/factures">
            <Button variant="secondary" className="min-h-[48px] px-6 text-base font-semibold">Retour aux factures</Button>
          </Link>
        </div>
      </main>
    )
  }

  // Facture introuvable
  if (invoiceNotFound || !invoice) {
    return (
      <main className="min-h-screen bg-[#0a0e27]">
        <div className="max-w-4xl mx-auto px-4 py-12 md:px-8">
          <div className="bg-[#1a1f3a] rounded-3xl p-6 border border-[#2a2f4a] mb-6">
            <h2 className="text-2xl font-bold text-white mb-4">Facture introuvable</h2>
            <p className="text-gray-400 mb-6">La facture demandée n'existe pas ou n'est plus disponible.</p>
            <Link href="/dashboard/patron/factures">
              <Button variant="secondary" className="min-h-[48px] px-6 text-base font-semibold">Retour aux factures</Button>
            </Link>
          </div>
        </div>
      </main>
    )
  }

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
          <Link href="/dashboard/patron/factures">
            <Button variant="secondary" size="sm" className="min-h-[48px] px-6 text-base font-semibold">
              Retour aux factures
            </Button>
          </Link>
        </div>
      </header>

      {/* Contenu principal */}
      <div className="max-w-4xl mx-auto px-4 py-12 md:px-8">
        <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex-1">
            {isEditing ? (
              <Input
                label=""
                value={displayInvoice.title || ''}
                onChange={(e) => updateEditedInvoice('title', e.target.value)}
                placeholder="Titre de la facture"
                className="text-3xl md:text-4xl font-bold"
              />
            ) : (
              <>
                <h2 className="text-3xl md:text-4xl font-bold text-white mb-2">
                  {invoice.title || 'Facture'}
                </h2>
                <p className="text-gray-400">
                  Créée le {formatDate(invoice.created_at)}
                </p>
              </>
            )}
          </div>
          <div className="flex items-center gap-3">
            {getStatusBadge(invoice.status)}
            {!isEditing && (
              <Button
                variant="secondary"
                size="md"
                onClick={handleEdit}
                className="min-h-[48px] px-6 text-base font-semibold"
              >
                ✏️ Modifier
              </Button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Informations client */}
          <div className="bg-[#1a1f3a] rounded-3xl p-6 border border-[#2a2f4a]">
            <h3 className="text-lg font-semibold text-white mb-4">Client</h3>
            {isEditing ? (
              <div className="space-y-4">
                <Input
                  label=""
                  value={displayInvoice.client || ''}
                  onChange={(e) => updateEditedInvoice('client', e.target.value)}
                  placeholder="Nom du client"
                  className="text-gray-200"
                />
                <Input
                  label=""
                  value={displayInvoice.contact || ''}
                  onChange={(e) => updateEditedInvoice('contact', e.target.value)}
                  placeholder="Contact (optionnel)"
                  className="text-gray-400 text-sm"
                />
              </div>
            ) : (
              <>
                <p className="text-gray-200 mb-2">{invoice.client}</p>
                {invoice.contact && (
                  <p className="text-gray-400 text-sm">{invoice.contact}</p>
                )}
              </>
            )}
          </div>

          {/* Montant */}
          <div className="bg-[#1a1f3a] rounded-3xl p-6 border border-[#2a2f4a]">
            <h3 className="text-lg font-semibold text-white mb-4">Montant</h3>
            <p className="text-2xl font-bold text-white">
              {formatAmount(getTotalHT())}
            </p>
            <p className="text-gray-400 text-sm mt-1">Hors taxes</p>
          </div>

          {/* Statut */}
          <div className="bg-[#1a1f3a] rounded-3xl p-6 border border-[#2a2f4a]">
            <h3 className="text-lg font-semibold text-white mb-4">Statut</h3>
            {getStatusBadge(invoice.status)}
            {invoice.updated_at !== invoice.created_at && (
              <p className="text-gray-400 text-xs mt-3">
                Modifiée le {formatDate(invoice.updated_at)}
              </p>
            )}
          </div>
        </div>

        {/* Description */}
        {(invoice.description || isEditing) && (
          <div className="bg-[#1a1f3a] rounded-3xl p-6 border border-[#2a2f4a] mb-8">
            <h3 className="text-lg font-semibold text-white mb-4">Description des travaux</h3>
            {isEditing ? (
              <textarea
                value={displayInvoice.description || ''}
                onChange={(e) => updateEditedInvoice('description', e.target.value)}
                placeholder="Description des travaux..."
                className="w-full px-4 py-3 bg-[#0f1429] border border-gray-600 rounded-2xl text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent transition-all resize-none"
                rows={5}
              />
            ) : (
              <p className="text-gray-200 whitespace-pre-wrap leading-relaxed">
                {invoice.description}
              </p>
            )}
          </div>
        )}

        {/* Lignes de facture - Mode édition */}
        {isEditing && (
          <div className="bg-[#1a1f3a] rounded-3xl p-6 border border-[#2a2f4a] mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
              <h3 className="text-lg font-semibold text-white">Lignes de facture</h3>
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
                  className="bg-[#0f1429] rounded-2xl p-5 md:p-4 border-2 border-[#2a2f4a] hover:border-yellow-500/30 transition-all"
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
                        className="w-full px-4 py-3 bg-[#020617] border border-gray-600 rounded-xl text-base text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-yellow-400"
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

        {/* Lignes de facture - Mode lecture */}
        {!isEditing && (
          <div className="bg-[#1a1f3a] rounded-3xl p-6 border border-[#2a2f4a] mb-8">
            <h3 className="text-lg font-semibold text-white mb-4">Lignes de facture</h3>
            {invoiceLines.length === 0 ? (
              <p className="text-gray-400">Aucune ligne de facture</p>
            ) : (
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
                  {invoiceLines.map((line) => (
                    <tr key={line.id} className="border-b border-[#2a2f4a]">
                      <td className="py-3 px-4 text-gray-200">{line.description || '—'}</td>
                      <td className="py-3 px-4 text-gray-200 text-right">{line.quantity || '—'}</td>
                      <td className="py-3 px-4 text-gray-200">{line.unit || '—'}</td>
                      <td className="py-3 px-4 text-gray-200 text-right">{formatAmount(line.unit_price_ht || 0)}</td>
                      <td className="py-3 px-4 text-white font-semibold text-right">{formatAmount(line.total_ht || 0)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-[#2a2f4a]">
                    <td colSpan={4} className="py-3 px-4 text-white font-semibold text-right">Total HT</td>
                    <td className="py-3 px-4 text-white font-bold text-right">
                      {formatAmount(
                        invoiceLines.reduce((sum, line) => sum + (parseFloat(line.total_ht) || 0), 0)
                      )}
                    </td>
                  </tr>
                  <tr>
                    <td colSpan={4} className="py-3 px-4 text-white font-semibold text-right">TVA (20%)</td>
                    <td className="py-3 px-4 text-white font-bold text-right">
                      {formatAmount(
                        invoiceLines.reduce((sum, line) => sum + (parseFloat(line.total_ht) || 0), 0) * 0.20
                      )}
                    </td>
                  </tr>
                  <tr className="border-t-2 border-[#2a2f4a]">
                    <td colSpan={4} className="py-3 px-4 text-white font-bold text-right text-lg">Total TTC</td>
                    <td className="py-3 px-4 text-white font-bold text-right text-lg">
                      {formatAmount(
                        invoiceLines.reduce((sum, line) => sum + (parseFloat(line.total_ht) || 0), 0) * 1.20
                      )}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
          </div>
        )}

        {/* Actions */}
        <div className="bg-[#1a1f3a] rounded-3xl p-6 border border-[#2a2f4a]">
          <h3 className="text-lg font-semibold text-white mb-4">Actions</h3>
          
          {/* Message d'erreur */}
          {actionError && (
            <div className="mb-4 bg-red-500/20 border border-red-500/50 rounded-xl p-3">
              <p className="text-red-400 text-sm">{actionError}</p>
            </div>
          )}

          {/* Message d'erreur suppression */}
          {deleteError && (
            <div className="mb-4 bg-red-500/20 border border-red-500/50 rounded-xl p-3">
              <p className="text-red-400 text-sm">{deleteError}</p>
            </div>
          )}

          {/* Messages d'erreur sauvegarde */}
          {saveError && (
            <div className="mb-4 bg-red-500/20 border border-red-500/50 rounded-xl p-3">
              <p className="text-red-400 text-sm">{saveError}</p>
            </div>
          )}

          {/* Message de succès sauvegarde */}
          {saveSuccess && (
            <div className="mb-4 bg-green-500/20 border border-green-500/50 rounded-xl p-3">
              <p className="text-green-400 text-sm">Facture enregistrée avec succès</p>
            </div>
          )}

          {/* Boutons Enregistrer/Annuler en mode édition */}
          {isEditing && (
            <div className="mb-6 flex flex-wrap gap-3">
              <Button
                variant="primary"
                size="md"
                onClick={handleSave}
                disabled={saving}
                className="min-h-[48px] px-6 text-base font-semibold"
              >
                {saving ? 'Enregistrement...' : '💾 Enregistrer'}
              </Button>
              <Button
                variant="secondary"
                size="md"
                onClick={handleCancel}
                disabled={saving}
                className="min-h-[48px] px-6 text-base font-semibold"
              >
                Annuler
              </Button>
            </div>
          )}

          {!isEditing && (
            <div className="space-y-4">
              <Button
                variant="primary"
                size="md"
                onClick={handlePrintPdf}
                className="w-full sm:w-auto min-h-[48px] px-6 text-base font-semibold"
              >
                📄 Télécharger en PDF
              </Button>

              {/* Bouton "Marquer comme payée" ou badge "Payée" */}
              {invoice.status === 'paid' ? (
                <div className="inline-block">
                  {getStatusBadge('paid')}
                </div>
              ) : (
                <Button
                  variant="secondary"
                  size="md"
                  onClick={handleMarkPaid}
                  disabled={updating}
                  className="w-full sm:w-auto min-h-[48px] px-6 text-base font-semibold bg-green-500/20 hover:bg-green-500/30 border-green-500/50 text-green-300"
                >
                  {updating ? 'Mise à jour...' : '✅ Marquer comme payée'}
                </Button>
              )}
            </div>
          )}

          {/* Supprimer la facture */}
          {!isEditing && (
            <div className="mt-6 pt-6 border-t border-[#2a2f4a]">
              <Button
                variant="secondary"
                size="md"
                onClick={handleDelete}
                disabled={deleting}
                className="w-full sm:w-auto min-h-[48px] px-6 text-base font-semibold border-red-500/50 text-red-300 hover:bg-red-500/10 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {deleting ? 'Suppression...' : '🗑️ Supprimer cette facture'}
              </Button>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
