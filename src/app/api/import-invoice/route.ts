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
//   1. Claude Vision OCR → données extraites
//   2. Matching automatique produits + suppliers
//   3. Détection anomalies (hausses prix > 10%, totaux incohérents)
//   4. Décision routage :
//      - auto_commit_enabled=true + pas d'anomalie → commit direct
//      - sinon → insert dans pending_invoices (queue review)
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
        max_tokens: 3000,
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
Extrais TOUTES les lignes de cette facture fournisseur.

Pour chaque produit, catégorise-le :
- "ingredient" = produit alimentaire (viande, fromage, légumes, condiments, pain, etc.)
- "packaging" = emballage (boites, sacs, serviettes, gobelets, couverts, films, etc.)
- "consommable" = produit ménager ou non-alimentaire (liquide vaisselle, essuie-tout, gants, sacs poubelle, etc.)

IMPORTANT pour le prix unitaire :
- Ramène TOUJOURS au kg, L, ou unité individuelle
- Bidon 5kg à 8.25€ → prix_unitaire_ht = 1.65, unite = "kg"
- Poche 650g à 4€ → prix_unitaire_ht = 6.15, unite = "kg"
- Pot 4.08kg à 34€ → prix_unitaire_ht = 8.33, unite = "kg"
- Unitaire → unite = "U"

Retourne UNIQUEMENT un JSON valide (sans markdown) :
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
      "quantite": 1.0,
      "unite": "kg ou U ou L",
      "prix_unitaire_ht": 0.00,
      "conditionnement": "ex: BID 5kg, PCH 650g"
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

    // 2) Matching fournisseur
    var { data: suppliers } = await supabase.from('suppliers').select('id, name, auto_commit_enabled')
    var supplierMap: any = {}
    ;(suppliers || []).forEach(function(s: any) { supplierMap[s.name.toLowerCase()] = s })

    var fournisseurName = parsed.fournisseur || ''
    var supplierId: string | null = null
    var supplierExactName: string | null = null
    var autoCommitEnabled = false
    Object.keys(supplierMap).forEach(function(key) {
      if (fournisseurName.toLowerCase().indexOf(key) > -1 || key.indexOf(fournisseurName.toLowerCase()) > -1) {
        supplierId = supplierMap[key].id
        supplierExactName = supplierMap[key].name
        autoCommitEnabled = supplierMap[key].auto_commit_enabled || false
      }
    })

    // 3) Matching produits (préparation - on ne commit pas encore)
    var { data: allProducts } = await supabase.from('products').select('id, name, unit, current_price, supplier_id, article_id')
    var invoiceDate = parsed.date || new Date().toISOString().split('T')[0]

    for (var i = 0; i < (parsed.lignes || []).length; i++) {
      var ligne = parsed.lignes[i]
      var articleLower = (ligne.article || '').toLowerCase()
      var bestMatch: any = null
      var bestScore = 0

      ;(allProducts || []).forEach(function(ep: any) {
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

      var allMatches: any[] = []
      if (bestScore < 60) {
        ;(allProducts || []).forEach(function(ep: any) {
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
        var chgPct = bestMatch.current_price > 0 ? ((ligne.prix_unitaire_ht - bestMatch.current_price) / bestMatch.current_price * 100) : 0
        
        // Détection anomalie : hausse > 10%
        if (chgPct > 10) {
          anomalies.push('Hausse ' + bestMatch.name + ' : +' + chgPct.toFixed(0) + '%')
        }
        if (chgPct < -30) {
          anomalies.push('Baisse suspecte ' + bestMatch.name + ' : ' + chgPct.toFixed(0) + '%')
        }
        
        matched.push({
          line_index: i,
          article: ligne.article,
          article_original: ligne.article_original,
          matched_to: bestMatch.name,
          matched_id: bestMatch.id,
          score: bestScore,
          old_price: bestMatch.current_price,
          new_price: ligne.prix_unitaire_ht,
          change_pct: chgPct,
          quantite: ligne.quantite,
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
          prix_unitaire_ht: ligne.prix_unitaire_ht, conditionnement: ligne.conditionnement,
          suggested_match: bestMatch.name, suggested_match_id: bestMatch.id,
          suggested_score: bestScore, other_matches: otherSuggestions
        })
      } else if (allMatches && allMatches.length > 0) {
        var topMatch = allMatches[0]
        suggestions.push({
          line_index: i,
          article: ligne.article, article_original: ligne.article_original,
          categorie: ligne.categorie || 'ingredient', unite: ligne.unite,
          prix_unitaire_ht: ligne.prix_unitaire_ht, conditionnement: ligne.conditionnement,
          suggested_match: topMatch.name, suggested_match_id: topMatch.id,
          suggested_score: 25, other_matches: allMatches.slice(1, 4).map(function(am: any) { return {name: am.name, id: am.id} })
        })
      } else {
        unmatched.push({
          line_index: i,
          article: ligne.article, article_original: ligne.article_original,
          categorie: ligne.categorie || 'ingredient', unite: ligne.unite,
          prix_unitaire_ht: ligne.prix_unitaire_ht, conditionnement: ligne.conditionnement
        })
      }
    }

    // 4) Anomalies supplémentaires
    if (!supplierId) anomalies.push('Fournisseur non reconnu : ' + fournisseurName)
    if (unmatched.length > matched.length) anomalies.push('Plus de produits non matchés que matchés (' + unmatched.length + '/' + (parsed.lignes || []).length + ')')
    if (suggestions.length > 0) anomalies.push(suggestions.length + ' produit(s) avec match incertain')

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
          invoice_date: invoiceDate,
          invoice_filename: fileName || null
        })
        await supabase.from('products').update({ current_price: m.new_price }).eq('id', m.matched_id)
        
        // Création task si hausse > 3% (comportement original)
        if (m.change_pct > 3) {
          await supabase.from('tasks').insert({
            title: 'Renégocier ' + m.matched_to + ' (+' + m.change_pct.toFixed(0) + '%) — ' + supplierExactName,
            status: 'todo',
            priority: m.change_pct > 10 ? 'high' : 'medium',
            deadline: new Date().toISOString().split('T')[0]
          })
        }
      }

      // Aussi enregistrer dans pending_invoices avec status='auto_committed'
      await supabase.from('pending_invoices').insert({
        source: source || 'zapier',
        file_name: fileName || 'invoice.pdf',
        pdf_base64: pdfBase64.substring(0, 1000),  // tronqué pour stockage léger
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

      // Push notif success
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

      // Push notif
      var notifBody = matched.length + ' lignes matchées · ' + (parsed.total_ht || 0).toFixed(2) + '€ HT'
      if (hasAnomaly) notifBody = '⚠️ ' + anomalies[0]
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
