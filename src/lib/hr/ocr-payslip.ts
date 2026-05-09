// src/lib/hr/ocr-payslip.ts
// OCR Claude Vision pour extraction de fiches de paie françaises.
// Permet de reconstituer les conditions contractuelles d'un salarié quand
// on n'a plus que ses fiches de paie (cas régularisation).
// Réutilise le pattern OCR existant.

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

export type PayslipExtraction = {
  // Période concernée par cette fiche
  period_start: string | null   // ISO yyyy-mm-dd (1er jour du mois de paie)
  period_end: string | null     // ISO yyyy-mm-dd (dernier jour du mois)
  period_label: string | null   // ex: "Mars 2024"

  // Employeur (vérification)
  employer_name: string | null

  // Identité salarié (mêmes champs que ocr.ts pour cohérence)
  employee: {
    civilite: string | null
    prenom: string | null
    nom: string | null
    date_naissance: string | null
    lieu_naissance: string | null
    nationalite: string | null
    adresse: string | null
    code_postal: string | null
    ville: string | null
    num_secu: string | null
  }

  // Conditions contractuelles visibles sur la fiche de paie
  contract: {
    date_entree: string | null         // CRUCIAL : "Date d'entrée" / "Ancienneté depuis"
    fonction: string | null            // emploi
    statut_cadre: string | null        // 'cadre' | 'non-cadre' | 'agent_maitrise'
    type_brut: string | null           // CDI / CDD / mention CCN
    niveau_ccn: string | null
    echelon_ccn: string | null
    classification: string | null      // libellé brut
    coefficient_ccn: string | null
    salaire_brut_mensuel: number | null
    taux_horaire_brut: number | null
    heures_mensuelles: number | null   // ex: 151.67 pour 35h
    heures_hebdo: number | null
  }

  meta: {
    confidence: 'high' | 'medium' | 'low'
    notes: string | null
  }
}

var PAYSLIP_PROMPT = `Tu es expert en paie française. On te donne une fiche de paie (bulletin de salaire) photographiée ou en PDF d'un salarié de la SASU AEGIA FOOD (Meshuga Crazy Deli, Paris 6e). Mission : extraire de manière exhaustive l'identité du salarié, la période de la fiche, et toutes les conditions contractuelles visibles, en JSON strict.

INFORMATIONS À EXTRAIRE :

1. **Période** : period_start = 1er jour du mois de paie, period_end = dernier jour. period_label = libellé (ex: "Mars 2024").

2. **Identité salarié** : tous les champs employee.

3. **Conditions contractuelles** — ATTENTION, c'est crucial pour reconstituer :
   - **date_entree** : cherche les libellés "Date d'entrée", "Ancienneté depuis", "Date d'embauche", "Entrée", "Date d'entrée dans l'entreprise". C'est l'info la plus importante pour ce cas d'usage. Si tu vois plusieurs dates (ex: "ancienneté 5 ans" + "date entrée"), prends la date d'entrée explicite.
   - **fonction** : emploi/poste/métier
   - **statut_cadre** : "cadre" | "non-cadre" | "agent_maitrise" — STRICTEMENT ces 3 valeurs, mapping :
     * "Employé", "Ouvrier", "Niveau I/II/III", "Non cadre" → "non-cadre"
     * "Agent de maîtrise", "Niveau IV" → "agent_maitrise"
     * "Cadre", "Niveau V/VI/VII" → "cadre"
     * Pas tranchable → null
   - **type_brut** : ce qui est écrit ("CDI", "CDD", "CDD d'usage")
   - **niveau_ccn** : niveau de la grille CCN (I, II, III, IV, V...)
   - **echelon_ccn** : échelon (A, B, C ou 1, 2, 3...)
   - **classification** : libellé complet brut
   - **coefficient_ccn** : si présent (ex: 165, 170...)
   - **salaire_brut_mensuel** : salaire de base mensuel brut, en numérique (pas de "€", virgule → point). Ne PAS prendre le total brut payé du mois (qui inclut HS, primes), prends bien la "Rémunération de base" / "Salaire de base"
   - **taux_horaire_brut** : taux horaire brut si visible
   - **heures_mensuelles** : nombre d'heures mensuelles contractuelles (ex: 151.67 pour 35h, 169 pour 39h)
   - **heures_hebdo** : si écrit, sinon laisse null

4. **employer_name** : nom de l'employeur (vérification que c'est bien AEGIA FOOD)

CONVENTIONS :
- Toutes les dates en ISO yyyy-mm-dd. ATTENTION CRITIQUE : sur les fiches de paie françaises, les dates sont écrites au format jour/mois/année (ex: "19/05/1952" = 19 mai 1952). Tu DOIS convertir en yyyy-mm-dd avec mois en position centrale (ex: "1952-05-19", PAS "1952-19-05"). Le mois est TOUJOURS entre 01 et 12 ; le jour est entre 01 et 31. Si tu produis une date dont le 2ème segment dépasse 12, c'est que tu as fait une erreur d'inversion : refais-la.
- Salaires/taux en numérique (pas de "€" ni espace, virgule → point)
- meta.confidence : "high" si tout lisible, "medium" si quelques doutes, "low" si plusieurs champs indéterminables
- meta.notes : signale en français ce qui est illisible ou douteux

IMPORTANT : ne jamais inventer. Si pas sûr → null.

Retourne UNIQUEMENT le JSON, sans markdown ni backticks.

Schéma exact :
{
  "period_start": string | null,
  "period_end": string | null,
  "period_label": string | null,
  "employer_name": string | null,
  "employee": {
    "civilite": string | null,
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
    "date_entree": string | null,
    "fonction": string | null,
    "statut_cadre": string | null,
    "type_brut": string | null,
    "niveau_ccn": string | null,
    "echelon_ccn": string | null,
    "classification": string | null,
    "coefficient_ccn": string | null,
    "salaire_brut_mensuel": number | null,
    "taux_horaire_brut": number | null,
    "heures_mensuelles": number | null,
    "heures_hebdo": number | null
  },
  "meta": {
    "confidence": "high" | "medium" | "low",
    "notes": string | null
  }
}`

export async function extractPayslipFromImages(
  pages: Array<{ buffer: Buffer; mimeType: string }>
): Promise<{ extraction: PayslipExtraction; rawText: string; model: string }> {
  if (!pages.length) throw new Error('No pages provided to OCR')

  var isPdfMode = pages.length === 1 && (pages[0].mimeType || '').toLowerCase() === 'application/pdf'
  var content: any[] = []

  if (isPdfMode) {
    content.push({
      type: 'text',
      text: 'Voici une fiche de paie française à analyser :',
    })
    content.push({
      type: 'document',
      source: {
        type: 'base64',
        media_type: 'application/pdf',
        data: pages[0].buffer.toString('base64'),
      },
    })
    content.push({ type: 'text', text: PAYSLIP_PROMPT })
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
      text: `Voici ${pages.length} page(s) d'une fiche de paie française :`,
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
    content.push({ type: 'text', text: PAYSLIP_PROMPT })
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

  var cleaned = text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim()

  var extraction: PayslipExtraction
  try {
    extraction = JSON.parse(cleaned)
  } catch (e: any) {
    throw new Error(`OCR JSON parse failed: ${e.message}. Raw: ${cleaned.slice(0, 300)}`)
  }

  return { extraction, rawText: cleaned, model: DEFAULT_OCR_MODEL }
}
