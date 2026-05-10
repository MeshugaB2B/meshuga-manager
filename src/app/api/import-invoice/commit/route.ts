import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  )
}

// ============================================================================
// /api/import-invoice/commit
// Recoit la facture VALIDEE par l'utilisateur (avec disposition de chaque ligne)
// et fait toutes les insertions/updates/aliases en cascade.
// ============================================================================

// Format attendu en input :
// {
//   invoice_date: "2026-05-10",
//   file_name: "IMG_xxx.jpg",
//   total_ht: 123.45,
//   supplier: {
//     id: "uuid" | null,                       // null = on cree un nouveau supplier
//     name: "Foodflow",                        // utilise si id null
//     siret: "12345678901234" | null,
//     email_domain: "foodflow.fr" | null,
//     category: "ingredient"                   // utilise si id null
//   },
//   lignes: [
//     {
//       // Donnees brutes facture (toutes lignes)
//       article_original: "...",
//       pack_label: "Bidon 5L",
//       pack_price: 8.25,
//       master_unit: "L",
//       master_qty_per_pack: 5,
//       master_unit_price: 1.65,
//       quantity: 2,
//
//       // Disposition validee par l'utilisateur
//       disposition: "match_existing" | "create_new" | "alias_existing" | "fees_taxes",
//
//       // Cas match_existing : on a un product_id ou un article_id deja en base
//       matched_product_id: "uuid" | null,
//       matched_article_id: "uuid" | null,
//
//       // Cas create_new : creer un nouvel article + product (article_id null = creer aussi un nouvel article)
//       new_article: { name, category, master_unit, cost_imputation_mode } | null,
//
//       // Cas alias_existing : ajouter un alias d'un article connu
//       alias_for_article_id: "uuid" | null,
//
//       // Cas fees_taxes : juste tracer, ne rien creer en products
//
//       // Toujours present : si l'utilisateur a accepte d'enregistrer un alias
//       save_alias: boolean
//     }
//   ]
// }

