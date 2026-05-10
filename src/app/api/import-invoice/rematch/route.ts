import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  )
}

// ============================================================================
// /api/import-invoice/rematch
// Corrige une ligne product_prices apres commit (cas: Coca Zero matche sur Coca).
//
// Input :
// {
//   price_id: "uuid",                     // l'id de la ligne product_prices a corriger
//   action: "match_existing" | "create_new" | "fees_taxes",
//
//   // si match_existing : nouvel article cible
//   target_article_id: "uuid" | null,
//
//   // si create_new : payload article + product
//   new_article: { name, category, master_unit, cost_imputation_mode } | null,
//
//   // alias : suppression eventuelle d'un alias errone
//   delete_alias: boolean,
//   alias_text: string | null            // libelle original facture qui a cree l'alias
// }
//
// Logique en cascade :
// 1. Recuperer la ligne product_prices source (+ son product_id, supplier_id, prix, etc.)
// 2. Selon action :
//    a. match_existing -> trouver/creer le product (article_id cible, supplier_id de la facture)
//    b. create_new     -> creer article + product + alias eventuel
//    c. fees_taxes     -> juste supprimer la ligne, marquer comme frais (rien a creer)
// 3. Reassigner la ligne product_prices au nouveau product (UPDATE product_id)
//    OU la supprimer si fees_taxes
// 4. Recalculer current_price de l'ancien product : prendre la ligne suivante la plus recente
//    Si plus aucune ligne, passer current_price a 0 et garder is_active true
// 5. Si delete_alias : supprimer l'alias erronne
// ============================================================================

