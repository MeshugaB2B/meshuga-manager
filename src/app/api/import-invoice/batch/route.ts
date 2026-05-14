// src/app/api/import-invoice/batch/route.ts
// Import en masse de factures historiques
// - Accepte N fichiers PDF en base64
// - Dédup par hash SHA-256 + match (supplier + invoice_number + invoice_date)
// - OCR Claude Sonnet 4.6 avec règles métier Meshuga injectées
// - Insère dans pending_invoices avec is_historical=true + batch_id
// - Limite : 10 fichiers OCR en parallèle pour respecter rate limit Anthropic

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

export const runtime = 'nodejs'
export const maxDuration = 300 // 5 minutes max par batch

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || ''

function sb() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE)
}

// ============= PROMPT OCR ENRICHI MESHUGA =============
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
  "anomalies": ["liste des anomalies détectées"]
}

# RÈGLES MÉTIER CRITIQUES À RESPECTER

## Détection avoir/note de crédit
- Cherche les mots-clés : "AVOIR", "NOTE DE CRÉDIT", "CRÉDIT", "REMBOURSEMENT", "RETOUR"
- Préfixe numéro pièce : "AV-", "NC-", "CR-"
- Montants négatifs ou mention "à déduire"
→ Si oui : document_type = "avoir"

## Episaveurs (CRITIQUE — règle Quantité livrée)
- TOUJOURS lire la colonne "Quantité livrée" pour quantity_delivered
- NE JAMAIS prendre le pack_label comme quantité
- BCL = 1 bocal (pas un pack même si "x6" dans le label)
- BT = N bouteilles individuelles
- BTE = 1 boîte
- CAR = 1 carton
- Le "x6", "x12" dans l'intitulé = descriptif marketing, JAMAIS la quantité réelle
- Exemple : "Cornichons bcl 1600Gx6" + livré "1 BCL" → quantity_delivered=1, quantity_unit="BCL", pack_label="1600g"

## Monarque (pains)
- Factures TOUJOURS en lots
- Patterns : "xN" ou "N tranches" indiquent le nombre d'unités
- TVA = 5,5% (vérifier)
- 3 produits Pain distincts : "Pain hot dog", "Pain lobster roll", "Pain mini"
- Poids unitaires indicatifs (90g, 1140g) = info, pas quantité

## Foodflow (légumes)
- Cébette = 1 botte (~100g), pas 1kg
- Sucrine = 1 barquette de 6 unités (~3€HT/barquette)
- American cheese = paquet de 84 tranches à 7€HT
- Bien différencier botte/barquette/kg

## Norbert (boucherie)
- Viande au kg ou en pièces — vérifier l'unité
- Côtes/portions parfois en U

## Marina Sea Food (poisson)
- Au kg, parfois sous-vide

## Rouquette (épicerie)
- Multi-produits, packs fréquents
- Lire les conditionnements

## DS Service (packaging)
- À l'unité ou par carton de N
- Pot 60ml : carton de 2500 = 36,50€HT (0,0146€/U)
- Couvercle 60ml : carton de 2500 = 29,90€HT (0,01196€/U)

## HPS (consommables)
- Gants, essuie-tout, produits ménagers

## Jacquier
- Fruits/légumes complémentaires

# ANOMALIES À SIGNALER
- Prix manifestement aberrant (ex: pain hot dog à 8€HT)
- Quantité = 0 mais ligne facturée
- Date manquante ou incohérente
- TVA absente ou bizarre
- Total ligne ≠ qty × prix unitaire

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
            {
              type: 'document',
              source: {
                type: 'base64',
                media_type: 'application/pdf',
                data: pdfBase64
              }
            },
            {
              type: 'text',
              text: OCR_PROMPT
            }
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
  
  // Extraire le JSON (au cas où Claude met des backticks)
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error('Pas de JSON dans la réponse Claude')
  
  try {
    return JSON.parse(jsonMatch[0])
  } catch (e: any) {
    throw new Error(`JSON invalide : ${e.message}`)
  }
}

