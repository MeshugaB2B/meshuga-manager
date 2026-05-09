// src/lib/hr/ocr-stoppage.ts
// Wrapper Claude Vision pour extraction d'un certificat médical d'arrêt de travail.
// Réutilise le pattern OCR existant de ocr.ts.

var DEFAULT_OCR_MODEL = process.env.HR_OCR_MODEL || 'claude-sonnet-4-5'

var ANTHROPIC_VISION_MIMES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']

async function convertHeicToJpeg(buffer: Buffer): Promise<Buffer> {
  var heicConvert: any = (await import('heic-convert')).default
  var jpegArrayBuffer = await heicConvert({
    buffer,
    format: 'JPEG',
    quality: 0.9,
  })
  return Buffer.from(jpegArrayBuffer)
}

export async function normalizeImageForVision(
  buffer: Buffer,
  mimeType: string
): Promise<{ base64: string; mimeType: string }> {
  var mime = (mimeType || '').toLowerCase()
  if (mime === 'image/heic' || mime === 'image/heif') {
    var jpegBuffer = await convertHeicToJpeg(buffer)
    return { base64: jpegBuffer.toString('base64'), mimeType: 'image/jpeg' }
  }
  if (ANTHROPIC_VISION_MIMES.indexOf(mime) >= 0) {
    return { base64: buffer.toString('base64'), mimeType: mime }
  }
  if (mime === 'image/jpg') {
    return { base64: buffer.toString('base64'), mimeType: 'image/jpeg' }
  }
  return { base64: buffer.toString('base64'), mimeType: 'image/jpeg' }
}

export type StoppageExtraction = {
  stoppage_type: 'arret_maladie' | 'accident_travail' | 'accident_trajet' | 'maladie_pro'
              | 'conge_maternite' | 'conge_paternite' | 'conge_adoption' | 'conge_parental' | 'autre' | null
  date_debut: string | null      // ISO yyyy-mm-dd
  date_fin: string | null        // ISO yyyy-mm-dd
  motif: string | null           // libre, court (ex: "Lombalgie aigüe")
  prescripteur: string | null    // nom du médecin / établissement
  is_prolongation: boolean
  meta: {
    confidence: 'high' | 'medium' | 'low'
    notes: string | null
  }
}

var STOPPAGE_PROMPT = `Tu es expert en droit du travail français. On te donne un certificat médical d'arrêt de travail (CERFA n°10170, ou autre format) ou un document de congé maternité/paternité d'un salarié de la SASU AEGIA FOOD (Meshuga, Paris). Le document peut être photographié, scanné ou en PDF.

Ta mission : extraire les informations de l'arrêt en JSON strict.

Types possibles :
- arret_maladie : arrêt maladie ordinaire
- accident_travail : accident du travail
- accident_trajet : accident de trajet (domicile-travail)
- maladie_pro : maladie professionnelle
- conge_maternite : congé maternité
- conge_paternite : congé paternité (y compris naissance)
- conge_adoption : congé adoption
- conge_parental : congé parental d'éducation
- autre : si rien ne correspond

Conventions :
- Toutes les dates en ISO yyyy-mm-dd
- date_debut : premier jour de l'arrêt (obligatoire)
- date_fin : dernier jour de l'arrêt (peut être null si non précisé)
- is_prolongation : true si le document mentionne explicitement "prolongation" d'un arrêt précédent
- motif : si visible, un résumé court de la pathologie. Sinon null. ATTENTION : ne JAMAIS inventer un motif. Si rien n'est mentionné ou si c'est secret médical, mets null
- prescripteur : nom du médecin OU nom de l'établissement de santé (ex: "Dr. Martin", "Hôpital Cochin")
- meta.confidence : "high" si tout lisible, "medium" si quelques doutes, "low" si plusieurs champs indéterminables
- meta.notes : signale en français ce qui est illisible ou douteux

IMPORTANT : ne jamais inventer. Si tu n'es pas sûr d'un champ → null.

Retourne UNIQUEMENT le JSON, sans markdown ni backticks.

Schéma exact :
{
  "stoppage_type": string | null,
  "date_debut": string | null,
  "date_fin": string | null,
  "motif": string | null,
  "prescripteur": string | null,
  "is_prolongation": boolean,
  "meta": {
    "confidence": "high" | "medium" | "low",
    "notes": string | null
  }
}`

export async function extractStoppageFromImages(
  pages: Array<{ buffer: Buffer; mimeType: string }>
): Promise<{ extraction: StoppageExtraction; rawText: string; model: string }> {
  if (!pages.length) throw new Error('No pages provided to OCR')

  var isPdfMode = pages.length === 1 && (pages[0].mimeType || '').toLowerCase() === 'application/pdf'
  var content: any[] = []

  if (isPdfMode) {
    content.push({
      type: 'text',
      text: 'Voici le PDF d\'un certificat d\'arrêt de travail à analyser :',
    })
    content.push({
      type: 'document',
      source: {
        type: 'base64',
        media_type: 'application/pdf',
        data: pages[0].buffer.toString('base64'),
      },
    })
    content.push({ type: 'text', text: STOPPAGE_PROMPT })
  } else {
    var normalized: Array<{ base64: string; mimeType: string }> = []
    for (var i = 0; i < pages.length; i++) {
      var page = pages[i]
      if ((page.mimeType || '').toLowerCase() === 'application/pdf') {
        throw new Error('Mix PDF + images non supporté.')
      }
      var norm = await normalizeImageForVision(page.buffer, page.mimeType)
      normalized.push(norm)
    }
    content.push({
      type: 'text',
      text: `Voici ${pages.length} page(s) d'un certificat d'arrêt de travail :`,
    })
    for (var j = 0; j < normalized.length; j++) {
      content.push({ type: 'text', text: `--- Page ${j + 1} / ${normalized.length} ---` })
      content.push({
        type: 'image',
        source: {
          type: 'base64',
          media_type: normalized[j].mimeType,
          data: normalized[j].base64,
        },
      })
    }
    content.push({ type: 'text', text: STOPPAGE_PROMPT })
  }

  var apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY missing in env')

  var res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: DEFAULT_OCR_MODEL,
      max_tokens: 1500,
      messages: [{ role: 'user', content }],
    }),
  })

  if (!res.ok) {
    var errBody = await res.text()
    throw new Error(`Anthropic API error ${res.status}: ${errBody.slice(0, 500)}`)
  }

  var data: any = await res.json()
  var text: string = data?.content?.[0]?.text?.trim() || ''
  if (!text) throw new Error('Empty response from Claude Vision')

  var cleaned = text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim()

  var extraction: StoppageExtraction
  try {
    extraction = JSON.parse(cleaned)
  } catch (e: any) {
    throw new Error(`OCR JSON parse failed: ${e.message}. Raw: ${cleaned.slice(0, 300)}`)
  }

  return { extraction, rawText: cleaned, model: DEFAULT_OCR_MODEL }
}
