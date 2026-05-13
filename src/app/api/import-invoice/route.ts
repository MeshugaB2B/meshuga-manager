import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  )
}

// =============================================================================
// POST /api/import-invoice
// Reçoit un PDF base64 (depuis Zapier ou upload manuel)
// Flow :
//   1. Claude Vision OCR avec règles spécifiques par fournisseur
//   2. Matching produits + suppliers (respecte auto_match_blocked)
//   3. Détection anomalies via alert_threshold_pct du fournisseur
//   4. Routage : auto-commit OU pending queue selon supplier.auto_commit_enabled
//   5. Push notif à Edward
// =============================================================================

export async function POST(req: Request) {
  try {
    var body = await req.json()
    var { pdfBase64, fileName, mediaType, source } = body
    if (!pdfBase64) return NextResponse.json({ error: 'PDF manquant' }, { status: 400 })

    // 1) Claude Vision OCR
    var res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY || '',
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4000,
        messages: [{
          role: 'user',
          content: [
            {
              type: (mediaType && mediaType.startsWith('image/')) ? 'image' : 'document',
              source: { type: 'base64', media_type: (mediaType && mediaType.startsWith('image/')) ? mediaType : 'application/pdf', data: pdfBase64 }
            },
            {
              type: 'text',
              text: `Tu es un assistant pour Meshuga Crazy Deli, un restaurant à Paris.
Extrais TOUTES les lignes de cette facture fournisseur avec une PRÉCISION MAXIMALE sur le conditionnement.

CATÉGORISATION :
- "ingredient" = produit alimentaire (viande, fromage, légumes, condiments, pain, etc.)
- "packaging" = emballage (boites, sacs, serviettes, gobelets, couverts, films, etc.)
- "consommable" = produit ménager ou non-alimentaire (liquide vaisselle, essuie-tout, gants, sacs poubelle, etc.)

⚠️⚠️⚠️ RÈGLE ABSOLUE — LIRE LA COLONNE "QUANTITÉ LIVRÉE" ⚠️⚠️⚠️

La VRAIE quantité facturée est dans la colonne "quantité livrée" (souvent à droite de l'article ou en colonne dédiée). L'intitulé de l'article contient des descriptions marketing mais N'EST PAS la quantité.

🚨 RÈGLES SPÉCIALES EPISAVEURS (le plus important) :
Les codes de quantité livrée Episaveurs sont :
- "1 BCL" = 1 BOCAL (l'unité de vente, peu importe ce que dit l'intitulé)
- "N BT" = N BOUTEILLES individuelles
- "1 BTE" = 1 BOÎTE (l'unité de vente)
- "1 CAR" = 1 CARTON
- "1 SAC" = 1 SAC
- "1 POCH" = 1 POCHE
- "1 BID" = 1 BIDON

⚠️ NE JAMAIS multiplier par le "xN" présent dans l'intitulé. C'est du descriptif marketing pour montrer le packaging d'origine, mais NE compte PAS pour le calcul du prix.

EXEMPLES EPISAVEURS À MÉMORISER :
- "Cornich aigre dx bcl 1,6KGLx6 Reitzel" + colonne livrée "1 BCL" + 7,01€HT
  → 1 bocal de 1,6 kg facturé 7,01€ HT
  → conditionnement = "Bocal 1.6 kg"
  → master_qty_per_pack = 1.6 (en kg)
  → master_unit_price = 7.01 / 1.6 = 4.381 €/kg ✓
  ❌ FAUX : 7.01 / 9.6 = 0.73 €/kg (multiplie par x6 → INTERDIT)

- "Eau source nat plate (PET1,5Lx6) Cristali" + colonne livrée "6 BT" + 1,53€HT
  → 6 bouteilles de 1.5L facturées 1,53€ HT
  → conditionnement = "Bouteille 1.5L"
  → master_qty_per_pack = 6 (en bouteilles)
  → master_unit_price = 1.53 / 6 = 0.255 €/bouteille ✓

- "Gant nitril s-pdre TM nr EDC(100U)x10 Mut" + colonne livrée "1 BTE" + 5,14€HT
  → 1 boîte de 100 gants = 50 paires facturée 5,14€ HT
  → conditionnement = "Boîte 50 paires"
  → master_qty_per_pack = 50 (en paires)
  → master_unit_price = 5.14 / 50 = 0.103 €/paire ✓

🚨 RÈGLES SPÉCIALES MONARQUE (boulangerie) :
Les factures Monarque sont en LOTS. Le nombre d'unités est explicite dans l'intitulé :
- Pattern "xN" : "Hot dog 90g x20" = 20 unités (le 90g = poids unitaire, x20 = quantité)
- Pattern "N tranches" : "Lobster Roll 1140g 12 tranches" = 12 unités
- TVA pain = 5,5%

EXEMPLES MONARQUE :
- "Hot dog 90g x20" + 11.40€ TTC (TVA 5.5%)
  → 20 pains hot dog
  → HT = 11.40 / 1.055 = 10.806€
  → master_unit_price = 10.806 / 20 = 0.540 €/U ✓

- "Lobster Roll 1140g 12 tranches" + 8.72€ TTC (TVA 5.5%)
  → 12 pains à sandwich
  → HT = 8.72 / 1.055 = 8.265€
  → master_unit_price = 8.265 / 12 = 0.689 €/U ✓

NOTE : Si tu vois "mini" dans un intitulé Monarque → c'est un Pain mini distinct (à matcher avec product "Pain mini" si présent).

🔎 PATTERNS GÉNÉRAUX (autres fournisseurs) :
- Bidon 5kg à 8.25€ → master_unit_price = 1.65€/kg, unite = "kg"
- Poche 650g à 4€ → master_unit_price = 6.15€/kg, unite = "kg"
- Pot 4.08kg à 34€ → master_unit_price = 8.33€/kg, unite = "kg"

📋 RETOURNE UNIQUEMENT un JSON valide (sans markdown) :
{
  "fournisseur": "Nom du fournisseur",
  "date": "AAAA-MM-JJ",
  "total_ht": 0.00,
  "total_ttc": 0.00,
  "numero_facture": "ex FAC-2026-001",
  "lignes": [
    {
      "article": "nom simplifié court",
      "article_original": "description complète facture",
      "categorie": "ingredient ou packaging ou consommable",
      "quantite_livree": 1,
      "code_livraison": "BCL ou BT ou BTE ou CAR ou SAC ou U etc",
      "conditionnement": "Bocal 1.6 kg ou Pack 6x1.5L ou Lot x20 etc",
      "master_qty_per_pack": 1.6,
      "unite": "kg ou U ou L",
      "pack_price_ht": 7.01,
      "master_unit_price": 4.381,
      "tva_pct": 20
    }
  ]
}`
            }
          ]
        }]
      })
    })

    var data = await res.json()
    var text = data.content?.[0]?.text?.trim() || ''
    text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    var parsed = JSON.parse(text)

    var supabase = getSupabase()
    var matched: any[] = []
    var suggestions: any[] = []
    var unmatched: any[] = []
    var anomalies: string[] = []

    // 2) Matching fournisseur (avec récupération du seuil d'alerte personnalisé)
    var { data: suppliers } = await supabase.from('suppliers').select('id, name, auto_commit_enabled, alert_threshold_pct')
    var supplierMap: any = {}
    ;(suppliers || []).forEach(function(s: any) { supplierMap[s.name.toLowerCase()] = s })

    var fournisseurName = parsed.fournisseur || ''
    var supplierId: string | null = null
    var supplierExactName: string | null = null
    var autoCommitEnabled = false
    var alertThreshold = 10  // défaut 10%
    Object.keys(supplierMap).forEach(function(key) {
      if (fournisseurName.toLowerCase().indexOf(key) > -1 || key.indexOf(fournisseurName.toLowerCase()) > -1) {
        supplierId = supplierMap[key].id
        supplierExactName = supplierMap[key].name
        autoCommitEnabled = supplierMap[key].auto_commit_enabled || false
        alertThreshold = Number(supplierMap[key].alert_threshold_pct) || 10
      }
    })

    // 3) Matching produits (préparation - on ne commit pas encore)
    // IMPORTANT : on exclut auto_match_blocked du matching automatique
    var { data: allProducts } = await supabase
      .from('products')
      .select('id, name, unit, current_price, supplier_id, auto_match_blocked')
    
    var invoiceDate = parsed.date || new Date().toISOString().split('T')[0]

    for (var i = 0; i < (parsed.lignes || []).length; i++) {
      var ligne = parsed.lignes[i]
      var articleLower = (ligne.article || '').toLowerCase()
      var bestMatch: any = null
      var bestScore = 0
      
      // Récupérer le master_unit_price (ce que le prompt v2 renvoie)
      var newPrice = Number(ligne.master_unit_price) || Number(ligne.prix_unitaire_ht) || 0

      // MATCHING : exclure les produits avec auto_match_blocked=true
      ;(allProducts || []).forEach(function(ep: any) {
        if (ep.auto_match_blocked) return  // ⛔ skip les produits bloqués
        
        var epLower = ep.name.toLowerCase()
        if (epLower === articleLower) { bestMatch = ep; bestScore = 100; return }
        if (epLower.indexOf(articleLower) > -1 || articleLower.indexOf(epLower) > -1) {
          if (bestScore < 90) { bestMatch = ep; bestScore = 90 }
          return
        }
        var artWords = articleLower.split(/[\s,.-]+/).filter(function(w: string) { return w.length > 2 })
        var epWords = epLower.split(/[\s,.-]+/).filter(function(w: string) { return w.length > 2 })
        var matchCount = 0
        artWords.forEach(function(aw: string) {
          epWords.forEach(function(ew: string) {
            if (aw === ew || (aw.length > 4 && ew.indexOf(aw) > -1) || (ew.length > 4 && aw.indexOf(ew) > -1)) {
              matchCount++
            }
          })
        })
        if (matchCount > 0) {
          var score = Math.min(30 + matchCount * 25, 85)
          if (score > bestScore) { bestMatch = ep; bestScore = score }
        }
      })

      // Suggestions = matches partiels (sans auto_match_blocked aussi)
      var allMatches: any[] = []
      if (bestScore < 60) {
        ;(allProducts || []).forEach(function(ep: any) {
          if (ep.auto_match_blocked) return  // ⛔ skip
          var epLower = ep.name.toLowerCase()
          var artWords = articleLower.split(/[\s,.-]+/).filter(function(w: string) { return w.length > 2 })
          var epWords = epLower.split(/[\s,.-]+/).filter(function(w: string) { return w.length > 2 })
          var found = false
          artWords.forEach(function(aw: string) {
            epWords.forEach(function(ew: string) {
              if (aw === ew || (aw.length > 4 && ew.indexOf(aw) > -1) || (ew.length > 4 && aw.indexOf(ew) > -1)) found = true
            })
          })
          if (found) allMatches.push(ep)
        })
      }

      if (bestMatch && bestScore >= 60) {
        var chgPct = bestMatch.current_price > 0 ? ((newPrice - bestMatch.current_price) / bestMatch.current_price * 100) : 0
        
        // Détection anomalie avec seuil personnalisé par fournisseur
        if (chgPct > alertThreshold) {
          anomalies.push('🚨 Hausse ' + bestMatch.name + ' : +' + chgPct.toFixed(1) + '% (seuil ' + alertThreshold + '%)')
        }
        if (chgPct < -30) {
          anomalies.push('⚠️ Baisse suspecte ' + bestMatch.name + ' : ' + chgPct.toFixed(1) + '%')
        }
        
        matched.push({
          line_index: i,
          article: ligne.article,
          article_original: ligne.article_original,
          matched_to: bestMatch.name,
          matched_id: bestMatch.id,
          score: bestScore,
          old_price: bestMatch.current_price,
          new_price: newPrice,
          change_pct: chgPct,
          quantite_livree: ligne.quantite_livree,
          code_livraison: ligne.code_livraison,
          master_qty_per_pack: ligne.master_qty_per_pack,
          pack_price_ht: ligne.pack_price_ht,
          unite: ligne.unite,
          categorie: ligne.categorie,
          conditionnement: ligne.conditionnement
        })
      } else if (bestMatch && bestScore >= 30) {
        var otherSuggestions = (allMatches || []).filter(function(am: any) { return am.id !== bestMatch.id }).slice(0, 3).map(function(am: any) { return {name: am.name, id: am.id} })
        suggestions.push({
          line_index: i,
          article: ligne.article, article_original: ligne.article_original,
          categorie: ligne.categorie || 'ingredient', unite: ligne.unite,
          prix_unitaire_ht: newPrice, conditionnement: ligne.conditionnement,
          quantite_livree: ligne.quantite_livree, code_livraison: ligne.code_livraison,
          master_qty_per_pack: ligne.master_qty_per_pack, pack_price_ht: ligne.pack_price_ht,
          suggested_match: bestMatch.name, suggested_match_id: bestMatch.id,
          suggested_score: bestScore, other_matches: otherSuggestions
        })
      } else if (allMatches && allMatches.length > 0) {
        var topMatch = allMatches[0]
        suggestions.push({
          line_index: i,
          article: ligne.article, article_original: ligne.article_original,
          categorie: ligne.categorie || 'ingredient', unite: ligne.unite,
          prix_unitaire_ht: newPrice, conditionnement: ligne.conditionnement,
          quantite_livree: ligne.quantite_livree, code_livraison: ligne.code_livraison,
          master_qty_per_pack: ligne.master_qty_per_pack, pack_price_ht: ligne.pack_price_ht,
          suggested_match: topMatch.name, suggested_match_id: topMatch.id,
          suggested_score: 25, other_matches: allMatches.slice(1, 4).map(function(am: any) { return {name: am.name, id: am.id} })
        })
      } else {
        unmatched.push({
          line_index: i,
          article: ligne.article, article_original: ligne.article_original,
          categorie: ligne.categorie || 'ingredient', unite: ligne.unite,
          prix_unitaire_ht: newPrice, conditionnement: ligne.conditionnement,
          quantite_livree: ligne.quantite_livree, code_livraison: ligne.code_livraison,
          master_qty_per_pack: ligne.master_qty_per_pack, pack_price_ht: ligne.pack_price_ht
        })
      }
    }

    // 4) Anomalies supplémentaires
    if (!supplierId) anomalies.push('⚠️ Fournisseur non reconnu : ' + fournisseurName)
    if (unmatched.length > matched.length) anomalies.push('⚠️ Plus de produits non matchés que matchés (' + unmatched.length + '/' + (parsed.lignes || []).length + ')')
    if (suggestions.length > 0) anomalies.push('ℹ️ ' + suggestions.length + ' produit(s) avec match incertain')

    var hasAnomaly = anomalies.length > 0
    var canAutoCommit = autoCommitEnabled && !hasAnomaly && supplierId

    // 5) Décision routage : auto-commit OU pending queue
    if (canAutoCommit) {
      // ── AUTO-COMMIT : insertion directe dans product_prices ──
      for (var j = 0; j < matched.length; j++) {
        var m = matched[j]
        await supabase.from('product_prices').insert({
          product_id: m.matched_id,
          price: m.new_price,
          master_unit_price: m.new_price,
          pack_price: m.pack_price_ht,
          pack_label: m.conditionnement,
          master_qty_per_pack: m.master_qty_per_pack,
          article_original: m.article_original,
          invoice_date: invoiceDate,
          invoice_filename: fileName || null
        })
        await supabase.from('products').update({ current_price: m.new_price }).eq('id', m.matched_id)
        
        // Création task si hausse > seuil
        if (m.change_pct > alertThreshold) {
          await supabase.from('tasks').insert({
            title: '🚨 Renégocier ' + m.matched_to + ' (+' + m.change_pct.toFixed(1) + '%) — ' + supplierExactName,
            status: 'todo',
            priority: m.change_pct > 15 ? 'high' : 'medium',
            deadline: new Date().toISOString().split('T')[0]
          })
        }
      }

      // Aussi enregistrer dans pending_invoices avec status='auto_committed'
      await supabase.from('pending_invoices').insert({
        source: source || 'zapier',
        file_name: fileName || 'invoice.pdf',
        pdf_base64: pdfBase64.substring(0, 1000),
        extracted_data: parsed,
        fournisseur_extracted: fournisseurName,
        supplier_id: supplierId,
        invoice_date: invoiceDate,
        invoice_number: parsed.numero_facture || null,
        total_ht: parsed.total_ht || null,
        total_ttc: parsed.total_ttc || null,
        nb_lines: (parsed.lignes || []).length,
        has_anomaly: false,
        anomaly_reasons: [],
        status: 'auto_committed',
        committed_at: new Date().toISOString(),
        can_rollback_until: new Date(Date.now() + 24 * 3600 * 1000).toISOString()
      })

      fetch('https://ldfxpizsebizzrexghqz.supabase.co/functions/v1/send-push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: '✅ Facture importée auto — ' + supplierExactName,
          body: matched.length + ' lignes · ' + (parsed.total_ht || 0).toFixed(2) + '€ HT',
          target: 'all'
        })
      }).catch(function(){})

      return NextResponse.json({
        ok: true,
        mode: 'auto_committed',
        fournisseur: fournisseurName,
        fournisseur_matched: supplierExactName,
        alert_threshold_used: alertThreshold,
        date: invoiceDate,
        total_ht: parsed.total_ht,
        supplier_id: supplierId,
        matched: matched,
        suggestions: suggestions,
        unmatched: unmatched
      })
    } else {
      // ── PENDING QUEUE : insertion pour validation manuelle ──
      var { data: pendingInserted } = await supabase.from('pending_invoices').insert({
        source: source || 'zapier',
        file_name: fileName || 'invoice.pdf',
        pdf_base64: pdfBase64,
        extracted_data: {
          ...parsed,
          matched: matched,
          suggestions: suggestions,
          unmatched: unmatched
        },
        fournisseur_extracted: fournisseurName,
        supplier_id: supplierId,
        invoice_date: invoiceDate,
        invoice_number: parsed.numero_facture || null,
        total_ht: parsed.total_ht || null,
        total_ttc: parsed.total_ttc || null,
        nb_lines: (parsed.lignes || []).length,
        has_anomaly: hasAnomaly,
        anomaly_reasons: anomalies,
        status: 'pending'
      }).select('id').single()

      var notifBody = matched.length + ' lignes matchées · ' + (parsed.total_ht || 0).toFixed(2) + '€ HT'
      if (hasAnomaly && anomalies.length > 0) notifBody = anomalies[0]
      fetch('https://ldfxpizsebizzrexghqz.supabase.co/functions/v1/send-push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: '📥 Facture à valider — ' + (supplierExactName || fournisseurName || 'Inconnu'),
          body: notifBody,
          target: 'all'
        })
      }).catch(function(){})

      return NextResponse.json({
        ok: true,
        mode: 'pending',
        pending_id: pendingInserted?.id,
        fournisseur: fournisseurName,
        fournisseur_matched: supplierExactName,
        alert_threshold_used: alertThreshold,
        date: invoiceDate,
        total_ht: parsed.total_ht,
        supplier_id: supplierId,
        has_anomaly: hasAnomaly,
        anomalies: anomalies,
        matched: matched,
        suggestions: suggestions,
        unmatched: unmatched,
        lignes: parsed.lignes
      })
    }
  } catch (e: any) {
    console.error('import-invoice error:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
