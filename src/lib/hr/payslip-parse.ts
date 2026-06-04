// ============================================================
// FILE PATH dans le repo :
//   src/lib/hr/payslip-parse.ts
// ============================================================
// Parsing déterministe des bulletins Silae (aucune dépendance externe).
//   - parseHeader(text)                : en-tête machine-readable "##".
//   - extractFields(fluxText, layout)  : montants depuis le texte "flux"
//       (libellés inline fiables) + compteurs de congés depuis les LIGNES
//       reconstruites par coordonnées (grille Acquis/Pris/Solde alignée).
//   - layoutLinesFromItems(items)      : reconstruit les lignes alignées.
// Le wizard permet de corriger à la main les rares valeurs non lues.
// ============================================================

var HDR_RE = /(\d+)##([A-Z]+)##(\d{2}-\d{4})##(\d+)##([^#\n]+)##([^#\n]+)##(\d+)/

export interface PayslipHeader {
  dossier: string
  doc_type: string
  periode_code: string
  periode_iso: string
  periode_label: string
  matricule: string
  nom: string
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

function toNum(s: any): number | null {
  if (s === null || s === undefined) return null
  var v = String(s).replace(/\s/g, "").replace(",", ".")
  if (!/-?\d/.test(v)) return null
  var n = parseFloat(v)
  return isFinite(n) ? n : null
}

function firstMatch(text: string, re: RegExp): number | null {
  var m = String(text || "").match(re)
  return m ? toNum(m[1]) : null
}

function numsIn(s: string): number[] {
  var m = String(s || "").match(/\d{1,3}(?: \d{3})*(?:\.\d+)?|\d+\.\d+/g)
  if (!m) return []
  var out: number[] = []
  for (var i = 0; i < m.length; i++) { var n = toNum(m[i]); if (n !== null) out.push(n) }
  return out
}

function congeRow(layout: string[], label: string): [number | null, number | null] {
  var start = 0
  for (var i = 0; i < layout.length; i++) {
    var L = layout[i]
    if (L.indexOf("Cong") >= 0 && L.indexOf("N-1") >= 0) { start = i; break }
  }
  for (var j = start; j < layout.length; j++) {
    var t = layout[j].trim()
    if (t.indexOf(label) === 0) {
      var ns = numsIn(t.slice(label.length))
      return [ns.length >= 1 ? ns[0] : null, ns.length >= 2 ? ns[1] : null]
    }
  }
  return [null, null]
}

export function extractFields(fluxText: string, layout: string[]): PayslipFields {
  var f = fluxText || ""
  var lay = Array.isArray(layout) ? layout : []

  var brut = firstMatch(f, /Salaire brut\s+([\d ]+[.,]\d{2})/)
  var net_paye = firstMatch(f, /Net pay[ée]\s*:\s*([\d ]+[.,]\d{2})\s*euros/i)
  if (net_paye === null) net_paye = firstMatch(f, /Net pay[ée]\s+([\d ]+[.,]\d{2})/i)
  if (net_paye === null) net_paye = firstMatch(f, /Net à payer[^\d]*([\d ]+[.,]\d{2})/i)
  var net_imposable = firstMatch(f, /-\s*PAS\s+([\d ]+[.,]\d{2})/)
  if (net_imposable === null) net_imposable = firstMatch(f, /source\s*-\s*PAS\s+([\d ]+[.,]\d{2})/)

  var acq = congeRow(lay, "Acquis")
  var pri = congeRow(lay, "Pris")
  var sol = congeRow(lay, "Solde")

  var emploi: string | null = null
  var me = f.match(/Emploi\s*:?\s*\n?\s*([A-Za-zÀ-ÿ' \-]{3,40})/)
  if (me) emploi = me[1].trim().split("\n")[0].slice(0, 60)

  return {
    brut: brut,
    net_imposable: net_imposable,
    net_paye: net_paye,
    cp_n1_acquis: acq[0], cp_n1_pris: pri[0], cp_n1_solde: sol[0],
    cp_n_acquis: acq[1], cp_n_pris: pri[1], cp_n_solde: sol[1],
    emploi: emploi,
    statut: null,
  }
}

export function layoutLinesFromItems(items: any[]): string[] {
  var rows: any = {}
  for (var i = 0; i < items.length; i++) {
    var it = items[i]
    if (!it || !it.str || !String(it.str).trim()) continue
    var y = Math.round(it.transform[5])
    if (!rows[y]) rows[y] = []
    rows[y].push({ x: it.transform[4], s: it.str })
  }
  var ys = Object.keys(rows).map(Number).sort(function (a, b) { return b - a })
  var lines: string[] = []
  for (var k = 0; k < ys.length; k++) {
    var arr = rows[ys[k]].sort(function (a: any, b: any) { return a.x - b.x })
    lines.push(arr.map(function (o: any) { return o.s }).join("  "))
  }
  return lines
}
