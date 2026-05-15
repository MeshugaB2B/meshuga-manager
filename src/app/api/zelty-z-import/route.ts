// src/app/api/zelty-z-import/route.ts
// =============================================================================
// Route d'import des Z de caisse Zelty
// 
// Workflow : Email Zelty (00:01) → Zapier → POST sur cette route
// 
// Payload attendu (Zapier envoie le mail parsé) :
// {
//   "email_subject": "Z de caisse - Meshuga - 14/05/2026",
//   "email_body": "<texte du corps email avec les chiffres>",
//   "pdf_attachment_base64": "<optionnel, le PDF si Zapier le forwarde>",
//   "received_at": "2026-05-15T00:01:23Z"
// }
// 
// Sécurité : clé API simple via header X-API-Key
// =============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const maxDuration = 60

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || ''
// Auth désactivée temporairement (à activer plus tard si besoin)

function sb() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE)
}

// ============= PROMPT OCR ZELTY Z =============
const Z_OCR_PROMPT = `Tu es un expert OCR de Z de caisse Zelty pour Meshuga Crazy Deli (3 rue Vavin, Paris 6e).

Analyse le PDF du Z de caisse fourni et extrais en JSON STRICT.

# FORMAT DE SORTIE (clés en minuscules, snake_case)
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
  "anomalies": ["liste UNIQUEMENT des vraies anomalies métier"]
}

# FORMAT TYPE DU Z MESHUGA
Le Z est structuré en sections : CA / TVA / CA par mode / Statistiques / Détails tickets / Règlements

# RÈGLES CRITIQUES

## Date
- "Date des commandes : 14/5/26" → z_date = "2026-05-14"
- Format français DD/M/YY ou DD/MM/YYYY à convertir en ISO

## CA et tickets
- "Nombre de commandes" = nb_tickets (PAS le nombre d'articles)
- "Nombre d'articles" = nb_articles (séparé)
- "Commande moyenne" = ticket_moyen
- Couverts à 0 = NORMAL (non saisis), PAS une anomalie

## Canaux (section "CA par mode")
- "Sur place X" → canaux.sur_place = montant, canaux_nb_tickets.sur_place = X
- "Emporté X" → canaux.emporter = montant
- "Livraison X" → canaux.livraison = montant
- Si un canal n'apparaît pas, mettre 0

## Paiements (section "Règlements" ou "Règlements réels")
- "Espèces X" → paiements.especes
- "CB" / "Carte bancaire" → paiements.cb
- "Deliveroo X" → paiements.deliveroo
- "UberEats X" / "Uber Eats" → paiements.uber_eats
- "Tabesto X" → paiements.tabesto (IMPORTANT : Tabesto = borne self-service, mode de paiement à part)
- "Tickets restaurant" / "Ticket resto" → paiements.tickets_resto
- "Edenred" / "Swile" / "Pluxee" / "Up" → mode tickets resto (séparer si listés distinctement)
- "Chèque" → paiements.cheque
- Si paiement non listé ci-dessus → paiements.autre

## Anomalies VRAIES (à signaler)
- CA TTC manquant ou nul
- Écart > 1€ entre Total règlements et CA TTC
- Date illisible ou incohérente
- TVA qui ne correspond pas à 10% du HT

## Anomalies FAUSSES (à NE PAS signaler)
- Couverts = 0 (normal car non saisis)
- Tickets annulés à 0
- Fonds de caisse = 0

# CONSIGNES
- Tous les montants sont en EUROS (€)
- Tous les montants extraits sont en valeurs absolues (positives)
- Mettre 0 (pas null) pour un canal/paiement absent
- Si écart d'arrondi <0,10€ entre total règlements et CA TTC → OK, pas d'anomalie

Retourne UNIQUEMENT le JSON, aucun texte avant ou après.`

// ============= OCR via Claude =============
async function callClaudeOCR(emailBody: string, pdfBase64?: string): Promise<any> {
  const content: any[] = []
  
  if (pdfBase64) {
    content.push({
      type: 'document',
      source: { type: 'base64', media_type: 'application/pdf', data: pdfBase64 }
    })
  }
  
  content.push({
    type: 'text',
    text: Z_OCR_PROMPT + '\n\n# CORPS DE L\'EMAIL\n\n' + emailBody
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

// ============= POST handler =============
export async function POST(req: NextRequest) {
  if (!ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY non configurée' }, { status: 500 })
  }
  
  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Body JSON invalide' }, { status: 400 })
  }
  
  const emailBody = body.email_body || body.body || ''
  const emailSubject = body.email_subject || body.subject || ''
  const pdfBase64 = body.pdf_attachment_base64 || body.pdf || null
  
  if (!emailBody && !pdfBase64) {
    return NextResponse.json({ error: 'email_body ou pdf_attachment_base64 requis' }, { status: 400 })
  }
  
  // OCR
  let ocrData: any
  try {
    ocrData = await callClaudeOCR(emailBody, pdfBase64)
  } catch (e: any) {
    return NextResponse.json({ error: 'OCR failed: ' + e.message }, { status: 500 })
  }
  
  // Validation date
  if (!ocrData.z_date) {
    return NextResponse.json({ error: 'Date du Z non détectée par l\'OCR', ocr_data: ocrData }, { status: 422 })
  }
  
  const client = sb()
  
  // Anti-doublon : un seul Z par jour
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
      z_date: ocrData.z_date
    }, { status: 200 })
  }
  
  // Anomalies basiques
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
      raw_email_body: emailBody.substring(0, 10000), // limite stockage
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

// ============= GET handler (pour tester rapidement) =============
export async function GET() {
  return NextResponse.json({
    endpoint: '/api/zelty-z-import',
    method: 'POST',
    auth: 'Aucune (provisoire)',
    payload_example: {
      email_subject: 'Z de caisse - 14/05/2026',
      email_body: '<corps email avec chiffres>',
      pdf_attachment_base64: '<optionnel>'
    }
  })
}
