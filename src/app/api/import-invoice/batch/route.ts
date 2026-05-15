// src/app/api/import-invoice/batch/route.ts
// VERSION 2 — Prompt OCR amélioré (vraies anomalies seulement)
// - Détection avoirs plus précise
// - Vérifications cohérentes ne sont PAS des anomalies
// - Règles métier Meshuga injectées

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

export const runtime = 'nodejs'
export const maxDuration = 300

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || ''

function sb() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE)
}

// ============= PROMPT OCR ENRICHI MESHUGA (V2) =============
const OCR_PROMPT = `Tu es un expert OCR de factures fournisseurs pour le restaurant Meshuga Crazy Deli (Paris).

Analyse le PDF fourni et extrais les informations en JSON STRICT (aucun texte hors JSON).

# FORMAT DE SORTIE
{
  "document_type": "facture" | "avoir",
  "fournisseur": "Norbert" | "Foodflow" | "Monarque" | "Marina Sea Food" | "Rouquette" | "Episaveurs" | "DS Service" | "HPS" | "Jacquier" | "Autre",
  "fournisseur_raw": "nom exact trouvé sur le PDF",
  "invoice_number": "numéro de facture/avoir",
  "invoice_date": "YYYY-MM-DD",
  "related_invoice_number": "si avoir, numéro de la facture d'origine si mentionné, sinon null",
  "total_ht": nombre,
  "total_ttc": nombre,
  "lines": [
    {
      "article_original": "intitulé exact du produit sur la facture",
      "quantity_delivered": nombre,
      "quantity_unit": "BCL" | "BT" | "BTE" | "CAR" | "kg" | "L" | "U" | "carton" | "...",
      "pack_label": "info conditionnement si mentionnée",
      "unit_price_ht": prix unitaire HT,
      "total_line_ht": montant total ligne HT,
      "tva_rate": pourcentage TVA
    }
  ],
  "anomalies": ["UNIQUEMENT les vrais problèmes - voir règles ci-dessous"]
}

# CE QUI EST UNE ANOMALIE (à signaler)
- Prix manifestement aberrant (ex: pain hot dog à 8€HT)
- Quantité = 0 mais ligne facturée avec montant
- Date manquante ou clairement incohérente
- TVA totalement absente sur une ligne avec montant
- Total facture ne correspond pas à la somme des lignes (écart > 1€)
- Produit dont le nom est illisible ou tronqué
- Ligne avec montant mais sans description

# CE QUI N'EST PAS UNE ANOMALIE (ne PAS mentionner)
- TVA calculée cohérente avec le document : NE PAS LE DIRE, c'est juste OK
- Total TTC cohérent avec HT + TVA : NE PAS LE DIRE, c'est juste OK
- Mention "PORT" ou "MANUTENTION" avec montant vide : NE PAS LE DIRE, c'est normal (souvent gratuit)
- Quantité élevée si le nom du produit explique (ex: "133kg saucisse" pour Norbert qui livre en gros pour Meshuga deli : NORMAL)
- Conditionnement particulier (lots, packs) : NE PAS LE DIRE, c'est normal

# DÉTECTION AVOIR
- Mots-clés : "AVOIR", "NOTE DE CRÉDIT", "CRÉDIT", "REMBOURSEMENT", "RETOUR"
- Préfixe numéro pièce : "AV-", "NC-", "CR-"
- Montants négatifs ou mention "à déduire"
- Si oui → document_type = "avoir"

# RÈGLES MÉTIER PAR FOURNISSEUR

## Episaveurs (CRITIQUE - règle Quantité livrée)
- TOUJOURS lire la colonne "Quantité livrée" pour quantity_delivered
- NE JAMAIS prendre le pack_label comme quantité
- BCL = 1 bocal | BT = N bouteilles | BTE = 1 boîte | CAR = 1 carton
- "x6", "x12" dans intitulé = marketing, JAMAIS la quantité réelle
- Ex: "Cornichons bcl 1600Gx6" + livré "1 BCL" = quantity_delivered=1, pack_label="1600g"

## Monarque (pains)
- Factures TOUJOURS en lots ("xN" ou "N tranches" = nb unités)
- TVA = 5,5%
- 3 produits : "Pain hot dog", "Pain lobster roll", "Pain mini"
- Poids unitaires (90g, 1140g) = info, pas quantité
- Codes références (LR14, LR1100, etc.) qui changent = NORMAL, ne pas signaler
- Notes BL sur retours/déductions = NORMAL, traité en interne, NE PAS signaler comme anomalie
- Lignes "Règlement" sans montant = NORMAL, info comptable, NE PAS signaler

## Foodflow (légumes)
- Cébette = 1 botte (~100g), pas 1kg
- Sucrine = 1 barquette de 6 unités (~3€HT/barquette)
- American cheese = paquet 84 tranches à 7€HT
- Prix qui changent entre commandes sur la même facture = NORMAL, ne PAS signaler comme anomalie (juste extraire le prix moyen pondéré)

## Norbert (boucherie)
- Viande au kg ou en pièces — bien identifier l'unité
- Quantités élevées (50-200kg) = NORMAL pour ce fournisseur

## DS Service (packaging)
- Pot à sauce 60ml (T200P) : carton 2500 = 36,50€HT depuis fév 2025 (ancien tarif 42,29€HT en 2024)
- Couvercle 60ml (PL2P) : carton 2500 = 29,90€HT depuis fév 2025 (ancien tarif 34,45€HT en 2024)
- NE PAS signaler les anciens prix 2024 comme anomalies, c'est l'historique normal
- Pot rond SOLO 16Oz : 54,71€HT/colis 500
- Pot rond SOLO 24Oz : 55,90€HT/colis 500
- Date d'échéance bizarre = NORMAL, ne pas signaler

## Halles Paris Sud (HPS)
- Alias accepté : "HPS" = "Halles Paris Sud" (même fournisseur)
- **Pomme de terre Agria (et autres légumes vendus en sac)** : le prix unitaire affiché EST LE PRIX AU KG, jamais le prix au sac. Un sac de 25kg coûte ~15-18€ HT. Si tu vois "0,63€" avec "Sac 25 kg" et quantité "2 (50 kg)" → 0,63€/kg × 50kg = 31,50€ ligne, c'est NORMAL.
- **Sucrine Cœur** : facturée en barquettes de 6 unités. Prix ~4,22€HT/barquette. Si tu vois "Sucrine Cœur Bqt 10u" avec conditionnement "Barquette 6 Unités" et prix unitaire 4,22€ → la quantité (10) = 10 BARQUETTES, pas 10 unités individuelles. Le libellé "10u" est trompeur.
- **"Autre taxe"** (0,30-0,80€) : éco-contribution / éco-emballage CITEO, NORMALE, NE PAS signaler comme anomalie
- **Écart base TVA vs Total HT** correspondant à l'autre taxe : NORMAL, NE PAS signaler
- Légers écarts d'arrondis sur prix unit × quantité (qq centimes) : NORMAL, ne pas signaler

## La Crémerie Parisienne
- Franco de port ≈ 100€ HT
- Si commande < 100€ HT → frais de port 10€ HT (TVA 20%) appliqués, c'est NORMAL
- Ne PAS signaler les frais de port comme anomalie

## Marina Sea Food (poisson)
- Au kg, parfois sous-vide
- Livraisons à des adresses différentes (cadeaux/personnel) = NORMAL, ne pas signaler

## Rouquette / Jacquier
- Lire les unités attentivement (kg, L, U, pack)

Retourne UNIQUEMENT le JSON, aucun texte autour.`

