// src/app/api/import-invoice/batch/[batchId]/route.ts
// Récupère l'état d'un batch + la liste des factures qu'il contient

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

function sb() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE)
}

export async function GET(req: NextRequest, ctx: { params: { batchId: string } }) {
  const batchId = ctx.params.batchId
  if (!batchId) {
    return NextResponse.json({ error: 'batchId manquant' }, { status: 400 })
  }
  
  const client = sb()
  
  // 1. Infos du batch
  const { data: batch, error: batchErr } = await client
    .from('historical_import_batches')
    .select('*')
    .eq('id', batchId)
    .single()
  
  if (batchErr || !batch) {
    return NextResponse.json({ error: 'Batch introuvable' }, { status: 404 })
  }
  
  // 2. Toutes les factures du batch
  const { data: invoices } = await client
    .from('pending_invoices')
    .select('id, file_name, supplier_id, fournisseur_extracted, invoice_date, invoice_number, total_ht, total_ttc, nb_lines, has_anomaly, anomaly_reasons, is_credit_note, status, created_at')
    .eq('batch_id', batchId)
    .order('invoice_date', { ascending: false })
  
  return NextResponse.json({
    batch: batch,
    invoices: invoices || []
  })
}

// PATCH : permet de mettre à jour la queue (validation/rejet en masse)
export async function PATCH(req: NextRequest, ctx: { params: { batchId: string } }) {
  const batchId = ctx.params.batchId
  
  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Body JSON invalide' }, { status: 400 })
  }
  
  const action = body.action as 'validate_all_clean' | 'reject_all' | 'validate_ids'
  const invoiceIds = body.invoice_ids as string[] | undefined
  
  const client = sb()
  
  if (action === 'validate_all_clean') {
    // Valider toutes les factures du batch SANS anomalie
    const { data, error } = await client
      .from('pending_invoices')
      .update({
        status: 'validated',
        validated_at: new Date().toISOString(),
        validated_by: 'batch_auto'
      })
      .eq('batch_id', batchId)
      .eq('has_anomaly', false)
      .eq('status', 'pending')
      .select('id')
    
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ validated_count: data?.length || 0 })
  }
  
  if (action === 'validate_ids' && invoiceIds && invoiceIds.length > 0) {
    const { data, error } = await client
      .from('pending_invoices')
      .update({
        status: 'validated',
        validated_at: new Date().toISOString(),
        validated_by: 'batch_manual'
      })
      .in('id', invoiceIds)
      .eq('batch_id', batchId)
      .select('id')
    
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ validated_count: data?.length || 0 })
  }
  
  if (action === 'reject_all') {
    const { data, error } = await client
      .from('pending_invoices')
      .update({
        status: 'rejected',
        rejection_reason: body.reason || 'Rejet batch',
        validated_at: new Date().toISOString(),
        validated_by: 'batch_reject'
      })
      .eq('batch_id', batchId)
      .eq('status', 'pending')
      .select('id')
    
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ rejected_count: data?.length || 0 })
  }
  
  return NextResponse.json({ error: 'Action invalide' }, { status: 400 })
}
