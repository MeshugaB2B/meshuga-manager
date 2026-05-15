// src/app/api/zelty-z-import/route.ts
// =============================================================================
// Route d'import des Z de caisse Zelty - V6 ULTRA TOLERANTE
// 
// Accepte n'importe quel format en entrée :
//   - JSON propre : { "email_subject": "...", "email_body": "...", "pdf_attachment_base64": "..." }
//   - JSON cassé : { "email_subject": "...", ... avec retours ligne, guillemets, etc.
//   - Texte brut : tout le body est traité comme du texte à analyser
//   - HTML brut : Claude se débrouille
// 
// Stratégie : on lit tout le body en TEXT, on tente un parse JSON, si ça échoue
// on traite tout comme du texte et on passe le tout à Claude OCR.
// =============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const maxDuration = 60

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || ''

function sb() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE)
}

// ============= PROMPT OCR Z =============
const Z_OCR_PROMPT = `Tu es un expert OCR de Z de caisse Zelty pour Meshuga Crazy Deli (3 rue Vavin, Paris 6e).

Le contenu fourni ci-dessous peut être :
- Le corps email d'un Z de caisse Zelty
- Du texte brut, du HTML, du JSON cassé, ou n'importe quel format
- Avec ou sans pièce jointe PDF

Trouve les chiffres du Z et extrais en JSON STRICT.

# FORMAT DE SORTIE
{
  "z_date": "YYYY-MM-DD",
  "ca_ttc": nombre,
  "ca_ht": nombre,
  "tva_montant": nombre,
  "nb_tickets": entier,
  "nb_articles": entier,
  "nb_couverts": entier,
  "ticket_moyen": nombre,
  "canaux": {
    "sur_place": nombre,
    "emporter": nombre,
    "livraison": nombre
  },
  "canaux_nb_tickets": {
    "sur_place": entier,
    "emporter": entier,
    "livraison": entier
  },
  "paiements": {
    "cb": nombre,
    "especes": nombre,
    "tickets_resto": nombre,
    "cheque": nombre,
    "edenred": nombre,
    "swile": nombre,
    "uber_eats": nombre,
    "deliveroo": nombre,
    "tabesto": nombre,
    "autre": nombre
  },
  "anomalies": []
}

# REGLES CRITIQUES

## Date
- "Date des commandes : 14/5/26" → z_date = "2026-05-14"
- Si tu trouves une date format français (DD/M/YY ou DD/MM/YYYY), convertis en ISO YYYY-MM-DD
- IMPORTANT : si le mail a été forwardé/transféré, IGNORE la date du forward et utilise la date du Z d'origine (section "Date des commandes")

## CA et tickets
- "Nombre de commandes" = nb_tickets
- "Nombre d'articles" = nb_articles
- "Commande moyenne" = ticket_moyen
- Couverts à 0 = NORMAL, PAS d'anomalie

## Canaux ("CA par mode")
- "Sur place X" → canaux.sur_place = montant, canaux_nb_tickets.sur_place = X
- "Emporté X" → canaux.emporter
- "Livraison X" → canaux.livraison
- Si absent, mettre 0

## Paiements ("Règlements")
- "Espèces X" → especes
- "Deliveroo X" → deliveroo
- "UberEats X" → uber_eats
- "Tabesto X" → tabesto (borne self-service Meshuga)
- "CB" / "Carte" → cb
- "Tickets restaurant" / "Edenred" / "Swile" / "Pluxee" → tickets_resto
- Sinon → autre

## Anomalies VRAIES
- Aucune si Z parfait (laisser anomalies: [])
- Écart > 1€ entre Total règlements et CA TTC = anomalie

## Anomalies FAUSSES (ne PAS signaler)
- Couverts = 0
- Fonds de caisse = 0
- Tickets annulés = 0

# IMPORTANT
- Tous les montants en EUROS, valeurs positives
- Mettre 0 (pas null) si absent
- Ignore tout le HTML, headers email, signatures
- Concentre-toi uniquement sur les chiffres du Z

Retourne UNIQUEMENT le JSON, AUCUN texte avant ou après.`

