// ============================================================
// src/app/api/generate-email/route.ts
// ============================================================
// Modes :
//  - PITCH EMAIL : body = { prospect, emailType, senderKey, attachPlaquette? }
//      → { subject, body, pressKeys, sector }
//  - LINKEDIN    : body = { prospect, emailType: 'linkedin_invite' | 'linkedin_inmail'
//                   | 'linkedin_message', senderKey } → { subject, body, sector }
//  - LEGACY      : body = { prompt, systemPrompt? } → { text }
//
// Toute la logique (playbooks sectoriels, prompts) est dans
// src/lib/prospectEmailAI.ts — partagée avec le cron des relances auto.
// ============================================================

import { NextResponse } from 'next/server'
import { generateProspectEmail, generateLinkedinMessage } from '@/lib/prospectEmailAI'

export const maxDuration = 30

var MODEL = 'claude-sonnet-4-6'

async function callLegacy(system: string, prompt: string) {
  var body: any = { model: MODEL, max_tokens: 1000, messages: [{ role: 'user', content: prompt }] }
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

export async function POST(request: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY manquante' }, { status: 500 })
  }
  var payload: any = {}
  try { payload = await request.json() } catch (e) {
    return NextResponse.json({ error: 'JSON invalide' }, { status: 400 })
  }

  try {
    if (payload && payload.prospect) {
      var emailType = String(payload.emailType || 'first')
      var senderKey = payload.senderKey === 'emy' ? 'emy' : 'edward'

      // ---- LinkedIn ----
      if (emailType.indexOf('linkedin_') === 0) {
        var li = await generateLinkedinMessage({ prospect: payload.prospect, kind: emailType, senderKey: senderKey })
        return NextResponse.json({ subject: li.subject, body: li.body, sector: li.sector, text: li.body })
      }

      // ---- Email ----
      var out = await generateProspectEmail({
        prospect: payload.prospect,
        emailType: emailType,
        senderKey: senderKey,
        attachPlaquette: payload.attachPlaquette !== false
      })
      return NextResponse.json({
        subject: out.subject,
        body: out.body,
        pressKeys: out.pressKeys,
        sector: out.sector,
        text: out.body
      })
    }

    // ---- Mode LEGACY ----
    var prompt = payload && payload.prompt
    if (!prompt) return NextResponse.json({ error: 'prompt ou prospect requis' }, { status: 400 })
    var text = await callLegacy(payload.systemPrompt || '', String(prompt))
    return NextResponse.json({ text: text })
  } catch (e: any) {
    return NextResponse.json({ error: e && e.message ? e.message : 'Erreur' }, { status: 500 })
  }
}