// ============= OCR via Claude =============
async function callClaudeOCR(pdfBase64: string): Promise<any> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 8000,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: pdfBase64 } },
            { type: 'text', text: OCR_PROMPT }
          ]
        }
      ]
    })
  })

  if (!response.ok) {
    const errText = await response.text()
    throw new Error(`Claude API error ${response.status}: ${errText.substring(0, 200)}`)
  }

  const data = await response.json()
  const text = data.content?.[0]?.text || ''
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error('Pas de JSON dans la réponse Claude')
  try {
    return JSON.parse(jsonMatch[0])
  } catch (e: any) {
    throw new Error(`JSON invalide : ${e.message}`)
  }
}

// ============= Mapper fournisseur =============
async function mapSupplierToId(fournisseurName: string): Promise<{ id: string | null, name: string | null }> {
  const client = sb()
  const normalized = (fournisseurName || '').toLowerCase().trim()
  const { data: suppliers } = await client.from('suppliers').select('id, name')
  if (!suppliers) return { id: null, name: null }
  
  let match = suppliers.find(s => (s.name || '').toLowerCase() === normalized)
  if (!match) {
    match = suppliers.find(s => {
      const sName = (s.name || '').toLowerCase()
      return sName.length > 3 && (normalized.includes(sName) || sName.includes(normalized))
    })
  }
  
  const aliases: Record<string, string> = {
    'norbert': 'norbert', 'foodflow': 'foodflow', 'monarque': 'monarque',
    'marina': 'marina sea food', 'marina sea food': 'marina sea food',
    'rouquette': 'rouquette', 'episaveurs': 'episaveurs', 'pomona': 'episaveurs',
    'ds service': 'ds service', 'ds': 'ds service',
    'hps': 'hps', 'jacquier': 'jacquier'
  }
  
  if (!match) {
    for (const [alias, target] of Object.entries(aliases)) {
      if (normalized.includes(alias)) {
        match = suppliers.find(s => (s.name || '').toLowerCase().includes(target))
        if (match) break
      }
    }
  }
  
  return { id: match?.id || null, name: match?.name || null }
}