export async function POST(req: Request) {
  try {
    var body = await req.json()
    var supabase = getSupabase()

    // Validation minimale
    if (!body || !body.supplier || !Array.isArray(body.lignes)) {
      return NextResponse.json({ error: 'Payload invalide' }, { status: 400 })
    }
    var invoiceDate: string = body.invoice_date || new Date().toISOString().split('T')[0]
    var fileName: string = body.file_name || ''
    var invoicePath: string | null = null

    // ------------------------------------------------------------------------
    // 0. UPLOAD DE LA FACTURE DANS LE BUCKET supplier-invoices (si fournie)
    // ------------------------------------------------------------------------
    if (body.file_base64 && body.file_type && fileName) {
      try {
        // Décoder base64 en bytes
        var base64Data = String(body.file_base64).replace(/^data:[^;]+;base64,/, '')
        var binaryString = Buffer.from(base64Data, 'base64')

        // Path : YYYY/MM/YYYY-MM-DD_filename (organisation chronologique)
        var datePart = invoiceDate.split('-')
        var safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_').substring(0, 80)
        // Préfixer avec un timestamp court pour éviter les collisions sur même jour
        var ts = Date.now().toString(36)
        var path = datePart[0] + '/' + datePart[1] + '/' + invoiceDate + '_' + ts + '_' + safeName

        var uploadRes = await supabase.storage
          .from('supplier-invoices')
          .upload(path, binaryString, {
            contentType: body.file_type,
            upsert: false
          })

        if (uploadRes.error) {
          console.error('Storage upload error:', uploadRes.error)
          // Non-bloquant : on continue le commit même si l'upload échoue
        } else if (uploadRes.data) {
          invoicePath = uploadRes.data.path
        }
      } catch (uploadErr: any) {
        console.error('Upload exception:', uploadErr)
        // Non-bloquant
      }
    }

    // ------------------------------------------------------------------------
    // 1. RESOLUTION DU FOURNISSEUR (creation si necessaire)
    // ------------------------------------------------------------------------
    var supplierId: string | null = body.supplier.id || null

    if (!supplierId) {
      var supName = String(body.supplier.name || '').trim()
      if (!supName) return NextResponse.json({ error: 'Nom fournisseur obligatoire' }, { status: 400 })

      var supInsertPayload: any = {
        name: supName,
        category: body.supplier.category || 'ingredient',
        archived: false
      }
      if (body.supplier.siret) supInsertPayload.siret = String(body.supplier.siret).replace(/\D/g, '')
      if (body.supplier.email_domain) supInsertPayload.email_domains = [String(body.supplier.email_domain).toLowerCase()]

      var supRes = await supabase.from('suppliers').insert(supInsertPayload).select().single()
      if (supRes.error) return NextResponse.json({ error: 'Erreur creation supplier: ' + supRes.error.message }, { status: 500 })
      supplierId = supRes.data.id
    } else {
      // Enrichir le supplier existant si on a SIRET ou email domain non encore enregistres
      var existingSupRes = await supabase.from('suppliers').select('siret, email_domains').eq('id', supplierId).single()
      if (existingSupRes.data) {
        var updates: any = {}
        if (body.supplier.siret && !existingSupRes.data.siret) {
          updates.siret = String(body.supplier.siret).replace(/\D/g, '')
        }
        if (body.supplier.email_domain) {
          var existingDomains: string[] = Array.isArray(existingSupRes.data.email_domains) ? existingSupRes.data.email_domains : []
          var newDomain = String(body.supplier.email_domain).toLowerCase()
          if (existingDomains.indexOf(newDomain) < 0) {
            updates.email_domains = existingDomains.concat([newDomain])
          }
        }
        if (Object.keys(updates).length > 0) {
          await supabase.from('suppliers').update(updates).eq('id', supplierId)
        }
      }
    }

    // ------------------------------------------------------------------------
    // 2. TRAITEMENT DES LIGNES UNE PAR UNE
    // ------------------------------------------------------------------------
    var summary: any = {
      matched_existing: 0,
      created_new: 0,
      aliased: 0,
      fees_ignored: 0,
      price_history_inserted: 0,
      tasks_created: 0
    }
    var errors: any[] = []
    var priceAlerts: any[] = [] // pour creation tasks/push apres

    for (var i = 0; i < body.lignes.length; i++) {
      var ligne = body.lignes[i] || {}
      var disposition = ligne.disposition || 'match_existing'

      try {
        if (disposition === 'fees_taxes') {
          summary.fees_ignored++
          continue
        }

        // Resoudre l'article_id et le product_id, en creant ce qui manque
        var articleId: string | null = ligne.matched_article_id || null
        var productId: string | null = ligne.matched_product_id || null

        if (disposition === 'create_new') {
          // a. Creer l'article si pas d'article_id
          if (!articleId) {
            if (!ligne.new_article || !ligne.new_article.name) {
              errors.push({ line: i, error: 'create_new sans new_article.name' })
              continue
            }
            var artInsert = await supabase.from('articles').insert({
              name: String(ligne.new_article.name).trim(),
              category: ligne.new_article.category || ligne.categorie || 'ingredient',
              unit: ligne.new_article.master_unit || ligne.master_unit || 'kg',
              cost_imputation_mode: ligne.new_article.cost_imputation_mode || 'recipe_ingredient'
            }).select().single()
            if (artInsert.error) {
              errors.push({ line: i, error: 'creation article: ' + artInsert.error.message })
              continue
            }
            articleId = artInsert.data.id
            summary.created_new++
          }
        }

        if (disposition === 'alias_existing') {
          if (!ligne.alias_for_article_id) {
            errors.push({ line: i, error: 'alias_existing sans alias_for_article_id' })
            continue
          }
          articleId = ligne.alias_for_article_id
        }

        // b. Resoudre/creer le product (= declinaison fournisseur)
        if (!productId && articleId) {
          // Chercher si un product existe deja pour (article_id, supplier_id)
          var existingProdRes = await supabase
            .from('products')
            .select('id, current_price, name')
            .eq('article_id', articleId)
            .eq('supplier_id', supplierId)
            .eq('is_active', true)
            .limit(1)
          if (existingProdRes.data && existingProdRes.data.length > 0) {
            productId = existingProdRes.data[0].id
          } else {
            // Creer un nouveau product
            var artNameRes = await supabase.from('articles').select('name, unit').eq('id', articleId).single()
            var artName = artNameRes.data ? artNameRes.data.name : (ligne.article_original || 'Produit')
            var artUnit = artNameRes.data ? artNameRes.data.unit : (ligne.master_unit || 'kg')
            var newProdRes = await supabase.from('products').insert({
              name: artName,
              article_id: articleId,
              supplier_id: supplierId,
              unit: artUnit,
              category: ligne.categorie || 'ingredient',
              current_price: Number(ligne.master_unit_price || 0),
              pack_label: ligne.pack_label || null,
              master_qty_per_pack: Number(ligne.master_qty_per_pack || 0) || null,
              last_pack_price: Number(ligne.pack_price || 0) || null,
              last_purchase_date: invoiceDate,
              is_active: true
            }).select().single()
            if (newProdRes.error) {
              errors.push({ line: i, error: 'creation product: ' + newProdRes.error.message })
              continue
            }
            productId = newProdRes.data.id
          }
        }

        if (!productId) {
          errors.push({ line: i, error: 'productId non resolu (disposition=' + disposition + ')' })
          continue
        }

        // c. Lecture de l'ancien prix pour detection de hausse
        var oldProdRes = await supabase.from('products').select('current_price, name').eq('id', productId).single()
        var oldPrice = oldProdRes.data ? Number(oldProdRes.data.current_price || 0) : 0
        var prodName = oldProdRes.data ? oldProdRes.data.name : ligne.article_original

        // d. Update du product : current_price + conditionnement + last_purchase_date
        var newMaster = Number(ligne.master_unit_price || 0)
        var prodUpdate: any = {
          current_price: newMaster,
          last_purchase_date: invoiceDate
        }
        if (ligne.pack_label) prodUpdate.pack_label = ligne.pack_label
        if (Number(ligne.master_qty_per_pack || 0) > 0) prodUpdate.master_qty_per_pack = Number(ligne.master_qty_per_pack)
        if (Number(ligne.pack_price || 0) > 0) prodUpdate.last_pack_price = Number(ligne.pack_price)

        await supabase.from('products').update(prodUpdate).eq('id', productId)

        // e. Insert dans product_prices (historique)
        var pricesInsert = await supabase.from('product_prices').insert({
          product_id: productId,
          master_unit_price: newMaster,
          pack_price: Number(ligne.pack_price || 0) || null,
          pack_label: ligne.pack_label || null,
          master_qty_per_pack: Number(ligne.master_qty_per_pack || 0) || null,
          article_original: ligne.article_original || null,
          invoice_date: invoiceDate,
          invoice_filename: fileName || null,
          invoice_path: invoicePath || null
        })
        if (!pricesInsert.error) summary.price_history_inserted++

        if (disposition === 'match_existing') summary.matched_existing++
        if (disposition === 'alias_existing') summary.aliased++

        // f. Enregistrer un alias si demande (libelle facture different du nom canonique)
        if (ligne.save_alias && articleId) {
          var aliasText = String(ligne.article_original || '').trim()
          var aliasNorm = aliasText.toLowerCase().replace(/\s+/g, ' ').trim()
          if (aliasText && aliasText.toLowerCase() !== String(prodName || '').toLowerCase()) {
            // upsert alias : si existe deja, incrementer confirmed_count
            var existingAlias = await supabase
              .from('product_aliases')
              .select('id, confirmed_count')
              .eq('alias_normalized', aliasNorm)
              .eq('article_id', articleId)
              .limit(1)
            if (existingAlias.data && existingAlias.data.length > 0) {
              await supabase
                .from('product_aliases')
                .update({ confirmed_count: (existingAlias.data[0].confirmed_count || 1) + 1 })
                .eq('id', existingAlias.data[0].id)
            } else {
              await supabase.from('product_aliases').insert({
                product_id: productId,
                article_id: articleId,
                supplier_id: supplierId,
                alias: aliasText,
                alias_normalized: aliasNorm,
                source: 'invoice_validation',
                confirmed_count: 1
              })
            }
          }
        }

        // g. Detection de hausse pour notif/task post-commit
        if (oldPrice > 0 && newMaster > 0) {
          var chgPct = (newMaster - oldPrice) / oldPrice * 100
          if (chgPct > 5) {
            priceAlerts.push({
              product_name: prodName,
              old_price: oldPrice,
              new_price: newMaster,
              change_pct: chgPct,
              supplier_id: supplierId
            })
          }
        }

      } catch (lineErr: any) {
        errors.push({ line: i, error: String(lineErr.message || lineErr) })
      }
    }

    // ------------------------------------------------------------------------
    // 3. CREATION DES TASKS DE RENEGO (apres validation utilisateur)
    // ------------------------------------------------------------------------
    var supplierNameRes = await supabase.from('suppliers').select('name').eq('id', supplierId).single()
    var supplierName = supplierNameRes.data ? supplierNameRes.data.name : ''

    for (var k = 0; k < priceAlerts.length; k++) {
      var alert = priceAlerts[k]
      var taskTitle = 'Renegocier ' + alert.product_name + ' (+' + alert.change_pct.toFixed(0) + '%) — ' + supplierName
      var taskInsert = await supabase.from('tasks').insert({
        title: taskTitle,
        status: 'todo',
        priority: alert.change_pct > 15 ? 'high' : 'medium',
        deadline: new Date().toISOString().split('T')[0]
      })
      if (!taskInsert.error) summary.tasks_created++

      // Push (best effort, ne fait pas planter en cas d'echec)
      try {
        await fetch('https://ldfxpizsebizzrexghqz.supabase.co/functions/v1/send-push', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: '🔴 Hausse prix — ' + alert.product_name,
            body: supplierName + ': +' + alert.change_pct.toFixed(0) + '% (' + alert.old_price.toFixed(2) + ' → ' + alert.new_price.toFixed(2) + ' EUR)',
            target: 'all'
          })
        })
      } catch (pushErr) { /* swallow */ }
    }

    return NextResponse.json({
      ok: true,
      supplier_id: supplierId,
      summary: summary,
      price_alerts: priceAlerts,
      errors: errors
    })

  } catch (e: any) {
    console.error('commit error:', e)
    return NextResponse.json({ error: e.message || String(e) }, { status: 500 })
  }
}
