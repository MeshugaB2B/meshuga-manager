// ============================================================
// FILE PATH dans le repo :
//   src/lib/hr/payslip-parse.ts
// ============================================================
// Briques de parsing des bulletins de paie Silae.
//   - parseHeader(text)  : lit l'en-tête machine-readable "dossier##TYPE##MM-AAAA##matricule##NOM##Prenom##siret"
//                          présent en haut de CHAQUE page (déterministe, gratuit).
//   - extractFieldsWithClaude(text) : extrait montants + compteurs de congés
//                          via Claude Haiku (le texte unpdf est aplati, donc
//                          le parsing positionnel des congés n'est pas fiable).
// ============================================================

import Anthropic from "@anthropic-ai/sdk"

var HDR_RE = /(\d+)##([A-Z]+)##(\d{2}-\d{4})##(\d+)##([^#\n]+)##([^#\n]+)##(\d+)/

export interface PayslipHeader {
  dossier: string
  doc_type: string          // BULLETIN | SOLDECPT | CERTIFTRA | ...
  periode_code: string      // "05-2026"
  periode_iso: string       // "2026-05-01"
  periode_label: string     // "Mai 2026"
  matricule: string
  nom: string               // tel qu'écrit dans l'en-tête (NOM de famille)
  prenom: string
  siret: string
}

var MOIS_FR = ["", "Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"]

export function parseHeader(text: string): PayslipHeader | null {
  var m = String(text || "").match(HDR_RE)
  if (!m) return null
  var mm = m[3].slice(0, 2)
  var yyyy = m[3].slice(3)
  return {
    dossier: m[1],
    doc_type: m[2],
    periode_code: m[3],
    periode_iso: yyyy + "-" + mm + "-01",
    periode_label: (MOIS_FR[parseInt(mm, 10)] || mm) + " " + yyyy,
    matricule: m[4],
    nom: m[5].trim(),
    prenom: m[6].trim(),
    siret: m[7],
  }
}

export interface PayslipFields {
  brut: number | null
  net_imposable: number | null
  net_paye: number | null
  cp_n1_acquis: number | null
  cp_n1_pris: number | null
  cp_n1_solde: number | null
  cp_n_acquis: number | null
  cp_n_pris: number | null
  cp_n_solde: number | null
  emploi: string | null
  statut: string | null
}

var EMPTY_FIELDS: PayslipFields = {
  brut: null, net_imposable: null, net_paye: null,
  cp_n1_acquis: null, cp_n1_pris: null, cp_n1_solde: null,
  cp_n_acquis: null, cp_n_pris: null, cp_n_solde: null,
  emploi: null, statut: null,
}

function toNum(v: any): number | null {
  if (v === null || v === undefined || v === "") return null
  if (typeof v === "number") return isFinite(v) ? v : null
  var s = String(v).replace(/\s/g, "").replace(",", ".").replace(/[^\d.\-]/g, "")
  if (s === "" || s === "-" || s === ".") return null
  var n = parseFloat(s)
  return isFinite(n) ? n : null
}

var PROMPT = [
  "Tu reçois le TEXTE BRUT d'un bulletin de paie français (logiciel Silae), extrait d'un PDF SANS mise en page : les colonnes sont aplaties et les valeurs chiffrées peuvent être regroupées en fin de texte. Lis attentivement.",
  "",
  "Extrais UNIQUEMENT les informations suivantes et renvoie un objet JSON STRICT, sans aucun texte autour, sans backticks :",
  "{",
  '  "brut": number|null,            // "Salaire brut" du mois (rémunération brute totale)',
  '  "net_imposable": number|null,   // Net imposable du mois (souvent la base du "Prélèvement à la source - PAS")',
  '  "net_paye": number|null,        // "Net payé" / "Net à payer" du mois (montant viré au salarié)',
  '  "cp_n1_acquis": number|null,    // Congés N-1 : jours Acquis',
  '  "cp_n1_pris": number|null,      // Congés N-1 : jours Pris',
  '  "cp_n1_solde": number|null,     // Congés N-1 : Solde',
  '  "cp_n_acquis": number|null,     // Congés N : jours Acquis',
  '  "cp_n_pris": number|null,       // Congés N : jours Pris',
  '  "cp_n_solde": number|null,      // Congés N : Solde',
  '  "emploi": string|null,          // libellé de l\'emploi (ex "Cuisinier")',
  '  "statut": string|null           // statut professionnel (ex "Employé")',
  "}",
  "",
  "Règles : nombres au format décimal avec un point (jamais d'espace ni de virgule, pas de symbole €). Si une valeur est absente ou la case vide, mets null. Le bloc congés est présenté en deux colonnes \"Congés N-1\" et \"Congés N\", chacune avec les lignes Acquis / Pris / Solde ; une case vide = null (n'invente jamais). Ne confonds pas les cumuls annuels avec les valeurs du mois : prends les valeurs MENSUELLES.",
].join("\n")

export async function extractFieldsWithClaude(text: string): Promise<PayslipFields> {
  var apiKey = process.env.ANTHROPIC_API_KEY || ""
  if (!apiKey) return Object.assign({}, EMPTY_FIELDS)
  var anthropic = new Anthropic({ apiKey: apiKey })

  var clipped = String(text || "").slice(0, 8000)
  var resp = await anthropic.messages.create({
    model: process.env.HR_PAYSLIP_MODEL || "claude-haiku-4-5",
    max_tokens: 600,
    messages: [{ role: "user", content: PROMPT + "\n\n=== TEXTE DU BULLETIN ===\n" + clipped }],
  })

  var raw = ""
  for (var i = 0; i < resp.content.length; i++) {
    var blk: any = resp.content[i]
    if (blk && blk.type === "text") raw += blk.text
  }
  raw = raw.replace(/```json/gi, "").replace(/```/g, "").trim()
  var jstart = raw.indexOf("{")
  var jend = raw.lastIndexOf("}")
  if (jstart >= 0 && jend > jstart) raw = raw.slice(jstart, jend + 1)

  var parsed: any = {}
  try { parsed = JSON.parse(raw) } catch (e) { parsed = {} }

  return {
    brut: toNum(parsed.brut),
    net_imposable: toNum(parsed.net_imposable),
    net_paye: toNum(parsed.net_paye),
    cp_n1_acquis: toNum(parsed.cp_n1_acquis),
    cp_n1_pris: toNum(parsed.cp_n1_pris),
    cp_n1_solde: toNum(parsed.cp_n1_solde),
    cp_n_acquis: toNum(parsed.cp_n_acquis),
    cp_n_pris: toNum(parsed.cp_n_pris),
    cp_n_solde: toNum(parsed.cp_n_solde),
    emploi: parsed.emploi ? String(parsed.emploi).slice(0, 80) : null,
    statut: parsed.statut ? String(parsed.statut).slice(0, 80) : null,
  }
}
