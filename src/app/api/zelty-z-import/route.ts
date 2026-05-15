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
const ZAPIER_API_KEY = process.env.ZAPIER_API_KEY || 'meshuga-zelty-secret-2026'

function sb() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE)
}

// ============= PROMPT OCR ZELTY Z =============
const Z_OCR_PROMPT = `Tu es un expert OCR de Z de caisse pour le restaurant Meshuga Crazy Deli (Zelty).

Analyse le contenu fourni (corps email + PDF si présent) et extrais en JSON STRICT.

# FORMAT DE SORTIE
{
  "z_date": "YYYY-MM-DD",
  "ca_ttc": nombre,
  "ca_ht": nombre,
  "tva_montant": nombre,
  "nb_tickets": entier,
  "nb_couverts": entier,
  "ticket_moyen": nombre,
  "canaux": {
    "sur_place": nombre,
    "emporter": nombre,
    "livraison": nombre,
    "click_collect": nombre,
    "uber_eats": nombre,
    "deliveroo": nombre,
    "autre": nombre
  },
  "canaux_nb_tickets": {
    "sur_place": entier,
    "emporter": entier,
    "livraison": entier,
    "click_collect": entier,
    "uber_eats": entier,
    "deliveroo": entier,
    "autre": entier
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
    "autre": nombre
  },
  "anomalies": ["liste des vraies anomalies, par exemple total qui ne match pas"]
}

# RÈGLES
- z_date = jour du service (généralement la veille de l'envoi du mail)
- Tous les montants en HT et TTC selon les libellés
- Mettre à 0 (zero) un canal/paiement non présent
- Si "Total HT" et "Total TTC" donnés, vérifier cohérence (écart <1€ = OK)
- Si pas de répartition par canal détaillée, mettre tout dans "sur_place"
- Tickets Restaurant inclut : Swile, Edenred, Pluxee (chèque déjeuner), Up
- Ne pas confondre "ticket de caisse" (= une vente) avec "ticket resto" (= mode paiement)

Retourne UNIQUEMENT le JSON, aucun texte autour.`

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
  // Sécurité : vérifier la clé API
  const apiKey = req.headers.get('x-api-key') || req.headers.get('X-API-Key')
  if (apiKey !== ZAPIER_API_KEY) {
    return NextResponse.json({ error: 'Clé API invalide ou manquante (header X-API-Key)' }, { status: 401 })
  }
  
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
      nb_couverts: ocrData.nb_couverts || null,
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
    auth: 'Header X-API-Key required',
    payload_example: {
      email_subject: 'Z de caisse - 14/05/2026',
      email_body: '<corps email avec chiffres>',
      pdf_attachment_base64: '<optionnel>'
    }
  })
}