// ============= Process 1 fichier =============
async function processSingleFile(
  file: { name: string, base64: string },
  batchId: string,
  forcedSupplierId: string | null,
  forcedSupplierName: string | null
): Promise<any> {
  const client = sb()
  const buffer = Buffer.from(file.base64, 'base64')
  const pdfHash = crypto.createHash('sha256').update(buffer).digest('hex')
  
  // Check duplicate hash
  const { data: existingByHash } = await client.from('pending_invoices').select('id').eq('pdf_hash', pdfHash).limit(1)
  if (existingByHash && existingByHash.length > 0) {
    return { status: 'duplicate', reason: 'same_pdf_hash', details: { file: file.name, existing_id: existingByHash[0].id } }
  }
  
  // OCR
  let ocrData: any
  try {
    ocrData = await callClaudeOCR(file.base64)
  } catch (e: any) {
    return { status: 'error', reason: 'ocr_failed', details: { error: e.message, file: file.name } }
  }
  
  // Resolve supplier
  let supplierId = forcedSupplierId
  let supplierName = forcedSupplierName
  if (!supplierId && ocrData.fournisseur) {
    const mapped = await mapSupplierToId(ocrData.fournisseur)
    supplierId = mapped.id
    supplierName = mapped.name
  }
  
  // Check duplicate métier
  if (supplierId && ocrData.invoice_number && ocrData.invoice_date) {
    const { data: existingByMeta } = await client.from('pending_invoices').select('id')
      .eq('supplier_id', supplierId).eq('invoice_number', ocrData.invoice_number).eq('invoice_date', ocrData.invoice_date).limit(1)
    if (existingByMeta && existingByMeta.length > 0) {
      return { status: 'duplicate', reason: 'same_supplier_invoice_date', details: { file: file.name, existing_id: existingByMeta[0].id } }
    }
  }
  
  // Anomalies (filtrer les vraies + ajouter les techniques)
  const anomalies: string[] = Array.isArray(ocrData.anomalies) ? ocrData.anomalies.filter((a: string) => {
    const lower = (a || '').toLowerCase()
    // Filtrer les fausses anomalies (vérifications cohérentes)
    if (lower.includes('cohérent')) return false
    if (lower.includes('coherent')) return false
    if (lower.includes('correct')) return false
    if (lower.includes('ok')) return false
    if (lower.includes('vide/absent')) return false
    if (lower.includes('port') && lower.includes('vide')) return false
    return true
  }) : []
  
  if (!supplierId) anomalies.push('Fournisseur non identifié dans la base')
  if (!ocrData.invoice_number) anomalies.push('Numéro de facture manquant')
  if (!ocrData.invoice_date) anomalies.push('Date de facture manquante')
  if (!ocrData.lines || ocrData.lines.length === 0) anomalies.push('Aucune ligne produit détectée')
  
  const isCreditNote = ocrData.document_type === 'avoir'
  
  // Insert
  const { data: inserted, error: insertErr } = await client.from('pending_invoices').insert({
    source: 'batch_historical',
    file_name: file.name,
    pdf_base64: file.base64,
    pdf_hash: pdfHash,
    batch_id: batchId,
    is_historical: true,
    is_credit_note: isCreditNote,
    related_invoice_number: ocrData.related_invoice_number || null,
    extracted_data: ocrData,
    fournisseur_extracted: ocrData.fournisseur_raw || ocrData.fournisseur || null,
    supplier_id: supplierId,
    invoice_date: ocrData.invoice_date || null,
    invoice_number: ocrData.invoice_number || null,
    total_ht: ocrData.total_ht || null,
    total_ttc: ocrData.total_ttc || null,
    nb_lines: ocrData.lines?.length || 0,
    has_anomaly: anomalies.length > 0,
    anomaly_reasons: anomalies,
    status: 'pending'
  }).select('id').single()
  
  if (insertErr) {
    return { status: 'error', reason: 'db_insert_failed', details: { error: insertErr.message, file: file.name } }
  }
  
  return { status: 'imported', invoice_id: inserted.id, is_credit_note: isCreditNote, details: { file: file.name } }
}

