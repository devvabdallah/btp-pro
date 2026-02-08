import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: NextRequest) {
  try {
    // 1. Lire le header Authorization
    const authHeader = request.headers.get('authorization')
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { ok: false, message: 'Non authentifié' },
        { status: 401 }
      )
    }

    // 2. Extraire le token
    const token = authHeader.substring(7)

    if (!token) {
      return NextResponse.json(
        { ok: false, message: 'Non authentifié' },
        { status: 401 }
      )
    }

    // 3. Vérifier le token avec un client Supabase anon (pas service role)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json(
        { ok: false, message: 'Configuration serveur invalide' },
        { status: 500 }
      )
    }

    const supabaseAnon = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    const { data: { user }, error: userError } = await supabaseAnon.auth.getUser(token)

    if (userError || !user) {
      return NextResponse.json(
        { ok: false, message: 'Non authentifié' },
        { status: 401 }
      )
    }

    // 2. Parser le body
    let body
    try {
      body = await request.json()
    } catch (error) {
      return NextResponse.json(
        { ok: false, message: 'Body JSON invalide' },
        { status: 400 }
      )
    }

    const { type, id } = body

    if (!type || !id) {
      return NextResponse.json(
        { ok: false, message: 'type et id requis' },
        { status: 400 }
      )
    }

    if (type !== 'quote' && type !== 'invoice') {
      return NextResponse.json(
        { ok: false, message: 'type doit être "quote" ou "invoice"' },
        { status: 400 }
      )
    }

    // 3. Créer le client admin pour bypass RLS
    const adminSupabase = createSupabaseAdminClient()

    // 4. Récupérer l'entreprise_id de l'utilisateur avec le client admin
    const { data: profile, error: profileError } = await adminSupabase
      .from('profiles')
      .select('entreprise_id')
      .eq('id', user.id)
      .single()

    if (profileError || !profile || !profile.entreprise_id) {
      return NextResponse.json(
        { ok: false, message: 'Accès non autorisé' },
        { status: 403 }
      )
    }

    const userEntrepriseId = String(profile.entreprise_id).trim()

    // 5. Récupérer l'enregistrement cible avec le client admin
    const tableName = type === 'quote' ? 'quotes' : 'invoices'
    const { data: record, error: recordError } = await adminSupabase
      .from(tableName)
      .select('id, entreprise_id')
      .eq('id', id)
      .single()

    if (recordError || !record) {
      return NextResponse.json(
        { ok: false, message: type === 'quote' ? 'Devis introuvable' : 'Facture introuvable' },
        { status: 404 }
      )
    }

    // 6. Vérifier l'ownership
    if (!record.entreprise_id) {
      return NextResponse.json(
        { ok: false, message: `${type === 'quote' ? 'Devis' : 'Facture'} sans entreprise_id (donnée invalide)` },
        { status: 400 }
      )
    }

    const recordEntrepriseId = String(record.entreprise_id).trim()

    if (recordEntrepriseId !== userEntrepriseId) {
      return NextResponse.json(
        { ok: false, message: 'Accès non autorisé' },
        { status: 403 }
      )
    }

    // 7. Supprimer selon le type
    if (type === 'quote') {
      // 7a. Chercher les factures liées
      const { data: linkedInvoices, error: invoicesCheckError } = await adminSupabase
        .from('invoices')
        .select('id')
        .eq('quote_id', id)
        .eq('entreprise_id', userEntrepriseId)

      // Ne pas bloquer si la table n'existe pas
      if (invoicesCheckError && invoicesCheckError.code !== 'PGRST116') {
        console.error('Error checking linked invoices:', invoicesCheckError)
      }

      // 7b. Supprimer les factures liées si elles existent
      if (linkedInvoices && linkedInvoices.length > 0) {
        const invoiceIds = linkedInvoices.map(inv => inv.id)

        // Supprimer d'abord les lignes des factures
        for (const invoiceId of invoiceIds) {
          const { error: invoiceLinesError } = await adminSupabase
            .from('invoice_lines')
            .delete()
            .eq('invoice_id', invoiceId)

          if (invoiceLinesError && invoiceLinesError.code !== 'PGRST116') {
            console.error('Error deleting invoice lines:', invoiceLinesError)
          }
        }

        // Supprimer les factures
        const { error: invoicesDeleteError } = await adminSupabase
          .from('invoices')
          .delete()
          .in('id', invoiceIds)

        if (invoicesDeleteError) {
          return NextResponse.json(
            { ok: false, message: 'Erreur lors de la suppression des factures liées' },
            { status: 500 }
          )
        }
      }

      // 7c. Supprimer les lignes du devis
      const { error: linesError } = await adminSupabase
        .from('quote_lines')
        .delete()
        .eq('quote_id', id)

      if (linesError && linesError.code !== 'PGRST116') {
        console.error('Error deleting quote lines:', linesError)
      }

      // 7d. Supprimer le devis
      const { error: deleteError } = await adminSupabase
        .from('quotes')
        .delete()
        .eq('id', id)

      if (deleteError) {
        return NextResponse.json(
          { ok: false, message: 'Erreur lors de la suppression du devis' },
          { status: 500 }
        )
      }
    } else {
      // type === 'invoice'
      // 7a. Supprimer les lignes de la facture
      const { error: linesError } = await adminSupabase
        .from('invoice_lines')
        .delete()
        .eq('invoice_id', id)

      if (linesError && linesError.code !== 'PGRST116') {
        console.error('Error deleting invoice lines:', linesError)
      }

      // 7b. Supprimer la facture
      const { error: deleteError } = await adminSupabase
        .from('invoices')
        .delete()
        .eq('id', id)

      if (deleteError) {
        return NextResponse.json(
          { ok: false, message: 'Erreur lors de la suppression de la facture' },
          { status: 500 }
        )
      }
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Delete API error:', error)
    return NextResponse.json(
      { ok: false, message: 'Une erreur inattendue est survenue' },
      { status: 500 }
    )
  }
}
