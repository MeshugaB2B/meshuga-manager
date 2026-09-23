// ============================================================
// src/app/api/generate-email/route.ts
// ============================================================
// 2 modes :
//  - PITCH (nouveau) : body = { prospect, emailType, senderKey }
//      → { subject, body, pressKeys }  (texte perso ; références, vidéo
//        Paris Première et liens presse sont ajoutés par le template)
//  - LEGACY : body = { prompt, systemPrompt? } → { text }
// ============================================================

import { NextResponse } from 'next/server'
import { OFFER_SUMMARY, PRESS_LINKS, REFERENCES, getSender, defaultPressKeys, sanitizePressKeys } from '@/lib/prospectEmail'

export const maxDuration = 30

var MODEL = 'claude-sonnet-4-6'

async function callClaude(system: string, prompt: string, maxTokens: number) {
  var body: any = {
    model: MODEL,
    max_tokens: maxTokens,
    messages: [{ role: 'user', content: prompt }]
  }
  if (system) body.system = system
  var res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY || '',
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify(body)
  })
  var data = await res.json()
  if (!res.ok) throw new Error((data && data.error && data.error.message) || 'Erreur Anthropic')
  var text = ''
  var blocks = (data && data.content) || []
  for (var i = 0; i < blocks.length; i++) if (blocks[i] && blocks[i].type === 'text') text += blocks[i].text
  return text
}

function buildSystem(senderKey: string) {
  var s = getSender(senderKey)
  var pressList = PRESS_LINKS.map(function (p) { return '- ' + p.key + ' : ' + p.name + ' (' + p.label + ')' }).join('\n')
  var refs = REFERENCES.map(function (r) { return '- ' + r.title + ' — ' + r.detail }).join('\n')
  return [
    'Tu écris des emails de prospection B2B pour Meshuga Events, au nom de ' + s.name + ' (' + s.role + ').',
    '',
    'CE QU’ON FAIT :',
    OFFER_SUMMARY,
    '',
    'RÉFÉRENCES PROS (affichées automatiquement sous ton texte dans un encart dédié) :',
    refs,
    '',
    'PRESSE : un encart vidéo « Très Très Bon / Paris Première » et 2-3 liens presse sont ajoutés automatiquement sous ton texte. Tu choisis les 2 articles les plus pertinents pour ce prospect parmi :',
    pressList,
    'Logique : lesechos/telerama → corporate, RH, cabinets, luxe ; konbini/lebonbon → créatif, agences, startups, musique, mode.',
    '',
    'STYLE :',
    '- Français impeccable, vouvoiement, registre pro mais vivant — on est un deli new-yorkais, pas une banque. Zéro formule creuse (« je me permets », « n’hésitez pas », « solution sur mesure »).',
    '- Montre en 1 phrase que tu comprends l’univers et les moments du prospect (réunions, onboarding, lancements, soirées clients…).',
    '- Cite au plus UNE référence dans le texte, la plus proche de leur univers, sans répéter tout l’encart.',
    '- Ne mets AUCUNE URL dans le texte (les liens sont dans les encarts). Pas de markdown sauf **gras** avec parcimonie.',
    '- Termine par une proposition concrète et facile à accepter (dégustation offerte pour 2-3 personnes de l’équipe, box découverte, appel de 10 min), puis une formule de politesse courte. NE SIGNE PAS : la signature est ajoutée automatiquement.',
    '- Salutation : « Bonjour <Prénom>, » si le prénom est connu, sinon « Bonjour, ».',
    '- N’invente aucun chiffre, prix, client ou fait non fourni. La marque s’écrit « Meshuga » (jamais « Crazy Deli »).',
    '',
    'FORMAT DE SORTIE : UNIQUEMENT un objet JSON valide, sans texte autour ni balises de code :',
    '{"subject": "...", "body": "...", "pressKeys": ["clé1", "clé2"]}',
    'Dans "body", sépare les paragraphes par \\n\\n. Objet : court (< 60 caractères), concret, sans emoji ni majuscules criardes.'
  ].join('\n')
}

