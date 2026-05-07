// src/lib/hr/ocr.ts
// Wrapper Claude Vision pour OCR + extraction structurée d'un contrat de travail.
// Utilise fetch direct vers Anthropic API (cohérent avec /api/enrich-prospect).

// Modèle par défaut : Sonnet 4.5 (vision précise pour photos de qualité variable).
// Override possible via env var HR_OCR_MODEL.
var DEFAULT_OCR_MODEL = process.env.HR_OCR_MODEL || 'claude-sonnet-4-5'

// Mime types supportés par Anthropic Vision API
var ANTHROPIC_VISION_MIMES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']

// HEIC nécessite conversion server-side (Anthropic ne supporte pas HEIC).
async function convertHeicToJpeg(buffer: Buffer): Promise<Buffer> {
  // Import dynamique pour éviter de charger heic-convert si pas nécessaire
  var heicConvert: any = (await import('heic-convert')).default
  var jpegArrayBuffer = await heicConvert({
    buffer,
    format: 'JPEG',
    quality: 0.9,
  })
  return Buffer.from(jpegArrayBuffer)
}

// Normalise une image vers un format vision-compatible (jpeg/png/webp).
// Retourne base64 + mime normalisé.
export async function normalizeImageForVision(
  buffer: Buffer,
  mimeType: string
): Promise<{ base64: string; mimeType: string }> {
  var mime = (mimeType || '').toLowerCase()

  // HEIC / HEIF → conversion JPEG
  if (mime === 'image/heic' || mime === 'image/heif') {
    var jpegBuffer = await convertHeicToJpeg(buffer)
    return { base64: jpegBuffer.toString('base64'), mimeType: 'image/jpeg' }
  }

  // Format directement supporté
  if (ANTHROPIC_VISION_MIMES.indexOf(mime) >= 0) {
    return { base64: buffer.toString('base64'), mimeType: mime }
  }

  // image/jpg → image/jpeg (cas fréquent)
  if (mime === 'image/jpg') {
    return { base64: buffer.toString('base64'), mimeType: 'image/jpeg' }
  }

  // Fallback : on essaie en jpeg, sera rejeté par l'API si vraiment incompatible
  return { base64: buffer.toString('base64'), mimeType: 'image/jpeg' }
}

// Schéma d'extraction d'un contrat de travail français (CCN 1501 friendly)
export type ContractExtraction = {
  employee: {
    civilite: string | null
    prenom: string | null
    nom: string | null
    date_naissance: string | null // ISO yyyy-mm-dd
    lieu_naissance: string | null
    nationalite: string | null
    adresse: string | null
    code_postal: string | null
    ville: string | null
    num_secu: string | null
  }
  contract: {
    type: 'extra' | 'cdi_cuisinier' | 'cdi_caissier' | 'cdi_cadre' | null
    type_brut: string | null // ex: "CDI", "CDD", "CDD d'usage", "Extra"
    motif: string | null
    date_debut: string | null
    date_fin: string | null
    date_embauche: string | null
    fonction: string | null
    classification: string | null
    niveau_ccn: string | null
    echelon_ccn: string | null
    statut_cadre: 'cadre' | 'non-cadre' | 'agent_maitrise' | null
    taux_horaire_brut: number | null
    salaire_brut_mensuel: number | null
    heures_hebdo: number | null
    heures_mensuelles: number | null
    periode_essai_mois: number | null
    periode_essai_renouvelable: boolean | null
    clause_mobilite: boolean | null
    clause_mobilite_zone: string | null
    ville_signature: string | null
    date_signature: string | null
  }
  meta: {
    confidence: 'high' | 'medium' | 'low'
    notes: string | null // signaler illisibilité, doutes, écriture manuscrite, etc.
    detected_avenant: boolean // true si on dirait plus un avenant qu'un contrat initial
  }
}

