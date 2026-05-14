// src/app/api/import-invoice/batch/commit/route.ts
// V2 — Corrige le bug alias_text → alias + amélioration normalisation match

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const maxDuration = 300

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

function sb() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE)
}

// Normaliser : minuscules, sans accents, espaces simples
function normalize(s: string): string {
  return (s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove accents
    .replace(/\s+/g, ' ')
    .trim()
}

// Cherche un produit par nom + supplier_id avec multi-stratégie
async function findProductByArticle(article: string, supplierId: string | null) {
  if (!supplierId || !article) return null
  const client = sb()
  const normalized = normalize(article)
  
  // 1. Match exact via product_aliases.alias_normalized (la VRAIE colonne)
  const { data: aliases } = await client.from('product_aliases')
    .select('product_id')
    .eq('alias_normalized', normalized)
    .eq('supplier_id', supplierId)
    .limit(1)
  
  if (aliases && aliases.length > 0) {
    const { data: prod } = await client.from('products')
      .select('*')
      .eq('id', aliases[0].product_id)
      .single()
    if (prod) return prod
  }
  
  // 2. Match par alias_normalized SANS filtre supplier (alias global)
  const { data: aliasesGlobal } = await client.from('product_aliases')
    .select('product_id')
    .eq('alias_normalized', normalized)
    .limit(1)
  
  if (aliasesGlobal && aliasesGlobal.length > 0) {
    const { data: prod } = await client.from('products')
      .select('*')
      .eq('id', aliasesGlobal[0].product_id)
      .single()
    if (prod) return prod
  }
  
  // 3. Match direct sur products en normalisant le nom du produit
  const { data: products } = await client.from('products')
    .select('*')
    .eq('supplier_id', supplierId)
    .eq('is_active', true)
  
  if (!products || products.length === 0) return null
  
  // Match exact normalisé
  let match = products.find((p: any) => normalize(p.name || '') === normalized)
  if (match) return match
  
  // Match approximatif (contient ou est contenu, 5+ chars)
  match = products.find((p: any) => {
    const pName = normalize(p.name || '')
    if (pName.length < 5) return false
    return normalized.includes(pName) || pName.includes(normalized)
  })
  
  return match || null
}

// Commit 1 ligne
async function commitLine(line: any, invoice: any) {
  const client = sb()
  const article = line.article_original || line.article || ''
  if (!article) return { status: 'skipped', reason: 'no_article' }
  
  const product = await findProductByArticle(article, invoice.supplier_id)
  
  if (!product) {
    return {
      status: 'product_not_found',
      article: article,
      reason: 'Produit introuvable dans la base. À créer manuellement.'
    }
  }
  
  const qty = Number(line.quantity_delivered || 0)
  const unitPrice = Number(line.unit_price_ht || 0)
  const totalLine = Number(line.total_line_ht || 0)
  
  if (qty <= 0 || unitPrice <= 0) {
    return { status: 'skipped', reason: 'invalid_qty_or_price', article }
  }
  
  // Anti-doublon : vérifier que cette (product_id, invoice_filename, article) n'existe pas déjà
  const { data: existing } = await client.from('product_prices')
    .select('id')
    .eq('product_id', product.id)
    .eq('invoice_filename', invoice.file_name)
    .eq('article_original', article)
    .limit(1)
  
  if (existing && existing.length > 0) {
    return { status: 'duplicate_line', article }
  }
  
  // Insert
  const { error: insertErr } = await client.from('product_prices').insert({
    product_id: product.id,
    master_unit_price: unitPrice,
    invoice_date: invoice.invoice_date,
    invoice_filename: invoice.file_name,
    pack_price: totalLine,
    pack_label: line.pack_label || null,
    master_qty_per_pack: qty,
    article_original: article
  })
  
  if (insertErr) {
    return { status: 'error', article, error: insertErr.message }
  }
  
  // Max date wins : update current_price si cette facture est la plus récente
  const { data: latestPrice } = await client.from('product_prices')
    .select('invoice_date, master_unit_price')
    .eq('product_id', product.id)
    .not('invoice_date', 'is', null)
    .order('invoice_date', { ascending: false })
    .limit(1)
  
  if (latestPrice && latestPrice.length > 0 && latestPrice[0].invoice_date === invoice.invoice_date) {
    await client.from('products').update({
      current_price: unitPrice,
      last_pack_price: totalLine,
      last_purchase_date: invoice.invoice_date
    }).eq('id', product.id)
  }
  
  return { status: 'committed', article, product_id: product.id, unit_price: unitPrice }
}

export async function POST(req: NextRequest) {
  if (!SUPABASE_SERVICE_ROLE) return NextResponse.json({ error: 'SUPABASE_SERVICE_ROLE_KEY manquante' }, { status: 500 })
  
  let body: any
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Body invalide' }, { status: 400 }) }
  
  const invoiceIds = body.invoice_ids as string[]
  if (!Array.isArray(invoiceIds) || invoiceIds.length === 0) {
    return NextResponse.json({ error: 'invoice_ids manquant' }, { status: 400 })
  }
  
  const client = sb()
  
  const { data: invoices, error } = await client.from('pending_invoices')
    .select('*')
    .in('id', invoiceIds)
    .in('status', ['pending', 'validated'])
  
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!invoices || invoices.length === 0) {
    return NextResponse.json({ error: 'Aucune facture trouvée' }, { status: 404 })
  }
  
  const results: any[] = []
  
  for (const invoice of invoices) {
    const extracted = invoice.extracted_data as any
    const lines = extracted?.lines || []
    
    const lineResults: any[] = []
    for (const line of lines) {
      const r = await commitLine(line, invoice)
      lineResults.push(r)
    }
    
    const committed = lineResults.filter(r => r.status === 'committed').length
    const notFound = lineResults.filter(r => r.status === 'product_not_found')
    const duplicates = lineResults.filter(r => r.status === 'duplicate_line').length
    const skipped = lineResults.filter(r => r.status === 'skipped').length
    const errors = lineResults.filter(r => r.status === 'error')
    
    await client.from('pending_invoices').update({
      status: 'committed',
      committed_at: new Date().toISOString(),
      can_rollback_until: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    }).eq('id', invoice.id)
    
    results.push({
      invoice_id: invoice.id,
      invoice_number: invoice.invoice_number,
      total_lines: lines.length,
      committed_lines: committed,
      not_found_products: notFound.map((r: any) => r.article),
      duplicate_lines: duplicates,
      skipped_lines: skipped,
      errors: errors.length,
      error_details: errors
    })
  }
  
  const totalCommitted = results.reduce((acc, r) => acc + r.committed_lines, 0)
  const totalNotFound = results.reduce((acc, r) => acc + r.not_found_products.length, 0)
  const totalDuplicates = results.reduce((acc, r) => acc + r.duplicate_lines, 0)
  
  return NextResponse.json({
    invoices_processed: invoices.length,
    total_lines_committed: totalCommitted,
    total_products_not_found: totalNotFound,
    total_duplicate_lines: totalDuplicates,
    results: results
  })
}