function buildPrompt(p: any, emailType: string) {
  var first = String(p.contactFirstName || '').trim()
  var lines: string[] = []
  lines.push('PROSPECT')
  lines.push('- Entreprise : ' + (p.name || '?'))
  if (p.category || p.type) lines.push('- Secteur : ' + (p.category || p.type))
  if (p.size || p.taille) lines.push('- Taille : ' + (p.size || p.taille))
  if (p.city || p.arrondissement) lines.push('- Localisation : ' + [p.arrondissement, p.city].filter(Boolean).join(' '))
  if (first || p.contactLastName) lines.push('- Contact : ' + [first, p.contactLastName].filter(Boolean).join(' ') + (p.contactRole ? ' (' + p.contactRole + ')' : ''))
  var notes = String(p.notes || p.pitch || '').trim()
  if (notes) lines.push('- Notes internes (contexte, ne pas citer telles quelles) : ' + notes.slice(0, 800))
  lines.push('')
  if (emailType === 'relance') {
    lines.push('TYPE : RELANCE (2e contact, pas de réponse au premier mail). Très court (60-90 mots). Chaleureux, jamais insistant, un angle nouveau (ex. un moment de leur calendrier), rappelle la proposition de dégustation.')
  } else if (emailType === 'devis_relance') {
    lines.push('TYPE : SUIVI DE DEVIS (un devis leur a été envoyé). Très court (60-90 mots). Demande si tout est clair, propose d’ajuster ou un appel de 5 min. Aucune pression.')
  } else {
    lines.push('TYPE : PREMIER CONTACT. 110-150 mots. Accroche sur leur univers, ce qu’on fait pour des équipes comme la leur, une référence pertinente, proposition concrète.')
  }
  return lines.join('\n')
}

function parseJson(text: string): any {
  var clean = String(text || '').replace(/```json|```/g, '').trim()
  var a = clean.indexOf('{')
  var b = clean.lastIndexOf('}')
  if (a >= 0 && b > a) {
    try { return JSON.parse(clean.slice(a, b + 1)) } catch (e) { /* fallback */ }
  }
  // Fallback : "Objet : ..." puis corps
  var m = clean.match(/^\s*Objet\s*:\s*(.+)\n([\s\S]*)$/i)
  if (m) return { subject: m[1].trim(), body: m[2].trim() }
  return { subject: '', body: clean }
}

export async function POST(request: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY manquante' }, { status: 500 })
  }
  var payload: any = {}
  try { payload = await request.json() } catch (e) {
    return NextResponse.json({ error: 'JSON invalide' }, { status: 400 })
  }

  try {
    // ---- Mode PITCH ----
    if (payload && payload.prospect) {
      var p = payload.prospect
      var emailType = String(payload.emailType || 'first')
      var senderKey = payload.senderKey === 'emy' ? 'emy' : 'edward'
      var raw = await callClaude(buildSystem(senderKey), buildPrompt(p, emailType), 1200)
      var out = parseJson(raw)
      var pressKeys = sanitizePressKeys(out.pressKeys)
      if (pressKeys.length === 0) pressKeys = defaultPressKeys(p.category || p.type)
      var bodyText = String(out.body || '').replace(/\\n/g, '\n').trim()
      return NextResponse.json({
        subject: String(out.subject || 'Meshuga Events × ' + (p.name || 'vos équipes')).trim(),
        body: bodyText,
        pressKeys: pressKeys,
        text: bodyText
      })
    }

    // ---- Mode LEGACY ----
    var prompt = payload && payload.prompt
    if (!prompt) return NextResponse.json({ error: 'prompt ou prospect requis' }, { status: 400 })
    var text = await callClaude(payload.systemPrompt || '', String(prompt), 1000)
    return NextResponse.json({ text: text })
  } catch (e: any) {
    return NextResponse.json({ error: e && e.message ? e.message : 'Erreur' }, { status: 500 })
  }
}
