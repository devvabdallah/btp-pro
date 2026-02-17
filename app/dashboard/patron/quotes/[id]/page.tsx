'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import Button from '@/components/ui/Button'
import QuoteDetailView from './QuoteDetailView'

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
  const [profileFullName, setProfileFullName] = useState<string | null>(null)
  const [quoteNotFound, setQuoteNotFound] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [statusError, setStatusError] = useState<string | null>(null)
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const [creatingInvoice, setCreatingInvoice] = useState(false)
  const [invoiceError, setInvoiceError] = useState<string | null>(null)
  const [invoiceSuccess, setInvoiceSuccess] = useState<string | null>(null)
  const [isCompanyActive, setIsCompanyActive] = useState<boolean | null>(null)
  const [existingInvoiceId, setExistingInvoiceId] = useState<string | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [editedQuote, setEditedQuote] = useState<any>(null)
  const [editedLines, setEditedLines] = useState<any[]>([])
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)

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

      // 2.5 Vérifier si l'entreprise est active (abonnement/essai) via RPC is_company_active
      try {
        const { checkCompanyActive } = await import('@/lib/subscription-check')
        const { active, error: checkError } = await checkCompanyActive(supabase, profile.entreprise_id)
        
        if (checkError) {
          // En cas d'erreur RPC, bloquer par sécurité et afficher un message d'erreur clair
          console.error('[QuoteDetail] Erreur vérification abonnement:', checkError)
          setIsCompanyActive(false)
          setError(`Erreur de vérification d'abonnement: ${checkError}`)
        } else {
          setIsCompanyActive(active)
        }
      } catch (err) {
        // En cas d'exception, bloquer par sécurité
        console.error('[QuoteDetail] Exception lors de la vérification abonnement:', err)
        setIsCompanyActive(false)
        setError('Erreur lors de la vérification de l\'abonnement. Veuillez réessayer.')
      }

      // 2.6 Vérifier si une facture existe déjà pour ce devis
      try {
        const { data: existingInvoice, error: existingInvoiceError } = await supabase
          .from('invoices')
          .select('id')
          .eq('quote_id', quoteId)
          .eq('entreprise_id', profile.entreprise_id)
          .limit(1)
          .maybeSingle()

        if (!existingInvoiceError && existingInvoice) {
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
        .select('id, entreprise_id, title, client, contact, description, amount_ht, status, created_at, number, client_address_line1, client_address_line2, client_postal_code, client_city, payment_method, deposit_amount, deposit_percent')
        .eq('id', quoteId)
        .eq('entreprise_id', profile.entreprise_id)
        .single()

      if (quoteError || !quoteData) {
        setQuoteNotFound(true)
        setLoading(false)
        return
      }

      setQuote(quoteData)
      // Initialiser les états d'édition avec les données chargées
      setEditedQuote({ ...quoteData })
      
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
          const lines = linesData || []
          setQuoteLines(lines)
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
          setQuoteLines([])
          setEditedLines([])
        }
        // Si la table n'existe pas, on ignore l'erreur (pas de lignes)
      } catch (err) {
        // Table quote_lines peut ne pas exister, on continue sans lignes
      }

      setLoading(false)
    }

    load()
  }, [quoteId])


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
  };

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
      // Créer un client Supabase frais pour une session cohérente
      const supabaseClient = createSupabaseBrowserClient()

      // Récupérer le profil pour obtenir entreprise_id
      const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
      
      if (userError || !user) {
        setInvoiceError('Utilisateur non connecté')
        setCreatingInvoice(false)
        return
      }

      const { data: profile, error: profileError } = await supabaseClient
        .from('profiles')
        .select('entreprise_id')
        .eq('id', user.id)
        .single()

      if (profileError || !profile || !profile.entreprise_id) {
        setInvoiceError('Profil introuvable')
        setCreatingInvoice(false)
        return
      }

      // Vérification abonnement / essai via RPC is_company_active avec le même client pour cohérence de session
      const { checkCompanyActive } = await import('@/lib/subscription-check')
      const { active, error: checkError } = await checkCompanyActive(supabaseClient, profile.entreprise_id)

      console.log("[subscription] active=", active, "error=", checkError)

      if (checkError) {
        // En cas d'erreur RPC, bloquer par sécurité
        setInvoiceError(`Erreur de vérification d'abonnement: ${checkError}`)
        setCreatingInvoice(false)
        return
      }

      if (!active) {
        setInvoiceError("Votre essai est expiré. Abonnez-vous pour continuer.")
        setCreatingInvoice(false)
        router.push('/dashboard/patron/abonnement')
        return
      }

      // 1. Vérifier si une facture existe déjà pour ce devis
      const { data: existingInvoice, error: existingInvoiceError } = await supabaseClient
        .from('invoices')
        .select('id')
        .eq('quote_id', quote.id)
        .eq('entreprise_id', quote.entreprise_id)
        .limit(1)
        .maybeSingle()

      if (!existingInvoiceError && existingInvoice) {
        // Facture existe déjà, stocker l'ID et afficher le message
        setExistingInvoiceId(existingInvoice.id)
        setCreatingInvoice(false)
        return
      }

      // 2. Créer la facture
      const { data: invoiceData, error: invoiceError } = await supabaseClient
        .from('invoices')
        .insert({
          entreprise_id: quote.entreprise_id,
          quote_id: quote.id,
          title: quote.title ?? null,
          client: quote.client,
          contact: quote.contact ?? null,
          description: quote.description ?? null,
          client_address_line1: quote.client_address_line1 ?? null,
          client_address_line2: quote.client_address_line2 ?? null,
          client_postal_code: quote.client_postal_code ?? null,
          client_city: quote.client_city ?? null,
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

        const { error: linesError } = await supabaseClient
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
  };

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

  // Handlers pour l'édition
  const handleEdit = () => {
    setIsEditing(true)
    setEditedQuote({ ...quote })
    setEditedLines(quoteLines.map((line: any) => ({
      id: line.id || crypto.randomUUID(),
      description: line.description || '',
      quantity: line.quantity || 0,
      unit: line.unit || 'pièce',
      unit_price_ht: line.unit_price_ht || 0,
      total_ht: line.total_ht || 0
    })))
    setSaveError(null)
  }

  const handleCancel = () => {
    setIsEditing(false)
    setEditedQuote({ ...quote })
    setEditedLines(quoteLines.map((line: any) => ({
      id: line.id || crypto.randomUUID(),
      description: line.description || '',
      quantity: line.quantity || 0,
      unit: line.unit || 'pièce',
      unit_price_ht: line.unit_price_ht || 0,
      total_ht: line.total_ht || 0
    })))
    setSaveError(null)
  }

  const handleSave = async () => {
    if (!quote?.id || !quote?.entreprise_id) {
      setSaveError('Devis introuvable')
      return
    }

    setSaving(true)
    setSaveError(null)

    try {
      const supabase = createSupabaseBrowserClient()

      // 1. Calculer le total HT depuis les lignes
      const totalHT = editedLines.reduce((sum, line) => {
        const qty = parseFloat(line.quantity) || 0
        const price = parseFloat(line.unit_price_ht) || 0
        return sum + (qty * price)
      }, 0)

      // 2. Mettre à jour le devis
      const { error: updateError } = await supabase
        .from('quotes')
        .update({
          title: editedQuote.title?.trim() || 'Devis sans titre',
          client: editedQuote.client?.trim() || '',
          contact: editedQuote.contact?.trim() || null,
          description: editedQuote.description?.trim() || null,
          client_address_line1: editedQuote.client_address_line1?.trim() || null,
          client_address_line2: editedQuote.client_address_line2?.trim() || null,
          client_postal_code: editedQuote.client_postal_code?.trim() || null,
          client_city: editedQuote.client_city?.trim() || null,
          payment_method: editedQuote.payment_method?.trim() || null,
          deposit_amount: editedQuote.deposit_amount ? parseFloat(editedQuote.deposit_amount) : null,
          deposit_percent: editedQuote.deposit_percent ? parseFloat(editedQuote.deposit_percent) : null,
          amount_ht: totalHT,
          updated_at: new Date().toISOString()
        })
        .eq('id', quote.id)
        .eq('entreprise_id', quote.entreprise_id)

      if (updateError) {
        setSaveError(`Erreur lors de la mise à jour: ${updateError.message}`)
        setSaving(false)
        return
      }

      // 3. Supprimer toutes les lignes existantes
      const { error: deleteError } = await supabase
        .from('quote_lines')
        .delete()
        .eq('quote_id', quote.id)

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
            quote_id: quote.id,
            description: line.description.trim(),
            quantity: qty,
            unit: line.unit?.trim() || 'pièce',
            unit_price_ht: price,
            total_ht: qty * price
          }
        })

      if (linesToInsert.length > 0) {
        const { error: insertError } = await supabase
          .from('quote_lines')
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
      const { data: updatedQuote } = await supabase
        .from('quotes')
        .select('id, entreprise_id, title, client, contact, description, amount_ht, status, created_at, number, client_address_line1, client_address_line2, client_postal_code, client_city, payment_method, deposit_amount, deposit_percent')
        .eq('id', quote.id)
        .single()

      if (updatedQuote) {
        setQuote(updatedQuote)
        setEditedQuote({ ...updatedQuote })
      }

      const { data: updatedLines } = await supabase
        .from('quote_lines')
        .select('id, quote_id, description, quantity, unit, unit_price_ht, total_ht, created_at')
        .eq('quote_id', quote.id)
        .order('created_at', { ascending: true })

      if (updatedLines) {
        setQuoteLines(updatedLines)
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
    } catch (err) {
      console.error('Unexpected error saving quote:', err)
      setSaveError('Erreur lors de la sauvegarde')
      setSaving(false)
    }
  }

  const updateEditedQuote = (field: string, value: any) => {
    setEditedQuote({ ...editedQuote, [field]: value })
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
    
    // Recalculer le total HT du devis
    const totalHT = updated.reduce((sum, line) => {
      const qty = parseFloat(line.quantity) || 0
      const price = parseFloat(line.unit_price_ht) || 0
      return sum + (qty * price)
    }, 0)
    setEditedQuote({ ...editedQuote, amount_ht: totalHT })
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
    setEditedQuote({ ...editedQuote, amount_ht: totalHT })
  }

  // Ouvrir la modale de suppression
  const handleDeleteClick = () => {
    setIsDeleteModalOpen(true)
  }

  // Supprimer le devis
  const handleDelete = async () => {
    if (!quote?.id) {
      setDeleteError('Devis introuvable')
      setIsDeleteModalOpen(false)
      return
    }

    setDeleting(true)
    setDeleteError(null)
    setIsDeleteModalOpen(false)

    try {
      // Vérifier si des factures sont liées à ce devis
      if (!quote.entreprise_id) {
        setDeleteError('Devis sans entreprise associée')
        setDeleting(false)
        return
      }

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
        body: JSON.stringify({ type: 'quote', id: quote.id }),
      })

      const data = await response.json()

      if (!data.ok) {
        setDeleteError(data.message || 'Erreur lors de la suppression du devis')
        setDeleting(false)
        return
      }

      // Rediriger vers la liste des devis
      router.push('/dashboard/patron/devis')
    } catch (err) {
      console.error('Unexpected error deleting quote:', err)
      setDeleteError('Erreur lors de la suppression du devis')
      setDeleting(false)
    }
  }

  // Générer et télécharger le PDF
  const handlePrintPdf = () => {
    if (!quote) return

    // Nom de l'entreprise : legal_name si présent, sinon name (pas de fallback)
    const companyName = (entrepriseInfo?.legal_name ?? '').trim() || (entrepriseInfo?.name ?? '').trim()
    const addressLine1 = entrepriseInfo?.address_line1 || ''
    const addressLine2 = entrepriseInfo?.address_line2 || ''
    const postalCode = entrepriseInfo?.postal_code || ''
    const city = entrepriseInfo?.city || ''
    const siret = entrepriseInfo?.siret || ''
    const vatNumber = entrepriseInfo?.vat_number || ''
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

    // Générer le HTML des lignes avant le template principal
    const linesHtml = formattedLines.map((line) => `
      <tr>
        <td>${line.description}</td>
        <td class="text-right">${line.quantity}</td>
        <td>${line.unit}</td>
        <td class="text-right">${line.unitPrice}</td>
        <td class="text-right">${line.total}</td>
      </tr>
    `).join('')

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
    <div style="font-size: 10pt; font-weight: bold; color: #333; margin-bottom: 8px;">ÉMIS PAR :</div>
    <div class="header-company-info">
      ${companyName ? `<div class="header-company-name">${companyName}</div>` : ''}
      ${(addressLine1 || addressLine2 || postalCode || city) ? `
      <div style="margin-top: 4px; margin-bottom: 4px;">
        ${addressLine1 ? `<div>${addressLine1}</div>` : ''}
        ${addressLine2 ? `<div>${addressLine2}</div>` : ''}
        ${(postalCode || city) ? `<div>${[postalCode, city].filter(Boolean).join(' ')}</div>` : ''}
      </div>
      ` : ''}
      ${siret ? `<div style="margin-top: 6px; font-size: 10pt;">SIRET : ${siret}</div>` : ''}
      ${vatNumber ? `<div style="font-size: 10pt;">TVA : ${vatNumber}</div>` : '<div style="font-size: 10pt;">TVA non applicable, art. 293 B du CGI</div>'}
      ${profileFullName ? `<div style="margin-top: 6px; font-size: 9pt; color: #666;">Établi par : ${profileFullName}</div>` : ''}
    </div>
  </div>

  <div class="document-info page-break">
    <div class="document-title">DEVIS</div>
    <div class="document-number"><strong>Devis n°</strong> : ${quote.number || '—'}</div>
    <div class="document-date"><strong>Date</strong> : ${date}</div>
  </div>

  <div class="client-section page-break">
    <h3 style="font-size: 10pt; font-weight: bold; color: #333; margin-bottom: 8px;">DEVIS POUR :</h3>
    ${quote.client ? `<p style="font-weight: bold; font-size: 11pt; margin-bottom: 4px;">${quote.client}</p>` : ''}
    ${quote.contact ? `<p style="font-size: 10pt; margin-bottom: 4px; color: #555;">${quote.contact}</p>` : ''}
    ${(quote.client_address_line1 || quote.client_address_line2 || quote.client_postal_code || quote.client_city) ? `
    <div style="margin-top: 8px;">
      ${quote.client_address_line1 ? `<p style="font-size: 10pt; margin-bottom: 2px;">${quote.client_address_line1}</p>` : ''}
      ${quote.client_address_line2 ? `<p style="font-size: 10pt; margin-bottom: 2px;">${quote.client_address_line2}</p>` : ''}
      ${(quote.client_postal_code || quote.client_city) ? `<p style="font-size: 10pt; margin-bottom: 2px;">${[quote.client_postal_code, quote.client_city].filter(Boolean).join(' ')}</p>` : ''}
    </div>
    ` : ''}
  </div>

  ${quote.description ? `
  <div class="page-break" style="margin: 20px 0; padding: 10px 0; font-size: 10pt; border-top: 1px solid #ddd; border-bottom: 1px solid #ddd;">
    <strong>Description des travaux :</strong><br>
    <div style="margin-top: 6px;">${quote.description.replace(/\n/g, '<br>')}</div>
  </div>
  ` : ''}

  ${quoteLines.length > 0 ? `
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
        ${linesHtml}
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
    ${quote.payment_method ? `<div class="footer-text"><strong>Mode de paiement :</strong> ${quote.payment_method}</div>` : ''}
    ${(quote.deposit_amount || quote.deposit_percent) ? `
    <div class="footer-text">
      <strong>Acompte :</strong> 
      ${quote.deposit_amount ? `${formatAmountForPrint(parseFloat(quote.deposit_amount))} HT` : ''}
      ${quote.deposit_amount && quote.deposit_percent ? ' (' : ''}
      ${quote.deposit_percent ? `${quote.deposit_percent}%` : ''}
      ${quote.deposit_amount && quote.deposit_percent ? ')' : ''}
    </div>
    ` : ''}
    <div class="footer-text">Pénalités de retard exigibles au taux légal en vigueur.</div>
    <div class="footer-text">Indemnité forfaitaire pour frais de recouvrement : 40 € (art. L441-10 du Code de commerce).</div>
  </div>
</body>
</html>
    `

    printWindow.document.write(htmlContent)
    printWindow.document.close()
    
    // Forcer le titre de l'onglet
    printWindow.document.title = `Devis - ${quote.title}`

    // Attendre que le contenu soit chargé puis imprimer
    setTimeout(() => {
      printWindow.print()
      // Fermer la fenêtre après impression (optionnel)
      setTimeout(() => {
        printWindow.close()
      }, 1000)
    }, 250)
  };

  return (
    <>
      <QuoteDetailView
        quote={quote}
        loading={loading}
        error={error}
        quoteNotFound={quoteNotFound}
        quoteId={quoteId}
        formatDate={formatDate}
        getStatusBadge={getStatusBadge}
        formatAmount={formatAmount}
        existingInvoiceId={existingInvoiceId}
        handleCreateInvoice={handleCreateInvoice}
        creatingInvoice={creatingInvoice}
        isCompanyActive={isCompanyActive}
        invoiceError={invoiceError}
        statusError={statusError}
        handleStatusChange={handleStatusChange}
        updatingStatus={updatingStatus}
        handlePrintPdf={handlePrintPdf}
        isEditing={isEditing}
        editedQuote={editedQuote}
        editedLines={editedLines}
        quoteLines={quoteLines}
        saving={saving}
        saveError={saveError}
        onEdit={handleEdit}
        onCancel={handleCancel}
        onSave={handleSave}
        updateEditedQuote={updateEditedQuote}
        updateEditedLine={updateEditedLine}
        addEditedLine={addEditedLine}
        removeEditedLine={removeEditedLine}
        onDelete={handleDeleteClick}
        deleting={deleting}
        deleteError={deleteError}
      />

      {/* Modale de confirmation de suppression */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-gradient-to-br from-slate-800/95 to-slate-900/95 rounded-2xl p-6 md:p-8 border border-white/10 shadow-xl shadow-black/50 backdrop-blur-sm max-w-md w-full">
            <h3 className="text-xl md:text-2xl font-semibold text-white mb-4">
              Supprimer ce devis ?
            </h3>
            <p className="text-gray-300 mb-6 text-sm md:text-base">
              Cette action est irréversible.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 sm:justify-end">
              <Button
                variant="secondary"
                size="md"
                onClick={() => setIsDeleteModalOpen(false)}
                disabled={deleting}
                className="w-full sm:w-auto min-h-[44px] px-6 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Annuler
              </Button>
              <Button
                variant="primary"
                size="md"
                onClick={handleDelete}
                disabled={deleting}
                className="w-full sm:w-auto min-h-[44px] px-6 bg-red-600 hover:bg-red-700 border-red-600 text-white font-semibold disabled:opacity-70 disabled:bg-red-600/70 disabled:text-white/90 disabled:cursor-not-allowed transition-colors"
              >
                {deleting ? 'Suppression...' : 'Supprimer'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
