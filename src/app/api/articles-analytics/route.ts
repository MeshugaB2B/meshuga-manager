// src/app/api/articles-analytics/route.ts
// =============================================================================
// Route Analytics Articles
// 
// GET /api/articles-analytics              → liste tous les articles avec stats
// GET /api/articles-analytics?id=<uuid>    → détail complet d'un article :
//   - stats (min, max, moy, variation)
//   - prix par fournisseur (timeline)
//   - lignes facturées détaillées
//   - recettes utilisant cet article
// =============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

function sb() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE)
}

export async function GET(req: NextRequest) {
  var client = sb()
  var articleId = req.nextUrl.searchParams.get('id')

  // ============ MODE LISTE : tous les articles ============
  if (!articleId) {
    var { data, error } = await client
      .from('v_article_analytics')
      .select('*')
      .order('article_name', { ascending: true })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      articles: data || [],
      count: (data || []).length
    })
  }

  // ============ MODE DÉTAIL : un article ============
  
  // 1. Infos article + stats agrégées
  var { data: article, error: articleErr } = await client
    .from('v_article_analytics')
    .select('*')
    .eq('article_id', articleId)
    .single()

  if (articleErr || !article) {
    return NextResponse.json({ error: 'Article non trouvé' }, { status: 404 })
  }

  // 2. Produits liés (par fournisseur)
  var { data: products } = await client
    .from('products')
    .select(`
      id, name, unit, current_price, last_pack_price, last_purchase_date,
      pack_label, master_qty_per_pack,
      supplier:suppliers(id, name)
    `)
    .eq('article_id', articleId)
    .eq('is_active', true)
    .order('name')

  // 3. Historique complet des prix avec contexte fournisseur
  var { data: priceHistory } = await client
    .from('product_prices')
    .select(`
      id, master_unit_price, invoice_date, invoice_filename, pack_price, pack_label, article_original,
      product:products(id, name, supplier:suppliers(id, name))
    `)
    .in('product_id', (products || []).map(function(p: any) { return p.id }))
    .gt('master_unit_price', 0)
    .not('invoice_date', 'is', null)
    .order('invoice_date', { ascending: true })

  // 4. Format des données pour le graphique : un dataset par fournisseur
  var pricesBySupplier: any = {}
  ;(priceHistory || []).forEach(function(p: any) {
    var supplierName = p.product?.supplier?.name || 'Inconnu'
    if (!pricesBySupplier[supplierName]) {
      pricesBySupplier[supplierName] = []
    }
    pricesBySupplier[supplierName].push({
      date: p.invoice_date,
      price: parseFloat(p.master_unit_price),
      invoice: p.invoice_filename,
      supplier: supplierName,
      pack_price: p.pack_price,
      pack_label: p.pack_label,
      article_original: p.article_original
    })
  })

  // 5. Recettes qui utilisent cet article
  var { data: recipes } = await client
    .from('recipe_ingredients')
    .select(`
      id, qte, unite, prix_achat, cout,
      recipe:recipes(id, name, categorie),
      product:products(id, name)
    `)
    .in('product_id', (products || []).map(function(p: any) { return p.id }))

  return NextResponse.json({
    article: article,
    products: products || [],
    pricesBySupplier: pricesBySupplier,
    priceHistory: priceHistory || [],
    recipes: recipes || []
  })
}
