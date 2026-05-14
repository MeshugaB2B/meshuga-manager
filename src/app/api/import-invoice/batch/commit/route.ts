// src/app/api/import-invoice/batch/commit/route.ts
// Commit des factures validées d'un batch vers product_prices
// - Pour chaque ligne de chaque facture validée :
//   1. Cherche/crée le produit en base
//   2. Insert un product_prices avec la date de la facture
//   3. Si la facture est la plus récente du produit → met à jour products.current_price
// - Stratégie "max date wins" : le prix actuel = celui de la facture la plus récente

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const maxDuration = 300

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

function sb() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE)
}

// Cherche un produit par nom + supplier_id (avec normalisation et alias)
async function findProductByArticle(article: string, supplierId: string | null) {
  if (!supplierId || !article) return null
  const client = sb()
  
  // 1. Match exact via product_aliases
  const { data: aliases } = await client.from('product_aliases')
    .select('product_id')
    .eq('alias_text', article.trim())
    .limit(1)
  
  if (aliases && aliases.length > 0) {
    const { data: prod } = await client.from('products')
      .select('*')
      .eq('id', aliases[0].product_id)
      .single()
    if (prod) return prod
  }
  
  // 2. Match par nom du produit chez ce fournisseur
  const { data: products } = await client.from('products')
    .select('*')
    .eq('supplier_id', supplierId)
    .eq('is_active', true)
  
  if (!products || products.length === 0) return null
  
  const normalized = article.toLowerCase().trim()
  
  // Match exact (insensible casse)
  let match = products.find((p: any) => (p.name || '').toLowerCase().trim() === normalized)
  if (match) return match
  
  // Match approximatif (le nom DB contenu dans article ou vice-versa, 5+ chars)
  match = products.find((p: any) => {
    const pName = (p.name || '').toLowerCase().trim()
    if (pName.length < 5) return false
    return normalized.includes(pName) || pName.includes(normalized)
  })
  
  return match || null
}

// Commit 1 ligne de facture
async function commitLine(line: any, invoice: any) {
  const client = sb()
  const article = line.article_original || line.article || ''
  if (!article) return { status: 'skipped', reason: 'no_article' }
  
  // Trouver le produit
  const product = await findProductByArticle(article, invoice.supplier_id)
  
  if (!product) {
    return {
      status: 'product_not_found',
      article: article,
      reason: 'Produit introuvable dans la base. À créer manuellement.'
    }
  }
  
  // Calculer le prix unitaire (master_unit_price)
  // C'est le prix par unité de référence (kg, L, U selon le produit)
  const qty = Number(line.quantity_delivered || 0)
  const unitPrice = Number(line.unit_price_ht || 0)
  const totalLine = Number(line.total_line_ht || 0)
  
  if (qty <= 0 || unitPrice <= 0) {
    return { status: 'skipped', reason: 'invalid_qty_or_price', article }
  }
  
  // Insert dans product_prices
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
  
  // "Max date wins" : si cette facture est plus récente que la dernière vue pour ce produit,
  // mettre à jour current_price
  const { data: latestPrice } = await client.from('product_prices')
    .select('invoice_date, master_unit_price')
    .eq('product_id', product.id)
    .not('invoice_date', 'is', null)
    .order('invoice_date', { ascending: false })
    .limit(1)
  
  if (latestPrice && latestPrice.length > 0 && latestPrice[0].invoice_date === invoice.invoice_date) {
    // Cette facture EST la plus récente → on update le current_price
    await client.from('products').update({
      current_price: unitPrice,
      last_pack_price: totalLine,
      last_purchase_date: invoice.invoice_date
    }).eq('id', product.id)
  }
  
  return { status: 'committed', article, product_id: product.id, unit_price: unitPrice }
}

// ============= POST handler =============
export async function POST(req: NextRequest) {
  if (!SUPABASE_SERVICE_ROLE) return NextResponse.json({ error: 'SUPABASE_SERVICE_ROLE_KEY manquante' }, { status: 500 })
  
  let body: any
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Body invalide' }, { status: 400 }) }
  
  const invoiceIds = body.invoice_ids as string[]
  if (!Array.isArray(invoiceIds) || invoiceIds.length === 0) {
    return NextResponse.json({ error: 'invoice_ids manquant' }, { status: 400 })
  }
  
  const client = sb()
  
  // Récupérer les factures à commiter
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
    const skipped = lineResults.filter(r => r.status === 'skipped').length
    const errors = lineResults.filter(r => r.status === 'error')
    
    // Marquer la facture comme commitée
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
      skipped_lines: skipped,
      errors: errors.length,
      error_details: errors
    })
  }
  
  const totalCommitted = results.reduce((acc, r) => acc + r.committed_lines, 0)
  const totalNotFound = results.reduce((acc, r) => acc + r.not_found_products.length, 0)
  
  return NextResponse.json({
    invoices_processed: invoices.length,
    total_lines_committed: totalCommitted,
    total_products_not_found: totalNotFound,
    results: results
  })
}