// ============= POST handler =============
export async function POST(req: NextRequest) {
  if (!ANTHROPIC_API_KEY) return NextResponse.json({ error: 'ANTHROPIC_API_KEY non configurée' }, { status: 500 })
  if (!SUPABASE_SERVICE_ROLE) return NextResponse.json({ error: 'SUPABASE_SERVICE_ROLE_KEY non configurée' }, { status: 500 })
  
  let body: any
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Body JSON invalide' }, { status: 400 }) }
  
  const files = body.files as Array<{ name: string, base64: string }>
  const forcedSupplierId = body.supplier_id_forced || null
  
  if (!Array.isArray(files) || files.length === 0) return NextResponse.json({ error: 'Aucun fichier fourni' }, { status: 400 })
  if (files.length > 100) return NextResponse.json({ error: 'Maximum 100 fichiers par batch' }, { status: 400 })
  
  const client = sb()
  let forcedSupplierName: string | null = null
  if (forcedSupplierId) {
    const { data } = await client.from('suppliers').select('name').eq('id', forcedSupplierId).single()
    forcedSupplierName = data?.name || null
  }
  
  const { data: batch, error: batchErr } = await client.from('historical_import_batches').insert({
    supplier_id: forcedSupplierId,
    supplier_name: forcedSupplierName,
    total_files: files.length,
    status: 'processing'
  }).select('id').single()
  
  if (batchErr || !batch) return NextResponse.json({ error: 'Création batch impossible : ' + (batchErr?.message || '') }, { status: 500 })
  
  const batchId = batch.id
  const BATCH_SIZE = 5
  const results: Array<any> = []
  
  for (let i = 0; i < files.length; i += BATCH_SIZE) {
    const slice = files.slice(i, i + BATCH_SIZE)
    const sliceResults = await Promise.all(
      slice.map(f => processSingleFile(f, batchId, forcedSupplierId, forcedSupplierName)
        .catch(e => ({ status: 'error', reason: 'unexpected', details: { error: e.message, file: f.name } }))
      )
    )
    results.push(...sliceResults)
    await client.from('historical_import_batches').update({ processed_files: i + slice.length }).eq('id', batchId)
  }
  
  const imported = results.filter(r => r.status === 'imported')
  const invoices = imported.filter(r => !r.is_credit_note).length
  const creditNotes = imported.filter(r => r.is_credit_note).length
  const duplicates = results.filter(r => r.status === 'duplicate').length
  const errors = results.filter(r => r.status === 'error')
  
  const importedIds = imported.map(r => r.invoice_id).filter(Boolean)
  let dateStart = null
  let dateEnd = null
  if (importedIds.length > 0) {
    const { data: dates } = await client.from('pending_invoices').select('invoice_date')
      .in('id', importedIds).not('invoice_date', 'is', null).order('invoice_date', { ascending: true })
    if (dates && dates.length > 0) {
      dateStart = dates[0].invoice_date
      dateEnd = dates[dates.length - 1].invoice_date
    }
  }
  
  await client.from('historical_import_batches').update({
    processed_files: files.length,
    invoices_count: invoices,
    credit_notes_count: creditNotes,
    duplicates_count: duplicates,
    errors_count: errors.length,
    errors_log: errors.map(e => ({ file: e.details?.file, reason: e.reason, error: e.details?.error })),
    status: errors.length === 0 ? 'completed' : (imported.length > 0 ? 'partial_error' : 'completed'),
    date_range_start: dateStart,
    date_range_end: dateEnd,
    completed_at: new Date().toISOString()
  }).eq('id', batchId)
  
  return NextResponse.json({
    batch_id: batchId,
    summary: {
      total_files: files.length,
      invoices_imported: invoices,
      credit_notes_imported: creditNotes,
      duplicates_skipped: duplicates,
      errors_count: errors.length,
      date_range: dateStart && dateEnd ? { start: dateStart, end: dateEnd } : null
    },
    results: results
  })
}