// ============= Mapper fournisseur extrait → supplier_id DB =============
async function mapSupplierToId(fournisseurName: string): Promise<{ id: string | null, name: string | null }> {
  const client = sb()
  const normalized = (fournisseurName || '').toLowerCase().trim()
  
  // Match exact ou approximatif sur le nom
  const { data: suppliers } = await client.from('suppliers').select('id, name')
  if (!suppliers) return { id: null, name: null }
  
  // 1. Match exact (insensible à la casse)
  let match = suppliers.find(s => (s.name || '').toLowerCase() === normalized)
  
  // 2. Match partiel (le nom DB contenu dans le nom extrait ou vice-versa)
  if (!match) {
    match = suppliers.find(s => {
      const sName = (s.name || '').toLowerCase()
      return sName.length > 3 && (normalized.includes(sName) || sName.includes(normalized))
    })
  }
  
  // 3. Match par alias connus
  const aliases: Record<string, string> = {
    'norbert': 'norbert',
    'foodflow': 'foodflow',
    'monarque': 'monarque',
    'marina': 'marina sea food',
    'marina sea food': 'marina sea food',
    'rouquette': 'rouquette',
    'episaveurs': 'episaveurs',
    'pomona': 'episaveurs',
    'ds service': 'ds service',
    'ds': 'ds service',
    'hps': 'hps',
    'jacquier': 'jacquier'
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

// ============= Traitement d'1 fichier =============
async function processSingleFile(
  file: { name: string, base64: string },
  batchId: string,
  forcedSupplierId: string | null,
  forcedSupplierName: string | null
): Promise<{
  status: 'imported' | 'duplicate' | 'error',
  invoice_id?: string,
  is_credit_note?: boolean,
  reason?: string,
  details?: any
}> {
  const client = sb()
  
  // 1. Hash SHA-256
  const buffer = Buffer.from(file.base64, 'base64')
  const pdfHash = crypto.createHash('sha256').update(buffer).digest('hex')
  
  // 2. Check duplicate par hash uniquement (à ce stade on n'a pas encore les autres infos)
  const { data: existingByHash } = await client
    .from('pending_invoices')
    .select('id')
    .eq('pdf_hash', pdfHash)
    .limit(1)
  
  if (existingByHash && existingByHash.length > 0) {
    return {
      status: 'duplicate',
      reason: 'same_pdf_hash',
      details: { existing_id: existingByHash[0].id }
    }
  }
  
  // 3. OCR Claude
  let ocrData: any
  try {
    ocrData = await callClaudeOCR(file.base64)
  } catch (e: any) {
    return {
      status: 'error',
      reason: 'ocr_failed',
      details: { error: e.message, file: file.name }
    }
  }
  
  // 4. Résoudre supplier_id
  let supplierId = forcedSupplierId
  let supplierName = forcedSupplierName
  if (!supplierId && ocrData.fournisseur) {
    const mapped = await mapSupplierToId(ocrData.fournisseur)
    supplierId = mapped.id
    supplierName = mapped.name
  }
  
  // 5. Check duplicate métier (supplier + invoice_number + date)
  if (supplierId && ocrData.invoice_number && ocrData.invoice_date) {
    const { data: existingByMeta } = await client
      .from('pending_invoices')
      .select('id')
      .eq('supplier_id', supplierId)
      .eq('invoice_number', ocrData.invoice_number)
      .eq('invoice_date', ocrData.invoice_date)
      .limit(1)
    
    if (existingByMeta && existingByMeta.length > 0) {
      return {
        status: 'duplicate',
        reason: 'same_supplier_invoice_date',
        details: { existing_id: existingByMeta[0].id }
      }
    }
  }
  
  // 6. Préparer les anomalies
  const anomalies: string[] = ocrData.anomalies || []
  if (!supplierId) anomalies.push('Fournisseur non identifié dans la base')
  if (!ocrData.invoice_number) anomalies.push('Numéro de facture manquant')
  if (!ocrData.invoice_date) anomalies.push('Date de facture manquante')
  if (!ocrData.lines || ocrData.lines.length === 0) anomalies.push('Aucune ligne produit détectée')
  
  // 7. Insert dans pending_invoices
  const isCreditNote = ocrData.document_type === 'avoir'
  
  const { data: inserted, error: insertErr } = await client
    .from('pending_invoices')
    .insert({
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
    })
    .select('id')
    .single()
  
  if (insertErr) {
    return {
      status: 'error',
      reason: 'db_insert_failed',
      details: { error: insertErr.message, file: file.name }
    }
  }
  
  return {
    status: 'imported',
    invoice_id: inserted.id,
    is_credit_note: isCreditNote
  }
}

// ============= POST handler =============
export async function POST(req: NextRequest) {
  if (!ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY non configurée' }, { status: 500 })
  }
  if (!SUPABASE_SERVICE_ROLE) {
    return NextResponse.json({ error: 'SUPABASE_SERVICE_ROLE_KEY non configurée' }, { status: 500 })
  }
  
  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Body JSON invalide' }, { status: 400 })
  }
  
  const files = body.files as Array<{ name: string, base64: string }>
  const forcedSupplierId = body.supplier_id_forced || null
  
  if (!Array.isArray(files) || files.length === 0) {
    return NextResponse.json({ error: 'Aucun fichier fourni' }, { status: 400 })
  }
  if (files.length > 100) {
    return NextResponse.json({ error: 'Maximum 100 fichiers par batch' }, { status: 400 })
  }
  
  const client = sb()
  
  // Récupérer le nom du fournisseur forcé si applicable
  let forcedSupplierName: string | null = null
  if (forcedSupplierId) {
    const { data } = await client.from('suppliers').select('name').eq('id', forcedSupplierId).single()
    forcedSupplierName = data?.name || null
  }
  
  // 1. Créer le batch
  const { data: batch, error: batchErr } = await client
    .from('historical_import_batches')
    .insert({
      supplier_id: forcedSupplierId,
      supplier_name: forcedSupplierName,
      total_files: files.length,
      status: 'processing'
    })
    .select('id')
    .single()
  
  if (batchErr || !batch) {
    return NextResponse.json({ error: 'Création batch impossible : ' + (batchErr?.message || '') }, { status: 500 })
  }
  
  const batchId = batch.id
  
  // 2. Traitement par lots de 5 en parallèle (rate limit Anthropic)
  const BATCH_SIZE = 5
  const results: Array<any> = []
  
  for (let i = 0; i < files.length; i += BATCH_SIZE) {
    const slice = files.slice(i, i + BATCH_SIZE)
    const sliceResults = await Promise.all(
      slice.map(f => processSingleFile(f, batchId, forcedSupplierId, forcedSupplierName)
        .catch(e => ({
          status: 'error' as const,
          reason: 'unexpected',
          details: { error: e.message, file: f.name }
        }))
      )
    )
    results.push(...sliceResults)
    
    // Update compteur intermédiaire
    const processedSoFar = i + slice.length
    await client
      .from('historical_import_batches')
      .update({ processed_files: processedSoFar })
      .eq('id', batchId)
  }
  
  // 3. Stats finales
  const imported = results.filter(r => r.status === 'imported')
  const invoices = imported.filter(r => !r.is_credit_note).length
  const creditNotes = imported.filter(r => r.is_credit_note).length
  const duplicates = results.filter(r => r.status === 'duplicate').length
  const errors = results.filter(r => r.status === 'error')
  
  // 4. Calculer la plage de dates
  const importedIds = imported.map(r => r.invoice_id).filter(Boolean)
  let dateStart = null
  let dateEnd = null
  if (importedIds.length > 0) {
    const { data: dates } = await client
      .from('pending_invoices')
      .select('invoice_date')
      .in('id', importedIds)
      .not('invoice_date', 'is', null)
      .order('invoice_date', { ascending: true })
    if (dates && dates.length > 0) {
      dateStart = dates[0].invoice_date
      dateEnd = dates[dates.length - 1].invoice_date
    }
  }
  
  // 5. Update batch final
  await client
    .from('historical_import_batches')
    .update({
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
    })
    .eq('id', batchId)
  
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