export async function POST(req: Request) {
  try {
    var body = await req.json()
    var supabase = getSupabase()

    if (!body || !body.price_id || !body.action) {
      return NextResponse.json({ error: 'price_id et action obligatoires' }, { status: 400 })
    }

    // 1. Recuperer la ligne source
    var srcRes = await supabase
      .from('product_prices')
      .select('id, product_id, master_unit_price, pack_price, pack_label, master_qty_per_pack, invoice_date, invoice_filename, article_original')
      .eq('id', body.price_id)
      .single()
    if (srcRes.error || !srcRes.data) {
      return NextResponse.json({ error: 'Ligne product_prices introuvable' }, { status: 404 })
    }
    var srcLine = srcRes.data
    var oldProductId: string = srcLine.product_id

    // 2. Recuperer infos de l'ancien product (notamment supplier_id pour creer le bon nouveau product)
    var oldProdRes = await supabase
      .from('products')
      .select('id, supplier_id, article_id, name, unit, category')
      .eq('id', oldProductId)
      .single()
    if (oldProdRes.error || !oldProdRes.data) {
      return NextResponse.json({ error: 'Product source introuvable' }, { status: 404 })
    }
    var supplierId: string = oldProdRes.data.supplier_id

    var newProductId: string | null = null
    var newArticleId: string | null = null

    // 3. Selon l'action, resoudre la nouvelle destination
    if (body.action === 'fees_taxes') {
      // Pas de nouveau product, on supprime juste la ligne
      var delLine = await supabase.from('product_prices').delete().eq('id', body.price_id)
      if (delLine.error) return NextResponse.json({ error: 'Suppression ligne: ' + delLine.error.message }, { status: 500 })
    }
    else if (body.action === 'match_existing') {
      if (!body.target_article_id) {
        return NextResponse.json({ error: 'target_article_id obligatoire pour match_existing' }, { status: 400 })
      }
      newArticleId = body.target_article_id

      // Chercher si un product existe deja pour (target_article_id, supplier_id)
      var existProdRes = await supabase
        .from('products')
        .select('id')
        .eq('article_id', body.target_article_id)
        .eq('supplier_id', supplierId)
        .eq('is_active', true)
        .limit(1)
      if (existProdRes.data && existProdRes.data.length > 0) {
        newProductId = existProdRes.data[0].id
      } else {
        // Creer un nouveau product chez ce fournisseur pour cet article
        var artRes = await supabase.from('articles').select('name, unit, category').eq('id', body.target_article_id).single()
        var newProd = await supabase.from('products').insert({
          article_id: body.target_article_id,
          supplier_id: supplierId,
          name: artRes.data ? artRes.data.name : 'Produit',
          unit: artRes.data ? artRes.data.unit : 'kg',
          category: artRes.data ? (artRes.data.category || 'ingredient') : 'ingredient',
          current_price: Number(srcLine.master_unit_price || 0),
          pack_label: srcLine.pack_label || null,
          master_qty_per_pack: Number(srcLine.master_qty_per_pack || 0) || null,
          last_pack_price: Number(srcLine.pack_price || 0) || null,
          last_purchase_date: srcLine.invoice_date,
          is_active: true
        }).select().single()
        if (newProd.error) return NextResponse.json({ error: 'Creation product: ' + newProd.error.message }, { status: 500 })
        newProductId = newProd.data.id
      }

      // Reassigner la ligne product_prices au nouveau product
      var moveLine = await supabase
        .from('product_prices')
        .update({ product_id: newProductId })
        .eq('id', body.price_id)
      if (moveLine.error) return NextResponse.json({ error: 'Deplacement ligne: ' + moveLine.error.message }, { status: 500 })

      // Mettre a jour current_price du nouveau product avec cette ligne
      await supabase.from('products').update({
        current_price: Number(srcLine.master_unit_price || 0),
        last_pack_price: Number(srcLine.pack_price || 0) || null,
        pack_label: srcLine.pack_label || null,
        master_qty_per_pack: Number(srcLine.master_qty_per_pack || 0) || null,
        last_purchase_date: srcLine.invoice_date
      }).eq('id', newProductId)
    }
    else if (body.action === 'create_new') {
      if (!body.new_article || !body.new_article.name) {
        return NextResponse.json({ error: 'new_article.name obligatoire pour create_new' }, { status: 400 })
      }

      // Creer l'article master
      var newArt = await supabase.from('articles').insert({
        name: String(body.new_article.name).trim(),
        category: body.new_article.category || 'ingredient',
        unit: body.new_article.master_unit || 'kg',
        cost_imputation_mode: body.new_article.cost_imputation_mode || 'recipe_ingredient'
      }).select().single()
      if (newArt.error) return NextResponse.json({ error: 'Creation article: ' + newArt.error.message }, { status: 500 })
      newArticleId = newArt.data.id

      // Creer le product chez le supplier de la facture
      var newProd2 = await supabase.from('products').insert({
        article_id: newArticleId,
        supplier_id: supplierId,
        name: newArt.data.name,
        unit: newArt.data.unit,
        category: newArt.data.category,
        current_price: Number(srcLine.master_unit_price || 0),
        pack_label: srcLine.pack_label || null,
        master_qty_per_pack: Number(srcLine.master_qty_per_pack || 0) || null,
        last_pack_price: Number(srcLine.pack_price || 0) || null,
        last_purchase_date: srcLine.invoice_date,
        is_active: true
      }).select().single()
      if (newProd2.error) return NextResponse.json({ error: 'Creation product: ' + newProd2.error.message }, { status: 500 })
      newProductId = newProd2.data.id

      // Reassigner la ligne product_prices
      var moveLine2 = await supabase
        .from('product_prices')
        .update({ product_id: newProductId })
        .eq('id', body.price_id)
      if (moveLine2.error) return NextResponse.json({ error: 'Deplacement ligne: ' + moveLine2.error.message }, { status: 500 })
    }
    else {
      return NextResponse.json({ error: 'Action inconnue: ' + body.action }, { status: 400 })
    }

    // 4. Recalculer current_price de l'ANCIEN product : prendre la ligne suivante la plus recente
    var remainingRes = await supabase
      .from('product_prices')
      .select('id, master_unit_price, pack_price, pack_label, master_qty_per_pack, invoice_date')
      .eq('product_id', oldProductId)
      .order('invoice_date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(1)

    if (remainingRes.data && remainingRes.data.length > 0) {
      var lastLine = remainingRes.data[0]
      await supabase.from('products').update({
        current_price: Number(lastLine.master_unit_price || 0),
        last_pack_price: Number(lastLine.pack_price || 0) || null,
        pack_label: lastLine.pack_label || null,
        master_qty_per_pack: Number(lastLine.master_qty_per_pack || 0) || null,
        last_purchase_date: lastLine.invoice_date
      }).eq('id', oldProductId)
    } else {
      // Plus aucune ligne d'historique : on garde le product mais on remet current_price a 0
      // (l'utilisateur peut le supprimer manuellement s'il le souhaite)
      await supabase.from('products').update({
        current_price: 0,
        last_pack_price: null,
        pack_label: null,
        master_qty_per_pack: null
      }).eq('id', oldProductId)
    }

    // 5. Suppression de l'alias errone si demandee
    var alias_deleted = 0
    if (body.delete_alias && body.alias_text) {
      var aliasNorm = String(body.alias_text).toLowerCase().replace(/\s+/g, ' ').trim()
      var delAlias = await supabase
        .from('product_aliases')
        .delete()
        .eq('alias_normalized', aliasNorm)
      if (!delAlias.error) {
        alias_deleted = delAlias.count || 1
      }
    }

    return NextResponse.json({
      ok: true,
      action: body.action,
      old_product_id: oldProductId,
      new_product_id: newProductId,
      new_article_id: newArticleId,
      alias_deleted: alias_deleted
    })

  } catch (e: any) {
    console.error('rematch error:', e)
    return NextResponse.json({ error: e.message || String(e) }, { status: 500 })
  }
}
