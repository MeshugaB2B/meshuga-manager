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
    var promptText = `Tu es un assistant pour Meshuga Crazy Deli, restaurant deli new-yorkais a Paris.
Extrais TOUTES les lignes de cette facture fournisseur avec une rigueur ARITHMETIQUE.

============================================================
ETAPE 1 - FOURNISSEUR
============================================================
Identifie precisement le nom commercial (pas la raison sociale complete avec SAS/SARL).
Si SIRET visible, extrais-le. Si une adresse email du fournisseur visible, extrais le domaine.

============================================================
ETAPE 2 - POUR CHAQUE LIGNE : LES 3 VALEURS DE BASE
============================================================
Une ligne de facture a TOUJOURS 3 colonnes que tu DOIS extraire :
- "qty_ordered" = quantite commandee/livree (colonne "Qte" sur la facture)
- "unit_price_invoice" = prix unitaire affiche dans la colonne "PU HT" / "Prix Unit." de la facture (en EUR HT)
- "total_ligne_ht" = total HT de la ligne (colonne "Total HT" / "Montant")

REGLE ARITHMETIQUE STRICTE : qty_ordered x unit_price_invoice ≈ total_ligne_ht (tolerance 5%)
Si ces 3 valeurs n'ont pas de coherence, c'est une erreur de lecture. Re-lis attentivement.

============================================================
ETAPE 3 - CATEGORISATION
============================================================
- "boisson" = boisson destinee a la revente client (Coca, Evian, Perrier, Ice Tea, Orangina, jus, eaux, etc.)
- "ingredient" = produit alimentaire entrant en cuisine (viande, fromage, legumes, condiments, pain, epices, huile, sucre, sel, conserves, sauces)
- "packaging" = emballage produit fini (boites, sacs, gobelets, couvercles, films, sachets)
- "consommable" = non-alimentaire (entretien, gants, sacs poubelle, papier toilette, produits nettoyage)
- "fees_taxes" = frais de port, livraison, transport, remise, eco-participation, taxes

============================================================
ETAPE 4 - COMPRENDRE LE LIBELLE FOURNISSEUR (CRITICAL)
============================================================
Les libelles fournisseurs ressemblent souvent a :
  "Soda cola (bte slim 33CLx24) Coca Cola"
  "Fleur mais bte 700Gx12 Maizena"
  "Bidon 5L huile tournesol"

Le "xN" dans le libelle PEUT signifier 2 choses TRES DIFFERENTES :
  CAS A : "xN" = pack reel commercialise (carton de N unites achete ensemble)
          Ex: "Coca 33clx24" = 1 carton contient 24 cannettes
          Detection : si unit_price_invoice = total / qty et qu'on s'attend a un prix raisonnable POUR LE CARTON ENTIER
                      OU si la categorie est "boisson" et le libelle contient un format de cannette/bouteille (33cl, 50cl, 1.5L)
  CAS B : "xN" = info commerciale (N boites par palette, mais on achete a la boite)
          Ex: "Maizena 700gx12" = on achete 1 boite de 700g (le 12 est juste "par carton de 12")
          Detection : si unit_price_invoice est coherent avec UNE SEULE unite (la boite individuelle)

Pour decider : compare unit_price_invoice avec ce qui est plausible.
Une cannette Coca coute ~0.60-1€. Un carton de 24 cannettes coute ~15-20€.
Une boite de Maizena 700g coute ~3-5€. Un carton de 12 boites coute ~40-60€.

============================================================
ETAPE 5 - REMPLIR LES CHAMPS DE SORTIE
============================================================

Champs obligatoires pour CHAQUE ligne :
- "article" : nom court canonique (ex: "Cheddar", "Coca Cola")
- "article_original" : description complete telle qu'elle apparait sur la facture
- "categorie" : voir etape 3
- "qty_ordered" : quantite de la colonne "Qte" (nombre de cartons / bidons / poches achetes)
- "unit_price_invoice" : prix unitaire affiche sur la facture (prix d'UN carton/bidon/poche)
- "total_ligne_ht" : total HT de la ligne
- "pack_label" : description humaine du conditionnement reel commercialise (ex: "Carton 24x33cl", "Bidon 5L", "Boite 700g", "Poche 650g")
- "pack_interpretation" : "pack_reel" si le "xN" du libelle est un pack achete d'un coup (CAS A), "boite_seule" si on achete a la boite (CAS B), "vrac" si vrac pur (bidon/sac/bouteille), "unite" si vendu a l'unite simple
- "confidence" : 0-100 ta confiance dans l'extraction

Champs CALCULES selon la categorie (a remplir TOI-MEME selon ces regles) :

** Si categorie = "boisson" **
  - master_unit = "U" (TOUJOURS, on suit le prix par cannette/bouteille)
  - units_per_pack = nombre de cannettes/bouteilles dans UN carton commande
    (ex: "Coca 33clx24" -> 24 ; "Evian 50clx24" -> 24 ; "Perrier 1.5L x6" -> 6)
  - master_unit_price = unit_price_invoice / units_per_pack
    (ex: carton Coca a 17.74 EUR contient 24 cannettes -> master_unit_price = 17.74/24 = 0.739 EUR/cannette)

** Si categorie = "ingredient" en VRAC (bidon, bouteille, sac, pot, bocal) **
  - master_unit = "L" pour liquides, "kg" pour solides
  - units_per_pack = contenance du bidon/sac/pot en L ou kg (ex: "Bidon 5L" -> 5 ; "Sac 25kg" -> 25 ; "Pot 1kg" -> 1 ; "Boite 700g" -> 0.7)
  - master_unit_price = unit_price_invoice / units_per_pack
    (ex: bidon 5L huile a 8.25 EUR -> master_unit_price = 8.25/5 = 1.65 EUR/L)
    (ex: boite Maizena 700g a 3.90 EUR -> master_unit_price = 3.90/0.7 = 5.57 EUR/kg)

** Si categorie = "ingredient" en pack-de-N (poches, barquettes vendues par carton) **
  - Cas tricky : "Thon listao pch 650Gx12" -> 12 poches de 650g par carton
  - Si pack_interpretation = "pack_reel" (achete le carton entier) :
      master_unit = "kg" (ou "L"), units_per_pack = N * poids_unitaire_kg
      ex: carton 12x650g = 12 * 0.65 = 7.8 kg, master_unit_price = unit_price_invoice / 7.8
  - Si pack_interpretation = "boite_seule" (achete 1 poche) :
      master_unit = "kg" (ou "L"), units_per_pack = poids_unitaire_kg seul
      ex: poche 650g = 0.65 kg, master_unit_price = unit_price_invoice / 0.65

** Si categorie = "packaging" ou "consommable" **
  - master_unit = "U", units_per_pack = nombre d'unites contenues dans 1 pack
  - master_unit_price = unit_price_invoice / units_per_pack

** Si categorie = "fees_taxes" **
  - master_unit = "U", units_per_pack = 1, master_unit_price = unit_price_invoice

============================================================
ETAPE 6 - SI TU N'ES PAS SUR
============================================================
Si tu hesites sur "pack_reel" vs "boite_seule", ou si units_per_pack te semble ambigu :
- Mets confidence < 50
- Mets units_per_pack = 0 et master_unit_price = 0
- L'utilisateur completera manuellement

============================================================
EXEMPLES CONCRETS (avec arithmetique verifiee)
============================================================

EX 1 : "Soda cola (bte slim 33CLx24) Coca Cola" - Qte 4 - PU 17.74 - Total 70.96
{
  article: "Coca Cola",
  article_original: "Soda cola (bte slim 33CLx24) Coca Cola",
  categorie: "boisson",
  qty_ordered: 4, unit_price_invoice: 17.74, total_ligne_ht: 70.96,
  pack_label: "Carton 24x33cl",
  pack_interpretation: "pack_reel",
  master_unit: "U",
  units_per_pack: 24,
  master_unit_price: 0.739,  // = 17.74/24
  confidence: 100
}
Verification : 4 x 17.74 = 70.96 ✓

EX 2 : "Fleur mais bte 700Gx12 Maizena" - Qte 1 - PU 3.90 - Total 3.90
{
  article: "Maizena",
  article_original: "Fleur mais bte 700Gx12 Maizena",
  categorie: "ingredient",
  qty_ordered: 1, unit_price_invoice: 3.90, total_ligne_ht: 3.90,
  pack_label: "Boite 700g",
  pack_interpretation: "boite_seule",
  master_unit: "kg",
  units_per_pack: 0.7,
  master_unit_price: 5.57,  // = 3.90/0.7
  confidence: 100
}
Verification : 1 x 3.90 = 3.90 ✓
Justification "boite_seule" : 3.90 EUR est coherent pour 1 boite, pas pour 12 boites.

EX 3 : "BIDON 5L HUILE TOURNESOL FRITURE" - Qte 2 - PU 8.25 - Total 16.50
{
  article: "Huile tournesol friture",
  article_original: "BIDON 5L HUILE TOURNESOL FRITURE",
  categorie: "ingredient",
  qty_ordered: 2, unit_price_invoice: 8.25, total_ligne_ht: 16.50,
  pack_label: "Bidon 5L",
  pack_interpretation: "vrac",
  master_unit: "L",
  units_per_pack: 5,
  master_unit_price: 1.65,  // = 8.25/5
  confidence: 100
}

EX 4 : "FRAIS DE LIVRAISON" - Qte 1 - PU 8.50 - Total 8.50
{
  article: "Frais de livraison",
  article_original: "FRAIS DE LIVRAISON",
  categorie: "fees_taxes",
  qty_ordered: 1, unit_price_invoice: 8.50, total_ligne_ht: 8.50,
  pack_label: "",
  pack_interpretation: "unite",
  master_unit: "U",
  units_per_pack: 1,
  master_unit_price: 8.50,
  confidence: 100
}

============================================================
SORTIE
============================================================
Retourne UNIQUEMENT un JSON valide (sans markdown, sans backticks) au format :
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
      "qty_ordered": 1,
      "unit_price_invoice": 0.00,
      "total_ligne_ht": 0.00,
      "pack_label": "...",
      "pack_interpretation": "pack_reel|boite_seule|vrac|unite",
      "master_unit": "kg|L|U",
      "units_per_pack": 0,
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
        // Pour fees_taxes, master_unit_price = pack_price (car master_qty=1, par convention)
        var feesPP = Number(ligne.pack_price || 0)
        enrichedLignes.push({
          line_index: i,
          article_original: ligne.article_original || ligne.article || '',
          article_canonical: article,
          categorie: 'fees_taxes',
          quantity: Number(ligne.quantity || 1),
          pack_label: ligne.pack_label || '',
          pack_price: feesPP,
          master_unit: ligne.master_unit || 'U',
          master_qty_per_pack: 1,
          master_unit_price: feesPP, // pour fees_taxes, c'est juste le prix de la ligne
          extraction_warning: null,
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

      // ====================================================================
      // EXTRACTION DES 3 VALEURS DE BASE (avec rétrocompatibilité ancien schéma)
      // ====================================================================
      var qtyOrdered = Number(ligne.qty_ordered || ligne.quantity || 1)
      var unitPriceInvoice = Number(ligne.unit_price_invoice || ligne.pack_price || 0)
      var totalLineHT = Number(ligne.total_ligne_ht || (qtyOrdered * unitPriceInvoice) || 0)
      var unitsPerPack = Number(ligne.units_per_pack || ligne.master_qty_per_pack || 0)
      var aiMasterUnitPrice = Number(ligne.master_unit_price || 0)
      var pi = String(ligne.pack_interpretation || '').toLowerCase()
      var cat = ligne.categorie || 'ingredient'

      // ====================================================================
      // VÉRIFICATION ARITHMÉTIQUE : qty × unit_price ≈ total (tolérance 5%)
      // ====================================================================
      var arithmeticOk = true
      var arithmeticWarning: string | null = null
      if (qtyOrdered > 0 && unitPriceInvoice > 0 && totalLineHT > 0) {
        var expectedTotal = qtyOrdered * unitPriceInvoice
        var deviation = Math.abs(expectedTotal - totalLineHT) / totalLineHT
        if (deviation > 0.05) {
          arithmeticOk = false
          arithmeticWarning = 'arithmetic_mismatch'
        }
      }

      // ====================================================================
      // RÈGLES MÉTIER PAR CATÉGORIE
      // - boisson → master_unit='U' (€/cannette ou €/bouteille)
      // - ingredient → master_unit='kg' ou 'L' (€/kg ou €/L)
      // - packaging/consommable → master_unit='U'
      // ====================================================================
      var masterUnit = ligne.master_unit || 'kg'
      if (cat === 'boisson') {
        masterUnit = 'U'  // forcer : toujours par cannette/bouteille
      } else if (cat === 'packaging' || cat === 'consommable') {
        masterUnit = ligne.master_unit || 'U'
      } else if (cat === 'ingredient') {
        // Garder kg ou L selon ce que l'IA a déterminé, défaut kg
        if (masterUnit !== 'kg' && masterUnit !== 'L') masterUnit = 'kg'
      }

      // ====================================================================
      // CALCUL master_unit_price : unit_price_invoice / units_per_pack
      // (= prix de UN carton / le nombre d'unités master que contient ce carton)
      // ====================================================================
      var calculatedMUP = 0
      var extractionWarning: string | null = arithmeticWarning

      if (unitPriceInvoice > 0 && unitsPerPack > 0) {
        calculatedMUP = unitPriceInvoice / unitsPerPack
        // Sanity check : si l'IA a fourni aussi master_unit_price et qu'il diffère trop, garder le calcul
        if (aiMasterUnitPrice > 0 && Math.abs(aiMasterUnitPrice - calculatedMUP) / calculatedMUP > 0.1) {
          if (!extractionWarning) extractionWarning = 'ai_inconsistent_mup'
        }
      } else if (aiMasterUnitPrice > 0 && unitsPerPack > 0) {
        // Fallback ancien champ
        calculatedMUP = aiMasterUnitPrice
      } else {
        // Conditionnement inconnu : on flag pour vérification utilisateur
        calculatedMUP = 0
        extractionWarning = 'pack_unknown'
      }

      enrichedLignes.push({
        line_index: i,
        article_original: ligne.article_original || ligne.article || '',
        article_canonical: article,
        categorie: cat,
        // Anciens champs (rétrocompatibilité avec le wizard/commit existant)
        quantity: qtyOrdered,
        pack_label: ligne.pack_label || '',
        pack_price: unitPriceInvoice,  // = prix d'1 unité de commande (carton/bidon/poche)
        master_unit: masterUnit,
        master_qty_per_pack: unitsPerPack,
        master_unit_price: calculatedMUP,
        // Nouveaux champs (pour vue détaillée et debug)
        qty_ordered: qtyOrdered,
        unit_price_invoice: unitPriceInvoice,
        total_ligne_ht: totalLineHT,
        units_per_pack: unitsPerPack,
        pack_interpretation: pi || null,
        arithmetic_ok: arithmeticOk,
        extraction_warning: extractionWarning,
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
