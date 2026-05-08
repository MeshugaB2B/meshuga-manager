// src/lib/hr/ocr.ts
// Wrapper Claude Vision pour OCR + extraction structurée d'un document RH.
// Détecte automatiquement le type de doc (contrat initial, avenant, fiche paie,
// solde de tout compte, etc.) et extrait toutes les informations utiles.
// Utilise fetch direct vers Anthropic API (cohérent avec /api/enrich-prospect).

// Modèle par défaut : Sonnet 4.5 (vision précise pour photos de qualité variable
// et support PDF natif). Override possible via env var HR_OCR_MODEL.
var DEFAULT_OCR_MODEL = process.env.HR_OCR_MODEL || 'claude-sonnet-4-5'

// Mime types supportés par Anthropic Vision API
var ANTHROPIC_VISION_MIMES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']

// HEIC nécessite conversion server-side (Anthropic ne supporte pas HEIC).
async function convertHeicToJpeg(buffer: Buffer): Promise<Buffer> {
  var heicConvert: any = (await import('heic-convert')).default
  var jpegArrayBuffer = await heicConvert({
    buffer,
    format: 'JPEG',
    quality: 0.9,
  })
  return Buffer.from(jpegArrayBuffer)
}

// Normalise une image vers un format vision-compatible (jpeg/png/webp).
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

// Schéma d'extraction unifié — tous les types de docs RH
export type DocumentExtraction = {
  // Type de document détecté (input pour le frontend)
  doc_type: 'contrat_initial' | 'avenant' | 'fiche_paie' | 'solde_tout_compte'
          | 'certificat_travail' | 'attestation_france_travail' | 'lettre_demission'
          | 'lettre_licenciement' | 'rupture_conv' | 'dossier_bienvenue' | 'autre' | null
  doc_type_label: string | null  // libellé en français pour affichage

  // Période concernée (pour fiche de paie)
  period_month: string | null  // format YYYY-MM (ex "2024-03")

  // Infos employé (extraites depuis n'importe quel doc)
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
    email: string | null
    telephone: string | null
  }

  // Infos contrat (uniquement si contrat_initial ou avenant)
  contract: {
    type: 'extra' | 'cdi_cuisinier' | 'cdi_caissier' | 'cdi_cadre' | null
    type_brut: string | null
    motif: string | null
    date_debut: string | null
    date_fin: string | null
    date_embauche: string | null
    fonction: string | null
    classification: string | null
    niveau_ccn: string | null
    echelon_ccn: string | null
    statut_cadre: string | null
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

  // Infos sortie (pour solde de tout compte / certificat travail / lettre démission/licenciement)
  exit_info: {
    date_sortie: string | null
    motif_sortie: string | null  // demission | licenciement | rupture_conv | fin_cdd | rupture_periode_essai | retraite | autre
  }

  // Métadonnées sur la qualité de l'extraction
  meta: {
    confidence: 'high' | 'medium' | 'low'
    notes: string | null
    detected_avenant: boolean
  }
}

