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
  const [profileFullName, setProfileFullName] = useState<string | null>(null)
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

        // 1.1. Charger le profil utilisateur pour le nom complet
        try {
          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', user.id)
            .single()

          if (!profileError && profileData) {
            setProfileFullName(profileData?.full_name ?? null)
          } else {
            setProfileFullName(null)
          }
        } catch (err) {
          setProfileFullName(null)
        }

        // 2. Charger la facture
        const { data: invoiceData, error: invoiceError } = await supabase
          .from('invoices')
          .select('id, entreprise_id, quote_id, title, client, contact, description, amount_ht, status, created_at, updated_at, number, client_address_line1, client_address_line2, client_postal_code, client_city, due_date, payment_method')
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
          client_address_line1: editedInvoice.client_address_line1?.trim() || null,
          client_address_line2: editedInvoice.client_address_line2?.trim() || null,
          client_postal_code: editedInvoice.client_postal_code?.trim() || null,
          client_city: editedInvoice.client_city?.trim() || null,
          due_date: editedInvoice.due_date || null,
          payment_method: editedInvoice.payment_method?.trim() || null,
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
        .select('id, entreprise_id, quote_id, title, client, contact, description, amount_ht, status, created_at, updated_at, number, client_address_line1, client_address_line2, client_postal_code, client_city, due_date, payment_method')
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

    const companyName =
      (company?.legal_name ?? '').trim()
      || (company?.name ?? '').trim()
      || "Nom de l'entreprise"
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

    // Calculer la date d'échéance (si vide, created_at + 30 jours)
    const dueDate = invoice.due_date 
      ? new Date(invoice.due_date)
      : (() => {
          const d = new Date(invoice.created_at)
          d.setDate(d.getDate() + 30)
          return d
        })()
    const formattedDueDate = dueDate.toLocaleDateString('fr-FR', {
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
      font-size: 11pt;
      line-height: 1.5;
      color: #000;
      background: #fff;
    }
    .header {
      margin-bottom: 35px;
      padding-bottom: 15px;
      border-bottom: 1px solid #333;
    }
    .header-company-name {
      font-size: 16pt;
      font-weight: bold;
      margin-bottom: 8px;
      color: #000;
    }
    .header-company-info {
      font-size: 10pt;
      line-height: 1.6;
      color: #333;
    }
    .header-company-info div {
      margin-bottom: 2px;
    }
    .document-info {
      margin-bottom: 30px;
      padding: 12px 0;
    }
    .document-title {
      font-size: 16pt;
      font-weight: bold;
      margin-bottom: 8px;
      color: #000;
    }
    .document-number {
      font-size: 10pt;
      margin-bottom: 4px;
      color: #333;
    }
    .document-date {
      font-size: 10pt;
      color: #333;
    }
    .client-section {
      margin-bottom: 25px;
      padding: 10px 0;
      border-top: 1px solid #ddd;
      border-bottom: 1px solid #ddd;
    }
    .client-section h3 {
      font-size: 11pt;
      font-weight: bold;
      margin-bottom: 6px;
      color: #000;
    }
    .client-section p {
      font-size: 10pt;
      margin-bottom: 2px;
      color: #333;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
      font-size: 10pt;
    }
    thead {
      background: #333;
      color: #fff;
    }
    th, td {
      padding: 8px 10px;
      text-align: left;
      border: 1px solid #333;
    }
    th {
      font-weight: bold;
      font-size: 10pt;
    }
    tbody tr {
      border-bottom: 1px solid #ddd;
    }
    tbody tr:nth-child(even) {
      background: #f9f9f9;
    }
    .text-right {
      text-align: right;
    }
    .totals {
      margin-top: 25px;
      margin-left: auto;
      width: 300px;
      font-size: 10pt;
    }
    .totals-row {
      display: flex;
      justify-content: space-between;
      padding: 6px 0;
      border-bottom: 1px solid #ddd;
    }
    .totals-row.total {
      font-weight: bold;
      font-size: 12pt;
      border-top: 2px solid #333;
      border-bottom: 2px solid #333;
      padding-top: 8px;
      margin-top: 8px;
    }
    .footer {
      margin-top: 50px;
      padding-top: 15px;
      border-top: 1px solid #ddd;
      font-size: 8pt;
      color: #555;
      line-height: 1.5;
    }
    .footer-text {
      margin-bottom: 6px;
    }
    .page-break {
      page-break-inside: avoid;
    }
  </style>
</head>
<body>
  <div class="header page-break">
    <div class="header-company-name">${companyName}</div>
    <div class="header-company-info">
      ${(addressLine1 || addressLine2 || postalCode || city) ? `
      <div style="margin-bottom: 4px;">
        ${addressLine1 ? `<div>${addressLine1}</div>` : ''}
        ${addressLine2 ? `<div>${addressLine2}</div>` : ''}
        ${(postalCode || city) ? `<div>${[postalCode, city].filter(Boolean).join(' ')}</div>` : ''}
      </div>
      ` : ''}
      ${siret ? `<div style="margin-top: 6px;">SIRET : ${siret}</div>` : ''}
      ${vatNumber ? `<div>TVA : ${vatNumber}</div>` : '<div>TVA non applicable, art. 293 B du CGI</div>'}
      ${profileFullName ? `<div style="margin-top: 6px;">Établi par : ${profileFullName}</div>` : ''}
    </div>
  </div>

  <div class="document-info page-break">
    <div class="document-title">FACTURE</div>
    <div class="document-number"><strong>Facture n°</strong> : ${invoice.number || '—'}</div>
    <div class="document-date"><strong>Date</strong> : ${date}</div>
  </div>

  <div class="client-section page-break">
    <h3>Facturé à :</h3>
    <p><strong>${invoice.client || '—'}</strong></p>
    ${invoice.contact ? `<p>${invoice.contact}</p>` : ''}
    ${(invoice.client_address_line1 || invoice.client_address_line2 || invoice.client_postal_code || invoice.client_city) ? `
    <div style="margin-top: 8px;">
      ${invoice.client_address_line1 ? `<p>${invoice.client_address_line1}</p>` : ''}
      ${invoice.client_address_line2 ? `<p>${invoice.client_address_line2}</p>` : ''}
      ${(invoice.client_postal_code || invoice.client_city) ? `<p>${[invoice.client_postal_code, invoice.client_city].filter(Boolean).join(' ')}</p>` : ''}
    </div>
    ` : ''}
  </div>

  ${invoice.description ? `
  <div class="page-break" style="margin: 20px 0; padding: 10px 0; font-size: 10pt; border-top: 1px solid #ddd; border-bottom: 1px solid #ddd;">
    <strong>Description des travaux :</strong><br>
    <div style="margin-top: 6px;">${invoice.description.replace(/\n/g, '<br>')}</div>
  </div>
  ` : ''}

  ${formattedLines.length > 0 ? `
  <div class="page-break">
    <table>
      <thead>
        <tr>
          <th style="width: 40%;">Description</th>
          <th style="width: 10%;" class="text-right">Qté</th>
          <th style="width: 15%;">Unité</th>
          <th style="width: 17%;" class="text-right">Prix Unitaire HT</th>
          <th style="width: 18%;" class="text-right">Total Ligne HT</th>
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
  </div>
  ` : ''}

  <div class="totals page-break">
    <div class="totals-row">
      <span>Total HT</span>
      <span>${formattedTotalHT}</span>
    </div>
    <div class="totals-row">
      <span>TVA (20%)</span>
      <span>${formattedTVA}</span>
    </div>
    <div class="totals-row total">
      <span>Total TTC</span>
      <span>${formattedTotalTTC}</span>
    </div>
  </div>

  <div class="footer page-break">
    ${invoice.payment_method ? `<div class="footer-text"><strong>Mode de paiement :</strong> ${invoice.payment_method}</div>` : ''}
    <div class="footer-text"><strong>Échéance :</strong> ${formattedDueDate}</div>
    <div class="footer-text">Pénalités de retard exigibles au taux légal en vigueur.</div>
    <div class="footer-text">Indemnité forfaitaire pour frais de recouvrement : 40 € (art. L441-10 du Code de commerce).</div>
  </div>
</body>
</html>
    `

    printWindow.document.write(htmlContent)
    printWindow.document.close()
    
    // Forcer le titre de l'onglet
    printWindow.document.title = `Facture - ${invoice.title || invoice.client}`

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
            <h1 className="text-2xl md:text-3xl font-bold text-white">
              {company?.legal_name || (company?.name && company.name !== "BTP PRO" ? company.name : "BTP PRO")}
            </h1>
          </div>
          <Link href="/dashboard/patron/factures">
            <Button variant="secondary" size="sm" className="min-h-[48px] px-6 text-base font-semibold">
              Retour aux factures
            </Button>
          </Link>
        </div>
      </header>

      {/* Contenu principal */}
      <div className="max-w-4xl mx-auto px-4 py-12 md:px-8 lg:py-16">
        <div className="mb-10 md:mb-12 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="flex-1">
            {isEditing ? (
              <Input
                label=""
                value={displayInvoice.title || ''}
                onChange={(e) => updateEditedInvoice('title', e.target.value)}
                placeholder="Titre de la facture"
                className="text-3xl md:text-4xl font-bold"
                variant="dark"
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

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 mb-10 md:mb-12">
          {/* Informations client */}
          <div className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 rounded-3xl p-7 md:p-8 border border-white/10 shadow-lg shadow-black/30 backdrop-blur-sm">
            <h3 className="text-lg font-semibold text-white mb-4">Client</h3>
            {isEditing ? (
              <div className="space-y-4">
                <Input
                  label=""
                  value={displayInvoice.client || ''}
                  onChange={(e) => updateEditedInvoice('client', e.target.value)}
                  placeholder="Nom du client"
                  className="text-white placeholder:text-gray-500"
                  variant="dark"
                />
                <Input
                  label=""
                  value={displayInvoice.contact || ''}
                  onChange={(e) => updateEditedInvoice('contact', e.target.value)}
                  placeholder="Contact (optionnel)"
                  className="text-white text-sm placeholder:text-gray-500"
                  variant="dark"
                />
                <Input
                  label=""
                  value={displayInvoice.client_address_line1 || ''}
                  onChange={(e) => updateEditedInvoice('client_address_line1', e.target.value)}
                  placeholder="Adresse ligne 1"
                  className="text-white text-sm placeholder:text-gray-500"
                  variant="dark"
                />
                <Input
                  label=""
                  value={displayInvoice.client_address_line2 || ''}
                  onChange={(e) => updateEditedInvoice('client_address_line2', e.target.value)}
                  placeholder="Adresse ligne 2 (optionnel)"
                  className="text-white text-sm placeholder:text-gray-500"
                  variant="dark"
                />
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label=""
                    value={displayInvoice.client_postal_code || ''}
                    onChange={(e) => updateEditedInvoice('client_postal_code', e.target.value)}
                    placeholder="Code postal"
                    className="text-white text-sm placeholder:text-gray-500"
                    variant="dark"
                  />
                  <Input
                    label=""
                    value={displayInvoice.client_city || ''}
                    onChange={(e) => updateEditedInvoice('client_city', e.target.value)}
                    placeholder="Ville"
                    className="text-white text-sm placeholder:text-gray-500"
                    variant="dark"
                  />
                </div>
              </div>
            ) : (
              <>
                <p className="text-white mb-2 font-medium">{invoice.client}</p>
                {invoice.contact && (
                  <p className="text-gray-400 text-sm">{invoice.contact}</p>
                )}
                {(invoice.client_address_line1 || invoice.client_postal_code || invoice.client_city) && (
                  <div className="mt-3 text-gray-400 text-sm">
                    {invoice.client_address_line1 && <p>{invoice.client_address_line1}</p>}
                    {invoice.client_address_line2 && <p>{invoice.client_address_line2}</p>}
                    {(invoice.client_postal_code || invoice.client_city) && (
                      <p>{[invoice.client_postal_code, invoice.client_city].filter(Boolean).join(' ')}</p>
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Montant */}
          <div className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 rounded-3xl p-7 md:p-8 border border-white/10 shadow-lg shadow-black/30 backdrop-blur-sm">
            <h3 className="text-lg font-semibold text-white mb-4">Montant</h3>
            <p className="text-2xl font-bold text-white">
              {formatAmount(getTotalHT())}
            </p>
            <p className="text-gray-400 text-sm mt-1">Hors taxes</p>
          </div>

          {/* Statut */}
          <div className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 rounded-3xl p-7 md:p-8 border border-white/10 shadow-lg shadow-black/30 backdrop-blur-sm">
            <h3 className="text-lg font-semibold text-white mb-4">Statut</h3>
            {getStatusBadge(invoice.status)}
            {invoice.updated_at !== invoice.created_at && (
              <p className="text-gray-400 text-xs mt-3">
                Modifiée le {formatDate(invoice.updated_at)}
              </p>
            )}
          </div>
        </div>

        {/* Informations de paiement */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 mb-10 md:mb-12">
          <div className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 rounded-3xl p-7 md:p-8 border border-white/10 shadow-lg shadow-black/30 backdrop-blur-sm">
            <h3 className="text-lg font-semibold text-white mb-4">Date d'échéance</h3>
            {isEditing ? (
              <Input
                type="date"
                label=""
                value={displayInvoice.due_date ? new Date(displayInvoice.due_date).toISOString().split('T')[0] : ''}
                onChange={(e) => updateEditedInvoice('due_date', e.target.value || null)}
                className="text-white placeholder:text-gray-500"
                variant="dark"
              />
            ) : (
              <p className="text-white">
                {invoice.due_date 
                  ? formatDate(invoice.due_date)
                  : (() => {
                      const dueDate = new Date(invoice.created_at)
                      dueDate.setDate(dueDate.getDate() + 30)
                      return formatDate(dueDate.toISOString())
                    })()}
              </p>
            )}
          </div>

          <div className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 rounded-3xl p-7 md:p-8 border border-white/10 shadow-lg shadow-black/30 backdrop-blur-sm">
            <h3 className="text-lg font-semibold text-white mb-4">Mode de paiement</h3>
            {isEditing ? (
              <select
                value={displayInvoice.payment_method || ''}
                onChange={(e) => updateEditedInvoice('payment_method', e.target.value || null)}
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
                {invoice.payment_method || '—'}
              </p>
            )}
          </div>
        </div>

        {/* Description */}
        {(invoice.description || isEditing) && (
          <div className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 rounded-3xl p-7 md:p-8 border border-white/10 shadow-lg shadow-black/30 backdrop-blur-sm mb-10 md:mb-12">
            <h3 className="text-lg font-semibold text-white mb-4">Description des travaux</h3>
            {isEditing ? (
              <textarea
                value={displayInvoice.description || ''}
                onChange={(e) => updateEditedInvoice('description', e.target.value)}
                placeholder="Description des travaux..."
                className="w-full px-5 py-4 bg-white border-2 border-gray-300 rounded-2xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all resize-none"
                rows={5}
              />
            ) : (
              <p className="text-gray-300 whitespace-pre-wrap leading-relaxed">
                {invoice.description}
              </p>
            )}
          </div>
        )}

        {/* Lignes de facture - Mode édition */}
        {isEditing && (
          <div className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 rounded-3xl p-7 md:p-8 border border-white/10 shadow-lg shadow-black/30 backdrop-blur-sm mb-10 md:mb-12">
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
          <div className="bg-[#1a1f3a] rounded-3xl p-7 md:p-8 border border-[#2a2f4a] mb-10 md:mb-12">
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
