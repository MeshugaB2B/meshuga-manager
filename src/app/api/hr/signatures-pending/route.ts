// ============================================================
// /api/hr/signatures-pending/route.ts
// ============================================================
// GET endpoint : retourne la liste des signatures en attente
// (avenants + contrats avec status sent ou viewed, non signés).
//
// Utilisé par SignaturesPendingWidget.tsx pour le polling 60s.
// ============================================================

import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

function getServerClient() {
  var url = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
  var key = process.env.SUPABASE_SERVICE_ROLE_KEY || ""
  if (!url || !key) return null
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

function getAmendmentTypeLabel(amendmentType: string): string {
  var t = (amendmentType || "").toLowerCase()
  if (t === "regularisation_welcome_pack") return "Avenant d'actualisation contractuelle"
  if (t === "augmentation_salaire") return "Avenant — Modification de la rémunération"
  if (t === "modification_horaires") return "Avenant — Modification des horaires"
  if (t === "changement_poste") return "Avenant — Changement de poste"
  if (t === "prolongation_duree") return "Avenant — Prolongation de la durée"
  return "Avenant au contrat de travail"
}

function getContractTypeLabel(type: string, statutCadre: string, isFemale: boolean): string {
  var t = (type || "").toLowerCase()
  if (t === "extra") return "Contrat de travail (CDD d'usage)"
  if (t === "cdi_cadre") {
    return statutCadre === "cadre"
      ? "Contrat de travail CDI Cadre"
      : "Contrat de travail CDI Agent de maîtrise"
  }
  if (t === "cdi_cuisinier") {
    return isFemale ? "Contrat de travail CDI Cuisinière" : "Contrat de travail CDI Cuisinier"
  }
  if (t === "cdi_caissier") {
    return isFemale ? "Contrat de travail CDI Caissière" : "Contrat de travail CDI Caissier"
  }
  return "Contrat de travail"
}

function daysSince(isoDate: string): number {
  var sent = new Date(isoDate).getTime()
  return Math.floor((Date.now() - sent) / (1000 * 60 * 60 * 24))
}

export async function GET() {
  var supabase = getServerClient()
  if (!supabase) {
    return NextResponse.json({ ok: false, error: "Configuration serveur manquante" }, { status: 500 })
  }

  var items: any[] = []

  // === Avenants ===
  var resA = await supabase
    .from("hr_contract_amendments")
    .select(
      "id, contract_id, amendment_type, signature_status, signature_token, " +
      "signature_sent_at, signature_viewed_at, signed_at, " +
      "signature_recipient_email, signature_recipient_phone, signature_channel, " +
      "signature_relance_count, signature_last_relance_at"
    )
    .in("signature_status", ["sent", "viewed"])
    .is("signed_at", null)
    .not("signature_sent_at", "is", null)
    .order("signature_sent_at", { ascending: true })

  if (resA.data) {
    for (var i = 0; i < resA.data.length; i++) {
      var a: any = resA.data[i]
      // Résoudre employé
      var emp = await resolveEmployee(supabase, a.contract_id)
      items.push({
        id: a.id,
        kind: "amendment",
        documentLabel: getAmendmentTypeLabel(a.amendment_type || ""),
        prenom: emp ? emp.prenom : "",
        nom: emp ? emp.nom : "",
        sentAt: a.signature_sent_at,
        viewedAt: a.signature_viewed_at,
        channel: a.signature_channel || "email",
        email: a.signature_recipient_email,
        phone: a.signature_recipient_phone,
        relanceCount: a.signature_relance_count || 0,
        lastRelanceAt: a.signature_last_relance_at,
        daysSinceSent: daysSince(a.signature_sent_at),
        signatureToken: a.signature_token,
      })
    }
  }

  // === Contrats ===
  var resC = await supabase
    .from("hr_contracts")
    .select(
      "id, employee_id, cycle_id, type, statut_cadre, signature_status, signature_token, " +
      "signature_sent_at, signature_viewed_at, signature_signed_at, " +
      "signature_recipient_email, signature_recipient_phone, signature_channel, " +
      "signature_relance_count, signature_last_relance_at"
    )
    .in("signature_status", ["sent", "viewed"])
    .is("signature_signed_at", null)
    .not("signature_sent_at", "is", null)
    .order("signature_sent_at", { ascending: true })

  if (resC.data) {
    for (var j = 0; j < resC.data.length; j++) {
      var c: any = resC.data[j]
      var empId = c.employee_id
      if (!empId && c.cycle_id) {
        var resCyc = await supabase
          .from("hr_employment_cycles")
          .select("employee_id")
          .eq("id", c.cycle_id)
          .maybeSingle()
        empId = (resCyc.data && resCyc.data.employee_id) || null
      }
      var emp = empId ? await fetchEmployee(supabase, empId) : null
      var civ = emp ? (emp.civilite || "").toLowerCase() : ""
      var isFemale = civ === "mme" || civ === "madame"
      items.push({
        id: c.id,
        kind: "contract",
        documentLabel: getContractTypeLabel(c.type || "", c.statut_cadre || "", isFemale),
        prenom: emp ? emp.prenom : "",
        nom: emp ? emp.nom : "",
        sentAt: c.signature_sent_at,
        viewedAt: c.signature_viewed_at,
        channel: c.signature_channel || "email",
        email: c.signature_recipient_email,
        phone: c.signature_recipient_phone,
        relanceCount: c.signature_relance_count || 0,
        lastRelanceAt: c.signature_last_relance_at,
        daysSinceSent: daysSince(c.signature_sent_at),
        signatureToken: c.signature_token,
      })
    }
  }

  // Trier par date d'envoi (plus ancien d'abord = plus urgent)
  items.sort(function (a: any, b: any) {
    return new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime()
  })

  return NextResponse.json({ ok: true, items: items, count: items.length })
}

async function resolveEmployee(
  supabase: any,
  contractId: string | null
): Promise<{ prenom: string; nom: string; civilite: string | null } | null> {
  if (!contractId) return null
  var resC = await supabase
    .from("hr_contracts")
    .select("employee_id, cycle_id")
    .eq("id", contractId)
    .maybeSingle()
  if (!resC.data) return null
  var empId: string | null = resC.data.employee_id || null
  if (!empId && resC.data.cycle_id) {
    var resCyc = await supabase
      .from("hr_employment_cycles")
      .select("employee_id")
      .eq("id", resC.data.cycle_id)
      .maybeSingle()
    empId = (resCyc.data && resCyc.data.employee_id) || null
  }
  if (!empId) return null
  return await fetchEmployee(supabase, empId)
}

async function fetchEmployee(
  supabase: any,
  empId: string
): Promise<{ prenom: string; nom: string; civilite: string | null } | null> {
  var resE = await supabase
    .from("hr_employees")
    .select("prenom, nom, civilite")
    .eq("id", empId)
    .maybeSingle()
  if (!resE.data) return null
  return {
    prenom: resE.data.prenom || "",
    nom: resE.data.nom || "",
    civilite: resE.data.civilite || null,
  }
}
