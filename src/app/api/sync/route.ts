import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'
import { createAdminClient } from '@/lib/supabase/server'

async function getGoogleSheets() {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  })
  return google.sheets({ version: 'v4', auth })
}

const SPREADSHEET_ID = process.env.GOOGLE_SPREADSHEET_ID!

// Sync all data to Google Sheets
export async function POST(req: NextRequest) {
  const supabase = createAdminClient()
  const sheets = await getGoogleSheets()

  try {
    // ─ PROSPECTS ─
    const { data: prospects } = await supabase
      .from('prospects')
      .select('*, assigned_profile:profiles!assigned_to(full_name)')
      .order('created_at', { ascending: false })

    const prospectRows = [
      ['Entreprise', 'Contact', 'Email', 'Téléphone', 'Secteur', 'Statut', 'Priorité', 'Valeur potentielle', 'CA estimé/mois', 'Prochaine action', 'Date prochaine action', 'Assigné à', 'Source', 'Tags', 'Dernière MAJ'],
      ...(prospects || []).map(p => [
        p.company_name, p.contact_name || '', p.email || '', p.phone || '',
        p.sector || '', p.status, p.priority, p.potential_value || '',
        p.estimated_monthly_revenue || '', p.next_action || '',
        p.next_action_date || '', p.assigned_profile?.full_name || '',
        p.source || '', (p.tags || []).join(', '),
        new Date(p.updated_at).toLocaleDateString('fr-FR')
      ])
    ]

    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Prospects!A1',
      valueInputOption: 'RAW',
      requestBody: { values: prospectRows }
    })

    // ─ CONTACTS / ANNUAIRE ─
    const { data: contacts } = await supabase
      .from('contacts')
      .select('*')
      .order('category', { ascending: true })

    const contactRows = [
      ['Catégorie', 'Nom', 'Entreprise', 'Titre', 'Email', 'Téléphone', 'WhatsApp', 'Adresse', 'Site', 'Instagram', 'VIP', 'Notes', 'Tags'],
      ...(contacts || []).map(c => [
        c.category, c.full_name, c.company_name || '', c.title || '',
        c.email || '', c.phone || '', c.whatsapp || '', c.address || '',
        c.website || '', c.instagram || '', c.is_vip ? 'Oui' : 'Non',
        c.notes || '', (c.tags || []).join(', ')
      ])
    ]

    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Annuaire!A1',
      valueInputOption: 'RAW',
      requestBody: { values: contactRows }
    })

    // ─ KPIs SNAPSHOT ─
    const wonCount = prospects?.filter(p => p.status === 'won').length || 0
    const pipelineCount = prospects?.filter(p => !['won', 'lost'].includes(p.status)).length || 0
    const totalRevenue = prospects?.filter(p => p.status === 'won')
      .reduce((sum, p) => sum + (p.estimated_monthly_revenue || 0), 0) || 0

    await supabase.from('kpi_snapshots').insert({
      snapshot_date: new Date().toISOString().split('T')[0],
      prospects_total: prospects?.length || 0,
      prospects_won: wonCount,
      prospects_in_pipeline: pipelineCount,
      monthly_b2b_revenue: totalRevenue,
    })

    // ─ SYNC LOG ─
    await supabase.from('sync_log').insert({
      sync_type: 'google_sheets',
      status: 'success',
      rows_synced: (prospects?.length || 0) + (contacts?.length || 0),
    })

    return NextResponse.json({
      success: true,
      synced: {
        prospects: prospects?.length || 0,
        contacts: contacts?.length || 0,
      },
      timestamp: new Date().toISOString()
    })
  } catch (error: any) {
    await supabase.from('sync_log').insert({
      sync_type: 'google_sheets',
      status: 'error',
      error_message: error.message,
    })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// Get last sync info
export async function GET() {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('sync_log')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5)
  return NextResponse.json(data)
}
