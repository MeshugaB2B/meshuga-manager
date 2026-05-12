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
Tu lis des factures fournisseurs et extrais les donnees structurees.

REGLE FONDAMENTALE QUE TU NE DOIS JAMAIS OUBLIER :
La facture contient TOUJOURS 3 colonnes essentielles pour chaque ligne :
  - QUANTITE FACTUREE (parfois "Qte fac" ou "Qte" tout court) : nombre d'unites elementaires
  - PRIX UNITAIRE HT (parfois "PU HT" ou "Prix Unit.") : prix d'UNE unite elementaire
  - TOTAL HT (parfois "Montant HT") : qty x PU

LE PRIX UNITAIRE EST TON ANCRE. Tu le lis DIRECTEMENT sur la facture.
Tu ne le calcules JAMAIS. Tu ne le devines JAMAIS depuis le libelle "xN" du produit.

============================================================
ETAPE 1 - FOURNISSEUR
============================================================
Identifie precisement le nom commercial (pas la raison sociale complete avec SAS/SARL).
Si SIRET visible, extrais-le. Si une adresse email du fournisseur visible, extrais le domaine.

============================================================
ETAPE 2 - LIRE LES 3 CHIFFRES DE LA LIGNE
============================================================
Pour chaque ligne, repere les 3 colonnes critiques :
- "qty_invoiced" = QUANTITE FACTUREE (colonne "Qte fac" ou "Qte"). 
  C'est le NOMBRE D'UNITES ELEMENTAIRES facturees.
  Ex: 3 colis de 24 bouteilles -> qty_invoiced = 72 (bouteilles)
  Ex: 1 sac de 25kg -> qty_invoiced = 1 (sac)
  Ex: 2 bidons -> qty_invoiced = 2 (bidons)
- "unit_price_invoice" = PRIX UNITAIRE HT (colonne "PU HT" ou "Prix Unit.")
  C'est le prix d'UNE unite elementaire telle qu'imprimee sur la facture.
  TU LE LIS DIRECTEMENT. Tu ne le calcules pas.
- "total_ligne_ht" = TOTAL HT (colonne "Montant HT" ou "Total HT")

REGLE D'OR : qty_invoiced x unit_price_invoice ≈ total_ligne_ht (tolerance 5%)
Si les 3 ne sont pas coherents, c'est une mauvaise lecture. Re-lis.

============================================================
ETAPE 3 - IDENTIFIER LE TYPE D'UNITE ELEMENTAIRE
============================================================
La colonne "Qte livree" indique le code de l'unite de commande :
- COL = colis
- BT = bouteille
- BCL = bocal
- POT = pot
- BID = bidon
- SAC = sac
- BTE = boite
- CRT = carton
- PCH = poche

MAIS la colonne "Qte FACTUREE" est ce qui compte. Elle peut etre :
- Soit en MEME UNITE que Qte livree (ex: 1 SAC livre = 1 sac facture)
- Soit en UNITES INDIVIDUELLES (ex: 3 COL livres = 72 bouteilles facturees)

Le PU HT est TOUJOURS le prix d'une unite de la colonne "Qte facturee".

EXEMPLES TYPIQUES :
- "Evian 50CLx24" - Qte livree: 3 COL, Qte facturee: 72, PU: 0.678
  -> chaque bouteille coute 0.678 EUR. 72 x 0.678 = 48.82 EUR
- "Coca 33CLx24" - Qte livree: 4 COL, Qte facturee: 96, PU: 0.739
  -> chaque cannette coute 0.739 EUR. 96 x 0.739 = 70.94 EUR
- "Huile colza bid 5Lx3" - Qte livree: 1 COL, Qte facturee: 3, PU: 8.25
  -> chaque BIDON coute 8.25 EUR. 3 x 8.25 = 24.75 EUR
- "Pdt frite 25kg" - Qte livree: 1 SAC, Qte facturee: 25, PU: 0.46
  -> chaque KG coute 0.46 EUR. 25 x 0.46 = 11.50 EUR