var EXTRACTION_PROMPT = `Tu es expert en droit du travail français (CCN 1501 Restauration Rapide). On te donne les pages photographiées d'un contrat de travail (ou avenant) de la SASU AEGIA FOOD (Meshuga Crazy Deli, Paris 6e). Les photos peuvent être mal cadrées, floues, ou contenir de l'écriture manuscrite.

Ta mission : extraire les informations en JSON strict. Pour chaque champ, si tu n'es pas sûr ou que l'info est absente, mets null. Ne jamais inventer.

Conventions de sortie :
- Toutes les dates en ISO yyyy-mm-dd
- Salaire et taux horaire en numérique (pas de "€" ni espace ; virgule → point décimal)
- Heures hebdo : nombre (35, 39, 24...)
- type : choisis parmi extra | cdi_cuisinier | cdi_caissier | cdi_cadre selon le poste indiqué. Si CDI cadre → cdi_cadre. Si CDI sur poste cuisine → cdi_cuisinier. Si CDI sur poste caisse/vente → cdi_caissier. Si CDD d'usage / extra / mission ponctuelle → extra. Si tu ne peux pas trancher → null
- type_brut : ce qui est ÉCRIT sur le document (ex: "CDI", "CDD d'usage", "Contrat à durée déterminée d'usage")
- statut_cadre : "cadre" | "non-cadre" | "agent_maitrise" | null
- meta.detected_avenant : true si le titre/préambule mentionne "avenant", "modification", "renouvellement"
- meta.confidence : "high" si tout est lisible, "medium" si quelques doutes, "low" si plusieurs champs indéterminables
- meta.notes : signale en français ce qui est illisible ou douteux (ex: "Date de signature illisible page 2", "Écriture manuscrite difficile sur le salaire")

Retourne UNIQUEMENT le JSON, sans markdown ni backticks.

Schéma exact :
{
  "employee": {
    "civilite": "Monsieur" | "Madame" | "Mademoiselle" | null,
    "prenom": string | null,
    "nom": string | null,
    "date_naissance": string | null,
    "lieu_naissance": string | null,
    "nationalite": string | null,
    "adresse": string | null,
    "code_postal": string | null,
    "ville": string | null,
    "num_secu": string | null
  },
  "contract": {
    "type": string | null,
    "type_brut": string | null,
    "motif": string | null,
    "date_debut": string | null,
    "date_fin": string | null,
    "date_embauche": string | null,
    "fonction": string | null,
    "classification": string | null,
    "niveau_ccn": string | null,
    "echelon_ccn": string | null,
    "statut_cadre": string | null,
    "taux_horaire_brut": number | null,
    "salaire_brut_mensuel": number | null,
    "heures_hebdo": number | null,
    "heures_mensuelles": number | null,
    "periode_essai_mois": number | null,
    "periode_essai_renouvelable": boolean | null,
    "clause_mobilite": boolean | null,
    "clause_mobilite_zone": string | null,
    "ville_signature": string | null,
    "date_signature": string | null
  },
  "meta": {
    "confidence": "high" | "medium" | "low",
    "notes": string | null,
    "detected_avenant": boolean
  }
}`

// Appel principal : prend N images en buffer + mime, retourne l'extraction structurée.
// Accepte aussi un PDF unique (mime application/pdf) — Anthropic API supporte
// les PDFs en input via type:'document' (nativement, sans rasterisation).
export async function extractContractFromImages(
  pages: Array<{ buffer: Buffer; mimeType: string }>
): Promise<{ extraction: ContractExtraction; rawText: string; model: string }> {
  if (!pages.length) throw new Error('No pages provided to OCR')

  // Détection mode PDF (un seul fichier PDF)
  var isPdfMode = pages.length === 1 && (pages[0].mimeType || '').toLowerCase() === 'application/pdf'

  // Construire le content array pour l'API
  var content: any[] = []

  if (isPdfMode) {
    var pdfBase64 = pages[0].buffer.toString('base64')
    content.push({
      type: 'text',
      text: 'Voici le PDF complet d\'un contrat de travail à analyser :',
    })
    content.push({
      type: 'document',
      source: {
        type: 'base64',
        media_type: 'application/pdf',
        data: pdfBase64,
      },
    })
    content.push({ type: 'text', text: EXTRACTION_PROMPT })
  } else {
    // Mode photos : normaliser chaque image (HEIC → JPEG si nécessaire)
    var normalized: Array<{ base64: string; mimeType: string }> = []
    for (var i = 0; i < pages.length; i++) {
      var page = pages[i]
      // Si l'utilisateur a glissé un PDF dans une liste d'images, on refuse explicitement
      if ((page.mimeType || '').toLowerCase() === 'application/pdf') {
        throw new Error('Mix PDF + images non supporté. Envoyez soit UN PDF, soit des images.')
      }
      var norm = await normalizeImageForVision(page.buffer, page.mimeType)
      normalized.push(norm)
    }
    content.push({
      type: 'text',
      text: `Voici ${pages.length} page(s) d'un contrat de travail à analyser. Pages dans l'ordre :`,
    })
    for (var j = 0; j < normalized.length; j++) {
      content.push({
        type: 'text',
        text: `--- Page ${j + 1} / ${normalized.length} ---`,
      })
      content.push({
        type: 'image',
        source: {
          type: 'base64',
          media_type: normalized[j].mimeType,
          data: normalized[j].base64,
        },
      })
    }
    content.push({ type: 'text', text: EXTRACTION_PROMPT })
  }

  // Appel API
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
      max_tokens: 2000,
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

  // Nettoyer markdown éventuel
  var cleaned = text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim()

  var extraction: ContractExtraction
  try {
    extraction = JSON.parse(cleaned)
  } catch (e: any) {
    throw new Error(`OCR JSON parse failed: ${e.message}. Raw: ${cleaned.slice(0, 300)}`)
  }

  return { extraction, rawText: cleaned, model: DEFAULT_OCR_MODEL }
}
