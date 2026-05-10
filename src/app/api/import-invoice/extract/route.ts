import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  )
}

// ============================================================================
// /api/import-invoice/extract
// Extraction Claude Vision + matching multi-niveau. AUCUNE ecriture en DB.
// Le client recoit les donnees structurees pour validation manuelle.
// La persistance se fait via /api/import-invoice/commit apres validation.
// ============================================================================

export async function POST(req: Request) {
  try {
    var body = await req.json()
    var { pdfBase64, fileName, mediaType } = body
    if (!pdfBase64) return NextResponse.json({ error: 'PDF manquant' }, { status: 400 })

    // ------------------------------------------------------------------------
    // 1. APPEL CLAUDE VISION avec prompt enrichi
    // ------------------------------------------------------------------------
    var promptText = `Tu es un assistant pour Meshuga Crazy Deli, un restaurant a Paris.
Extrais TOUTES les lignes de cette facture fournisseur.

Pour le FOURNISSEUR :
- Identifie precisement le nom commercial (pas la raison sociale complete avec SAS/SARL)
- Si le SIRET est visible, extrais-le aussi
- Si une adresse email du fournisseur est visible, extrais le domaine

Pour CHAQUE LIGNE de la facture :

1. CATEGORISATION precise :
   - "ingredient" = produit alimentaire entrant en cuisine (viande, fromage, legumes, condiments, pain, epices, huile, sucre, sel)
   - "boisson" = boisson destinee a la revente (Coca, Evian, Perrier, Ice Tea, Orangina, jus, eaux)
   - "packaging" = emballage produit fini (boites, sacs, gobelets, couvercles, films, sachets)
   - "consommable" = produit non-alimentaire ou nettoyage (liquide vaisselle, essuie-tout, gants, sacs poubelle, papier toilette, produits d'entretien)
   - "fees_taxes" = NON-PRODUIT (frais de port, frais de livraison, transport, remise globale, eco-participation, taxes sur facture). C'est CRUCIAL : si la ligne n'est pas un produit physique, classe-la ici, pas en autre chose.

2. CONDITIONNEMENT et PRIX :
   - "pack_label" : libelle humain du conditionnement tel qu'il apparait sur la facture (ex: "Bidon 5L", "Carton 12 x 33cl", "Sac 10kg", "Poche 650g")
   - "pack_price" : prix du PACK ENTIER tel que sur la facture en EUR HT
   - "master_unit" : unite normalisee parmi "kg", "L", "U" (jamais "g", "ml", "piece")
   - "master_qty_per_pack" : quantite en unite master que contient le pack (ex: bidon 5L -> 5, carton 12 x 33cl -> 3.96, sac 10kg -> 10, paquet de 6 unites -> 6)
   - "master_unit_price" : prix unitaire dans l'unite master = pack_price / master_qty_per_pack (calcule)

3. CONFIANCE :
   - "confidence" : entier 0-100 indiquant ta confiance dans l'extraction de cette ligne
   - 100 = libelle clair, conditionnement explicite, prix sans ambiguite
   - 70-90 = lecture correcte mais ambiguite mineure (ex: unite implicite)
   - <70 = lecture difficile (texte flou, conditionnement non specifie)

4. AUTRES CHAMPS :
   - "article" : nom court canonique (ex: "Cheddar", "Coca Cola")
   - "article_original" : description complete telle qu'elle apparait
   - "quantity" : quantite de pack achetee (ex: 2 bidons -> 2)

EXEMPLES :
- "BIDON 5L HUILE TOURNESOL FRITURE x 2 = 16.50 EUR HT"
  -> { article: "Huile tournesol friture", article_original: "BIDON 5L HUILE TOURNESOL FRITURE", categorie: "ingredient", quantity: 2, pack_label: "Bidon 5L", pack_price: 8.25, master_unit: "L", master_qty_per_pack: 5, master_unit_price: 1.65, confidence: 95 }
- "CHEDDAR BARRE 5KG x 1 = 41.30 EUR HT"
  -> { article: "Cheddar", article_original: "CHEDDAR BARRE 5KG", categorie: "ingredient", quantity: 1, pack_label: "Barre 5kg", pack_price: 41.30, master_unit: "kg", master_qty_per_pack: 5, master_unit_price: 8.26, confidence: 100 }
- "FRAIS DE LIVRAISON = 8.50 EUR"
  -> { article: "Frais de livraison", article_original: "FRAIS DE LIVRAISON", categorie: "fees_taxes", quantity: 1, pack_label: "", pack_price: 8.50, master_unit: "U", master_qty_per_pack: 1, master_unit_price: 8.50, confidence: 100 }

Retourne UNIQUEMENT un JSON valide (sans markdown, sans backticks) :
{
  "fournisseur": "Nom commercial",
  "fournisseur_siret": "12345678901234 ou null",
  "fournisseur_email_domain": "foodflow.fr ou null",
  "date": "AAAA-MM-JJ",
  "total_ht": 0.00,
  "lignes": [
    {
      "article": "...",
      "article_original": "...",
      "categorie": "ingredient|boisson|packaging|consommable|fees_taxes",
      "quantity": 1,
      "pack_label": "...",
      "pack_price": 0.00,
      "master_unit": "kg|L|U",
      "master_qty_per_pack": 0,
      "master_unit_price": 0.00,
      "confidence": 0
    }
  ]
}`

    var visionRes = await fetch('https://api.anthropic.com/v1/messages', {
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
              source: {
                type: 'base64',
                media_type: (mediaType && mediaType.startsWith('image/')) ? mediaType : 'application/pdf',
                data: pdfBase64
              }
            },
            { type: 'text', text: promptText }
          ]
        }]
      })
    })

    var visionData = await visionRes.json()
    var rawText = (visionData && visionData.content && visionData.content[0] && visionData.content[0].text) ? String(visionData.content[0].text).trim() : ''
    rawText = rawText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()

    var parsed: any = null
    try {
      parsed = JSON.parse(rawText)
    } catch (e: any) {
      return NextResponse.json({
        error: 'Claude Vision n\'a pas retourne de JSON valide',
        raw_text: rawText.slice(0, 500)
      }, { status: 500 })
    }

    var supabase = getSupabase()

    // ------------------------------------------------------------------------
    // 2. IDENTIFICATION DU FOURNISSEUR
    // ------------------------------------------------------------------------
    var suppliersRes = await supabase.from('suppliers').select('id, name, siret, email_domains, archived')
    var allSuppliers = suppliersRes.data || []

    var supplierGuessId: string | null = null
    var supplierGuessConfidence = 0
    var fournisseurRaw = String(parsed.fournisseur || '').toLowerCase().trim()
    var siretRaw = String(parsed.fournisseur_siret || '').replace(/\D/g, '')
    var emailDomain = String(parsed.fournisseur_email_domain || '').toLowerCase().trim()

    // Priorite 1 : SIRET
    if (siretRaw && siretRaw.length >= 14) {
      var byS = allSuppliers.find(function(s: any) { return s.siret && String(s.siret).replace(/\D/g, '') === siretRaw })
      if (byS) { supplierGuessId = byS.id; supplierGuessConfidence = 100 }
    }

    // Priorite 2 : domaine email
    if (!supplierGuessId && emailDomain) {
      var byE = allSuppliers.find(function(s: any) {
        return Array.isArray(s.email_domains) && s.email_domains.some(function(d: string) { return String(d).toLowerCase() === emailDomain })
      })
      if (byE) { supplierGuessId = byE.id; supplierGuessConfidence = 95 }
    }

    // Priorite 3 : substring sur le nom
    if (!supplierGuessId && fournisseurRaw) {
      var bestNameScore = 0
      var bestNameId: string | null = null
      allSuppliers.forEach(function(s: any) {
        if (s.archived) return
        var sLow = String(s.name || '').toLowerCase()
        if (!sLow) return
        var score = 0
        if (sLow === fournisseurRaw) score = 100
        else if (fournisseurRaw.indexOf(sLow) >= 0 || sLow.indexOf(fournisseurRaw) >= 0) score = 85
        if (score > bestNameScore) { bestNameScore = score; bestNameId = s.id }
      })
      if (bestNameId && bestNameScore >= 80) {
        supplierGuessId = bestNameId
        supplierGuessConfidence = bestNameScore
      }
    }

    // ------------------------------------------------------------------------
    // 3. MATCHING LIGNE PAR LIGNE via la fonction SQL match_invoice_line
    // ------------------------------------------------------------------------
    var enrichedLignes: any[] = []
    var lignesArr: any[] = Array.isArray(parsed.lignes) ? parsed.lignes : []

    for (var i = 0; i < lignesArr.length; i++) {
      var ligne = lignesArr[i] || {}
      var article = String(ligne.article || ligne.article_original || '').trim()

      // Ligne fees_taxes : pas de matching, c'est meta
      if (ligne.categorie === 'fees_taxes') {
        enrichedLignes.push({
          line_index: i,
          article_original: ligne.article_original || ligne.article || '',
          article_canonical: article,
          categorie: 'fees_taxes',
          quantity: Number(ligne.quantity || 1),
          pack_label: ligne.pack_label || '',
          pack_price: Number(ligne.pack_price || 0),
          master_unit: ligne.master_unit || 'U',
          master_qty_per_pack: Number(ligne.master_qty_per_pack || 1),
          master_unit_price: Number(ligne.master_unit_price || ligne.pack_price || 0),
          vision_confidence: Number(ligne.confidence || 100),
          // Pas de matching produit pour les fees_taxes
          match_type: 'fees_taxes',
          match_confidence: 100,
          matched_article_id: null,
          matched_product_id: null,
          matched_name: null,
          suggestions: [],
          // disposition par defaut : ignore
          suggested_disposition: 'fees_taxes'
        })
        continue
      }

      // Matching SQL multi-niveau
      var matchRes = await supabase.rpc('match_invoice_line', {
        p_article_text: article,
        p_supplier_id: supplierGuessId
      })
      var matchRow = (matchRes.data && matchRes.data[0]) ? matchRes.data[0] : null

      // Top 3 suggestions pour le UI (cas fuzzy ou no_match)
      var suggestionsList: any[] = []
      if (!matchRow || matchRow.confidence < 90) {
        var sugRes = await supabase.rpc('suggest_invoice_line', {
          p_article_text: article,
          p_supplier_id: supplierGuessId,
          p_limit: 3
        })
        suggestionsList = sugRes.data || []
      }

      var matchType = matchRow ? matchRow.match_type : 'no_match'
      var matchConfidence = matchRow ? Number(matchRow.confidence || 0) : 0

      // disposition suggeree
      var suggestedDisposition = 'manual_review'
      if (matchType === 'exact_product' || matchType === 'alias') {
        suggestedDisposition = 'auto_match'
      } else if (matchConfidence >= 90) {
        suggestedDisposition = 'auto_match'
      } else if (matchConfidence >= 50) {
        suggestedDisposition = 'manual_review'
      } else {
        suggestedDisposition = 'create_new'
      }

      enrichedLignes.push({
        line_index: i,
        article_original: ligne.article_original || ligne.article || '',
        article_canonical: article,
        categorie: ligne.categorie || 'ingredient',
        quantity: Number(ligne.quantity || 1),
        pack_label: ligne.pack_label || '',
        pack_price: Number(ligne.pack_price || 0),
        master_unit: ligne.master_unit || 'kg',
        master_qty_per_pack: Number(ligne.master_qty_per_pack || 1),
        master_unit_price: Number(ligne.master_unit_price || 0),
        vision_confidence: Number(ligne.confidence || 50),
        match_type: matchType,
        match_confidence: matchConfidence,
        matched_article_id: matchRow ? matchRow.article_id : null,
        matched_product_id: matchRow ? matchRow.product_id : null,
        matched_name: matchRow ? matchRow.matched_name : null,
        suggestions: suggestionsList,
        suggested_disposition: suggestedDisposition
      })
    }

    // ------------------------------------------------------------------------
    // 4. REPONSE STRUCTUREE
    // ------------------------------------------------------------------------
    return NextResponse.json({
      file_name: fileName || null,
      invoice_date: parsed.date || new Date().toISOString().split('T')[0],
      total_ht: Number(parsed.total_ht || 0),
      supplier_guess: {
        raw_name: parsed.fournisseur || '',
        raw_siret: parsed.fournisseur_siret || null,
        raw_email_domain: parsed.fournisseur_email_domain || null,
        matched_supplier_id: supplierGuessId,
        confidence: supplierGuessConfidence
      },
      lignes: enrichedLignes,
      stats: {
        total_lines: enrichedLignes.length,
        auto_match: enrichedLignes.filter(function(l) { return l.suggested_disposition === 'auto_match' }).length,
        manual_review: enrichedLignes.filter(function(l) { return l.suggested_disposition === 'manual_review' }).length,
        create_new: enrichedLignes.filter(function(l) { return l.suggested_disposition === 'create_new' }).length,
        fees_taxes: enrichedLignes.filter(function(l) { return l.suggested_disposition === 'fees_taxes' }).length
      }
    })

  } catch (e: any) {
    console.error('extract error:', e)
    return NextResponse.json({ error: e.message || String(e) }, { status: 500 })
  }
}