============================================================
ETAPE 4 - CATEGORISATION
============================================================
- "boisson" = boisson destinee a la revente client (Coca, Evian, Perrier, Ice Tea, Orangina, jus, eaux)
- "ingredient" = produit alimentaire entrant en cuisine (viande, fromage, legumes, condiments, pain, epices, huile, sucre, sel, conserves, sauces)
- "packaging" = emballage produit fini (boites, sacs, gobelets, couvercles, films, sachets)
- "consommable" = non-alimentaire (entretien, gants, sacs poubelle, papier toilette, produits nettoyage)
- "fees_taxes" = frais de port, livraison, transport, remise, eco-participation, taxes

============================================================
ETAPE 5 - CALCULER master_unit_price SELON LA CATEGORIE
============================================================

** Si categorie = "boisson" **
  master_unit = "U" (on suit le prix par bouteille/cannette)
  master_unit_price = unit_price_invoice (DIRECTEMENT, pas de calcul)
  master_qty_per_pack = qty_invoiced (info : nombre total achete)
  
  Ex : Evian PU 0.678 -> master_unit_price = 0.678 EUR/bouteille

** Si categorie = "ingredient" en VRAC liquide (bidon, bouteille XL) **
  master_unit = "L"
  Lire la CONTENANCE du bidon dans la designation (ex: "bid 5L" -> 5, "bid 7,5L" -> 7.5)
  master_unit_price = unit_price_invoice / contenance
  master_qty_per_pack = contenance (pour info)
  
  Ex : Bidon 5L PU 8.25 -> master_unit_price = 8.25/5 = 1.65 EUR/L

** Si categorie = "ingredient" en VRAC solide (sac, pot kg) **
  master_unit = "kg"
  CAS A : si la facture est libelle au kg (ex: sac 25kg, PU = prix/kg)
    -> master_unit_price = unit_price_invoice (DIRECTEMENT)
    -> master_qty_per_pack = 1
  CAS B : si la facture est libelle par contenant (ex: pot 1kg, PU = prix/pot)
    -> Lire le poids du contenant dans la designation
    -> master_unit_price = unit_price_invoice / poids
    -> master_qty_per_pack = poids
  
  Pour decider : si qty_invoiced est un grand nombre (ex: 25) = facturation au kg (CAS A)
                 si qty_invoiced est petit (1, 2, 3) = facturation au contenant (CAS B)

** Si categorie = "ingredient" en pack-d'unites (poches, barquettes vendues a l'unite) **
  master_unit = "U"
  master_unit_price = unit_price_invoice (DIRECTEMENT)
  master_qty_per_pack = qty_invoiced
  
  Ex : Boite Maizena 700g PU 3.90 -> master_unit_price = 3.90 EUR/boite (on suit le prix par boite)
  
  NOTE : si tu veux convertir en kg, fais-le SEPAREMENT.
  Mais master_unit_price est TOUJOURS le PU de la facture.

** Si categorie = "packaging" ou "consommable" **
  master_unit = "U"
  master_unit_price = unit_price_invoice (DIRECTEMENT)
  master_qty_per_pack = qty_invoiced

** Si categorie = "fees_taxes" **
  master_unit = "U", master_qty_per_pack = 1
  master_unit_price = unit_price_invoice

============================================================
ETAPE 6 - SI TU N'ES PAS SUR
============================================================
Si tu n'arrives pas a lire clairement les 3 chiffres (qty_invoiced, unit_price_invoice, total_ligne_ht) :
- Mets confidence < 50
- Mets master_unit_price = 0
- L'utilisateur completera manuellement

NE DEVINE JAMAIS. Ne calcule jamais a partir du "xN" du libelle interne fournisseur.