var EXTRACTION_PROMPT = `Tu es expert en droit du travail français (CCN 1501 Restauration Rapide). On te donne un document RH photographié ou en PDF de la SASU AEGIA FOOD (Meshuga Crazy Deli, Paris 6e). Les photos peuvent être mal cadrées, floues, ou contenir de l'écriture manuscrite.

Ta mission : (1) IDENTIFIER LE TYPE DE DOCUMENT, (2) EXTRAIRE LES INFOS UTILES.

Types possibles :
- contrat_initial : premier contrat de travail (CDI, CDD, CDD d'usage / extra)
- avenant : modification d'un contrat existant (mots clés : "avenant", "modification du contrat", "renouvellement")
- fiche_paie : bulletin de paie / fiche de salaire d'un mois donné
- solde_tout_compte : reçu pour solde de tout compte (fin de contrat avec montants)
- certificat_travail : certificat de travail délivré en fin de contrat
- attestation_france_travail : attestation France Travail / Pôle Emploi (assurance chômage)
- lettre_demission : lettre de démission du salarié
- lettre_licenciement : lettre de licenciement de l'employeur
- rupture_conv : convention de rupture conventionnelle
- dossier_bienvenue : dossier de bienvenue / livret d'accueil signé
- autre : si rien ne correspond

Pour chaque type, extrais ce qui est pertinent :
- contrat_initial / avenant : tous les champs employee + tous les champs contract
- fiche_paie : champs employee + period_month (YYYY-MM)
- solde_tout_compte / certificat_travail / attestation_france_travail / lettre_demission / lettre_licenciement / rupture_conv : champs employee + exit_info (date_sortie + motif_sortie)

Conventions de sortie :
- Toutes les dates en ISO yyyy-mm-dd
- Salaire et taux horaire en numérique (pas de "€" ni espace ; virgule → point décimal)
- Heures hebdo : nombre (35, 39, 24...)
- contract.type : extra | cdi_cuisinier | cdi_caissier | cdi_cadre selon poste. Si CDI cadre → cdi_cadre. Si CDI cuisine → cdi_cuisinier. Si CDI caisse/vente → cdi_caissier. Si CDD/extra/mission → extra. Si pas tranchable → null
- contract.type_brut : ce qui est ÉCRIT (ex: "CDI", "CDD d'usage", "Contrat à durée déterminée")
- exit_info.motif_sortie : demission | licenciement | rupture_conv | fin_cdd | rupture_periode_essai | retraite | abandon_poste | autre
- meta.detected_avenant : true si le titre/préambule mentionne "avenant"
- meta.confidence : "high" si tout lisible, "medium" si quelques doutes, "low" si plusieurs champs indéterminables
- meta.notes : signale en français ce qui est illisible (ex: "Date de signature illisible", "Écriture manuscrite difficile sur le salaire")

IMPORTANT : ne jamais inventer. Si tu n'es pas sûr d'un champ → null.

Retourne UNIQUEMENT le JSON, sans markdown ni backticks. Tous les champs doivent être présents dans la sortie (mets null si non applicable).

Schéma exact :
{
  "doc_type": string | null,
  "doc_type_label": string | null,
  "period_month": string | null,
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
    "num_secu": string | null,
    "email": string | null,
    "telephone": string | null
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
  "exit_info": {
    "date_sortie": string | null,
    "motif_sortie": string | null
  },
  "meta": {
    "confidence": "high" | "medium" | "low",
    "notes": string | null,
    "detected_avenant": boolean
  }
}`

// Appel principal — accepte photos OU PDF unique
export async function extractContractFromImages(
  pages: Array<{ buffer: Buffer; mimeType: string }>
): Promise<{ extraction: DocumentExtraction; rawText: string; model: string }> {
  if (!pages.length) throw new Error('No pages provided to OCR')

  var isPdfMode = pages.length === 1 && (pages[0].mimeType || '').toLowerCase() === 'application/pdf'

  var content: any[] = []

  if (isPdfMode) {
    var pdfBase64 = pages[0].buffer.toString('base64')
    content.push({
      type: 'text',
      text: 'Voici le PDF complet d\'un document RH à analyser :',
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
    var normalized: Array<{ base64: string; mimeType: string }> = []
    for (var i = 0; i < pages.length; i++) {
      var page = pages[i]
      if ((page.mimeType || '').toLowerCase() === 'application/pdf') {
        throw new Error('Mix PDF + images non supporté. Envoyez soit UN PDF, soit des images.')
      }
      var norm = await normalizeImageForVision(page.buffer, page.mimeType)
      normalized.push(norm)
    }
    content.push({
      type: 'text',
      text: `Voici ${pages.length} page(s) d'un document RH à analyser. Pages dans l'ordre :`,
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
      max_tokens: 3000,
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

  var extraction: DocumentExtraction
  try {
    extraction = JSON.parse(cleaned)
  } catch (e: any) {
    throw new Error(`OCR JSON parse failed: ${e.message}. Raw: ${cleaned.slice(0, 300)}`)
  }

  return { extraction, rawText: cleaned, model: DEFAULT_OCR_MODEL }
}