// ============= OCR via Claude =============
async function callClaudeOCR(textContent: string, pdfBase64?: string): Promise<any> {
  const content: any[] = []
  
  if (pdfBase64) {
    const cleanB64 = pdfBase64.replace(/\s/g, '')
    const isValidB64 = cleanB64.length > 100 && /^[A-Za-z0-9+/=]+$/.test(cleanB64)
    if (isValidB64) {
      content.push({
        type: 'document',
        source: { type: 'base64', media_type: 'application/pdf', data: cleanB64 }
      })
    }
  }
  
  content.push({
    type: 'text',
    text: Z_OCR_PROMPT + '\n\n# CONTENU A ANALYSER\n\n' + textContent
  })
  
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 4000,
      messages: [{ role: 'user', content }]
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

// ============= Helper : extraire un PDF base64 si présent =============
async function tryExtractPdfBase64(value: any): Promise<string | null> {
  if (!value || typeof value !== 'string') return null
  // Si c'est une URL, on la télécharge
  if (value.startsWith('http')) {
    try {
      const r = await fetch(value)
      if (!r.ok) return null
      const buf = await r.arrayBuffer()
      return Buffer.from(buf).toString('base64')
    } catch {
      return null
    }
  }
  // Sinon c'est peut-être déjà du base64
  const clean = value.replace(/\s/g, '')
  if (clean.length > 100 && /^[A-Za-z0-9+/=]+$/.test(clean)) {
    return clean
  }
  return null
}

// ============= POST handler ULTRA TOLERANT =============
export async function POST(req: NextRequest) {
  if (!ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY non configurée' }, { status: 500 })
  }
  
  // STRATEGIE : lire le body en TEXT brut, tenter un parse JSON, sinon traiter comme texte
  let rawText = ''
  try {
    rawText = await req.text()
  } catch {
    return NextResponse.json({ error: 'Impossible de lire le body de la requête' }, { status: 400 })
  }
  
  if (!rawText || rawText.trim().length === 0) {
    return NextResponse.json({ error: 'Body vide' }, { status: 400 })
  }
  
  // Tenter parse JSON
  let textContent = ''
  let emailSubject = ''
  let pdfBase64: string | null = null
  
  try {
    const body = JSON.parse(rawText)
    // JSON OK : extraire les champs connus
    emailSubject = body.email_subject || body.subject || ''
    textContent = body.email_body || body.body || ''
    
    // Tenter d'extraire le PDF
    const pdfCandidate = body.pdf_attachment_base64 || body.pdf_attachment_url || body.pdf || body.attachment || ''
    if (pdfCandidate) {
      pdfBase64 = await tryExtractPdfBase64(pdfCandidate)
    }
    
    // Si pas de body trouvé, fallback : utiliser tout le JSON comme texte
    if (!textContent && !pdfBase64) {
      textContent = rawText
    }
  } catch {
    // JSON cassé : tout le body est traité comme texte brut
    textContent = rawText
  }
  
  if (!textContent && !pdfBase64) {
    return NextResponse.json({ error: 'Aucun contenu exploitable' }, { status: 400 })
  }
  
  // OCR
  let ocrData: any
  try {
    ocrData = await callClaudeOCR(textContent, pdfBase64 || undefined)
  } catch (e: any) {
    return NextResponse.json({ error: 'OCR failed: ' + e.message }, { status: 500 })
  }
  
  // Validation date
  if (!ocrData.z_date) {
    return NextResponse.json({ 
      error: 'Date du Z non détectée par l\'OCR', 
      ocr_data: ocrData,
      hint: 'Vérifier que le contenu envoyé contient bien un Z de caisse Zelty'
    }, { status: 422 })
  }
  
  const client = sb()
  
  // Anti-doublon
  const { data: existing } = await client
    .from('daily_z_reports')
    .select('id')
    .eq('z_date', ocrData.z_date)
    .limit(1)
  
  if (existing && existing.length > 0) {
    return NextResponse.json({
      status: 'duplicate',
      message: 'Un Z existe déjà pour cette date',
      existing_id: existing[0].id,
      z_date: ocrData.z_date,
      ocr_data: ocrData
    }, { status: 200 })
  }
  
  // Anomalies
  const anomalies: string[] = Array.isArray(ocrData.anomalies) ? ocrData.anomalies : []
  if (!ocrData.ca_ttc || ocrData.ca_ttc <= 0) anomalies.push('CA TTC manquant ou nul')
  if (!ocrData.nb_tickets || ocrData.nb_tickets <= 0) anomalies.push('Nombre de tickets manquant ou nul')
  
  // Insert
  const { data: inserted, error: insertErr } = await client
    .from('daily_z_reports')
    .insert({
      z_date: ocrData.z_date,
      ca_ttc: ocrData.ca_ttc || null,
      ca_ht: ocrData.ca_ht || null,
      tva_montant: ocrData.tva_montant || null,
      nb_tickets: ocrData.nb_tickets || null,
      nb_couverts: ocrData.nb_couverts || 0,
      ticket_moyen: ocrData.ticket_moyen || (ocrData.ca_ttc && ocrData.nb_tickets ? ocrData.ca_ttc / ocrData.nb_tickets : null),
      canaux: ocrData.canaux || {},
      canaux_nb_tickets: ocrData.canaux_nb_tickets || {},
      paiements: ocrData.paiements || {},
      source: 'zapier',
      raw_email_subject: emailSubject,
      raw_email_body: textContent.substring(0, 10000),
      pdf_base64: pdfBase64,
      ocr_data: ocrData,
      has_anomaly: anomalies.length > 0,
      anomaly_reasons: anomalies
    })
    .select('id, z_date, ca_ttc, nb_tickets')
    .single()
  
  if (insertErr) {
    return NextResponse.json({ error: 'DB insert failed: ' + insertErr.message }, { status: 500 })
  }
  
  return NextResponse.json({
    status: 'imported',
    z_report: inserted,
    summary: {
      date: ocrData.z_date,
      ca_ttc: ocrData.ca_ttc,
      ca_ht: ocrData.ca_ht,
      nb_tickets: ocrData.nb_tickets,
      ticket_moyen: ocrData.ticket_moyen,
      anomalies_count: anomalies.length
    }
  })
}

// ============= GET handler (test rapide) =============
export async function GET() {
  return NextResponse.json({
    endpoint: '/api/zelty-z-import',
    method: 'POST',
    version: 'v6-ultra-tolerant',
    auth: 'Aucune (provisoire)',
    note: 'Accepte n\'importe quel format : JSON propre, JSON cassé, texte brut, HTML'
  })
}