============================================================
RAPPEL FONDAMENTAL
============================================================
LA DESIGNATION DU PRODUIT EST DU BRUIT.
Les libelles comme "Soda cola (bte slim 33CLx24) Coca Cola" ou "Fleur mais bte 700Gx12 Maizena"
sont des codes internes du fournisseur. Le "xN" qu'ils contiennent NE T'INFORME PAS sur la quantite achetee.
La VERITE est dans les COLONNES NUMERIQUES : qty_invoiced, unit_price_invoice, total_ligne_ht.

============================================================
EXEMPLES CONCRETS
============================================================

EX 1 : Evian
  Designation: "Eau miner nat (PET 50CLx24) Evian"
  Qte livree: 3 (COL), Qte facturee: 72, PU: 0.678, Total: 48.82
{
  article: "Evian",
  article_original: "Eau miner nat (PET 50CLx24) Evian",
  categorie: "boisson",
  qty_invoiced: 72, unit_price_invoice: 0.678, total_ligne_ht: 48.82,
  master_unit: "U",
  master_qty_per_pack: 72,
  master_unit_price: 0.678,
  confidence: 100
}
Verification arithmetique : 72 x 0.678 = 48.82 OK

EX 2 : Maizena (1 boite, "Nx" interne ignore)
  Designation: "Fleur mais bte 700Gx12 Maizena"
  Qte livree: 1 (BTE), Qte facturee: 1, PU: 3.90, Total: 3.90
{
  article: "Maizena",
  article_original: "Fleur mais bte 700Gx12 Maizena",
  categorie: "ingredient",
  qty_invoiced: 1, unit_price_invoice: 3.90, total_ligne_ht: 3.90,
  master_unit: "U",
  master_qty_per_pack: 1,
  master_unit_price: 3.90,
  confidence: 100
}
Verification : 1 x 3.90 = 3.90 OK

EX 3 : Huile colza (3 bidons de 5L)
  Designation: "Huile colza raffine bid 5Lx3"
  Qte livree: 1 (COL), Qte facturee: 3, PU: 8.25, Total: 24.75
{
  article: "Huile colza",
  article_original: "Huile colza raffine bid 5Lx3",
  categorie: "ingredient",
  qty_invoiced: 3, unit_price_invoice: 8.25, total_ligne_ht: 24.75,
  master_unit: "L",
  master_qty_per_pack: 5,
  master_unit_price: 1.65,  // = 8.25 / 5 (contenance bidon)
  confidence: 100
}
Verification : 3 x 8.25 = 24.75 OK. Contenance lue dans "bid 5L".

EX 4 : Pommes de terre 25kg (facturee au kg)
  Designation: "Pdt frite (Agria) 60+ 25kg"
  Qte livree: 1 (SAC), Qte facturee: 25, PU: 0.46, Total: 11.50
{
  article: "Pommes de terre Agria",
  article_original: "Pdt frite (Agria) 60+ 25kg",
  categorie: "ingredient",
  qty_invoiced: 25, unit_price_invoice: 0.46, total_ligne_ht: 11.50,
  master_unit: "kg",
  master_qty_per_pack: 1,
  master_unit_price: 0.46,  // facturation au kg, PU est deja en EUR/kg
  confidence: 100
}
Verification : 25 x 0.46 = 11.50 OK

EX 5 : Frais de livraison
  Designation: "FRAIS DE LIVRAISON"
  Qte: 1, PU: 8.50, Total: 8.50
{
  article: "Frais de livraison",
  article_original: "FRAIS DE LIVRAISON",
  categorie: "fees_taxes",
  qty_invoiced: 1, unit_price_invoice: 8.50, total_ligne_ht: 8.50,
  master_unit: "U",
  master_qty_per_pack: 1,
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
      "article_original": "designation complete telle que sur la facture",
      "categorie": "ingredient|boisson|packaging|consommable|fees_taxes",
      "qty_invoiced": 0,
      "unit_price_invoice": 0.00,
      "total_ligne_ht": 0.00,
      "pack_label": "ex: Bidon 5L, Sac 25kg, Boite 700g, Carton 24x33cl",
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
      // EXTRACTION DES 3 VALEURS DE BASE
      // (rétrocompatibilité ancien schéma : qty_ordered, units_per_pack)
      // ====================================================================
      var qtyInvoiced = Number(ligne.qty_invoiced || ligne.qty_ordered || ligne.quantity || 1)
      var unitPriceInvoice = Number(ligne.unit_price_invoice || ligne.pack_price || 0)
      var totalLineHT = Number(ligne.total_ligne_ht || (qtyInvoiced * unitPriceInvoice) || 0)
      var aiMasterQty = Number(ligne.master_qty_per_pack || ligne.units_per_pack || 0)
      var aiMasterUnitPrice = Number(ligne.master_unit_price || 0)
      var cat = ligne.categorie || 'ingredient'

      // ====================================================================
      // VÉRIFICATION ARITHMÉTIQUE : qty × PU ≈ total (tolérance 5%)
      // ====================================================================
      var arithmeticOk = true
      var arithmeticWarning: string | null = null
      if (qtyInvoiced > 0 && unitPriceInvoice > 0 && totalLineHT > 0) {
        var expectedTotal = qtyInvoiced * unitPriceInvoice
        var deviation = Math.abs(expectedTotal - totalLineHT) / totalLineHT
        if (deviation > 0.05) {
          arithmeticOk = false
          arithmeticWarning = 'arithmetic_mismatch'
        }
      }

      // ====================================================================
      // RÈGLES MÉTIER PAR CATÉGORIE (forcing du master_unit)
      // - boisson → master_unit='U' (€/cannette ou €/bouteille)
      // - ingredient → master_unit='kg' ou 'L' (€/kg ou €/L)
      // - packaging/consommable → master_unit='U'
      // - fees_taxes → master_unit='U'
      // ====================================================================
      var masterUnit = ligne.master_unit || 'kg'
      if (cat === 'boisson' || cat === 'packaging' || cat === 'consommable' || cat === 'fees_taxes') {
        masterUnit = 'U'
      } else if (cat === 'ingredient') {
        // Pour ingredients : kg ou L selon le type
        if (masterUnit !== 'kg' && masterUnit !== 'L') masterUnit = 'kg'
      }

      // ====================================================================
      // CALCUL FINAL master_unit_price
      // Nouvelle logique : on FAIT CONFIANCE au master_unit_price retourné par l'IA
      // car le prompt lui demande de le calculer correctement selon la catégorie.
      // On vérifie juste qu'il est cohérent.
      // ====================================================================
      var calculatedMUP = 0
      var extractionWarning: string | null = arithmeticWarning

      if (aiMasterUnitPrice > 0) {
        // L'IA a fourni master_unit_price : on lui fait confiance
        calculatedMUP = aiMasterUnitPrice

        // Sanity check :
        // - Pour boisson/packaging/consommable/fees : master_unit_price devrait être ≈ unit_price_invoice
        //   (car master_unit_price = PU directement)
        // - Pour ingredient en vrac : master_unit_price peut diverger (= PU / contenance)
        if ((cat === 'boisson' || cat === 'packaging' || cat === 'consommable' || cat === 'fees_taxes') 
            && unitPriceInvoice > 0
            && Math.abs(calculatedMUP - unitPriceInvoice) / unitPriceInvoice > 0.05) {
          if (!extractionWarning) extractionWarning = 'mup_should_equal_pu'
        }
      } else if (unitPriceInvoice > 0) {
        // Fallback : si l'IA n'a pas calculé, on tente
        if (cat === 'boisson' || cat === 'packaging' || cat === 'consommable' || cat === 'fees_taxes') {
          // Pour ces catégories : master_unit_price = PU directement
          calculatedMUP = unitPriceInvoice
        } else if (cat === 'ingredient' && aiMasterQty > 0) {
          // Pour ingredient vrac : master_unit_price = PU / contenance
          calculatedMUP = unitPriceInvoice / aiMasterQty
        } else {
          calculatedMUP = 0
          extractionWarning = 'pack_unknown'
        }
      } else {
        calculatedMUP = 0
        extractionWarning = 'pack_unknown'
      }

      // ====================================================================
      // CALCUL master_qty_per_pack (info pour le wizard/UI)
      // ====================================================================
      var finalMasterQty = aiMasterQty
      if (finalMasterQty <= 0 && calculatedMUP > 0 && unitPriceInvoice > 0) {
        // Déduire la contenance
        if (cat === 'boisson' || cat === 'packaging' || cat === 'consommable' || cat === 'fees_taxes') {
          finalMasterQty = qtyInvoiced  // nombre total acheté
        } else {
          // Pour vrac : contenance = PU / master_unit_price
          finalMasterQty = Math.round((unitPriceInvoice / calculatedMUP) * 100) / 100
        }
      }

      // ====================================================================
      // 🛡️ FILET DE SÉCURITÉ : PACK RULES
      // Si le product est matché et qu'on a une règle de pack en base,
      // on FORCE les valeurs de conditionnement et on recalcule le prix.
      // Évite les erreurs OCR récurrentes sur boissons, sucrine, etc.
      // ====================================================================
      var packRuleApplied = false
      var packRuleWarning: string | null = null
      if (matchRow && matchRow.product_id) {
        try {
          var ruleRes = await supabase
            .from('supplier_product_pack_rules')
            .select('pack_label, master_unit, master_qty_per_pack, expected_price_min, expected_price_max')
            .eq('product_id', matchRow.product_id)
            .eq('is_active', true)
            .limit(1)
          if (ruleRes.data && ruleRes.data.length > 0) {
            var rule = ruleRes.data[0]
            var ruleQty = Number(rule.master_qty_per_pack)
            if (unitPriceInvoice > 0 && ruleQty > 0) {
              finalMasterQty = ruleQty
              calculatedMUP = Math.round((unitPriceInvoice / ruleQty) * 10000) / 10000
              masterUnit = rule.master_unit
              ligne.pack_label = rule.pack_label
              packRuleApplied = true
              if (rule.expected_price_min !== null && rule.expected_price_max !== null) {
                var minP = Number(rule.expected_price_min)
                var maxP = Number(rule.expected_price_max)
                if (unitPriceInvoice < minP || unitPriceInvoice > maxP) {
                  packRuleWarning = 'Prix pack ' + unitPriceInvoice.toFixed(2) + 'EUR hors fourchette attendue [' + minP.toFixed(2) + '-' + maxP.toFixed(2) + 'EUR]'
                }
              }
            }
          }
        } catch (e) {
          // En cas d'erreur DB sur pack_rules, on ne bloque pas l'extraction
        }
      }

      enrichedLignes.push({
        line_index: i,
        article_original: ligne.article_original || ligne.article || '',
        article_canonical: article,
        categorie: cat,
        // Champs principaux (compatibles avec wizard/commit existant)
        quantity: qtyInvoiced,
        pack_label: ligne.pack_label || '',
        pack_price: unitPriceInvoice,
        master_unit: masterUnit,
        master_qty_per_pack: finalMasterQty,
        master_unit_price: calculatedMUP,
        // Nouveaux champs pour la vue détaillée (3 valeurs facture)
        qty_invoiced: qtyInvoiced,
        unit_price_invoice: unitPriceInvoice,
        total_ligne_ht: totalLineHT,
        arithmetic_ok: arithmeticOk,
        extraction_warning: extractionWarning,
        vision_confidence: Number(ligne.confidence || 50),
        match_type: matchType,
        match_confidence: matchConfidence,
        matched_article_id: matchRow ? matchRow.article_id : null,
        matched_product_id: matchRow ? matchRow.product_id : null,
        matched_name: matchRow ? matchRow.matched_name : null,
        suggestions: suggestionsList,
        suggested_disposition: suggestedDisposition,
        pack_rule_applied: packRuleApplied,
        pack_rule_warning: packRuleWarning
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
