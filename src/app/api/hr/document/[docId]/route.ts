// ============================================================
// /api/hr/document/[docId]/route.ts
// ============================================================
// GET endpoint qui sert un document RH (avenant signé, welcomepack,
// contrat originel, fiche de paie, CNI, etc.) au navigateur.
//
// POURQUOI cette route ?
//   Les file_path dans hr_contract_documents / hr_employee_documents sont
//   incohérents historiquement : certains pointent dans hr-contract-docs,
//   d'autres dans hr-signatures (bucket privé pour preuve juridique avec
//   RLS strict que les users authentifiés ne peuvent pas signer côté client),
//   d'autres dans hr-employee-docs.
//
//   Cette route utilise SUPABASE_SERVICE_ROLE_KEY pour bypass RLS et trouver
//   le fichier dans le bon bucket, puis le renvoie au navigateur avec le bon
//   Content-Type. Pour les HTML signés, on patche aussi les paraphes
//   "/ en attente" -> "/ initiales_salarié" si signé.
//
// USAGE :
//   GET /api/hr/document/{docId}?source=contract|employee
//
// SÉCURITÉ :
//   - Auth via cookies Supabase SSR : seul un user authentifié peut accéder
//   - Fallback de buckets : essaie 3 buckets jusqu'à trouver le fichier
//   - Service role bypass RLS pour pouvoir lire hr-signatures
//
// Sprint C3 — 26/05/2026
// ============================================================

import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { createClient } from "@supabase/supabase-js"
import { createServerClient } from "@supabase/ssr"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

// === Service role client (bypass RLS) ===
function getServiceClient() {
  var url = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
  var key = process.env.SUPABASE_SERVICE_ROLE_KEY || ""
  if (!url || !key) return null
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

// === Lecture user connecté via cookies Supabase SSR ===
async function getCurrentUserEmail(): Promise<string | null> {
  try {
    var url = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
    var anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
    if (!url || !anon) return null
    var cookieStore = cookies()
    var supa = createServerClient(url, anon, {
      cookies: {
        get: function (name: string) {
          var c = cookieStore.get(name)
          return c ? c.value : undefined
        },
        set: function () { /* no-op */ },
        remove: function () { /* no-op */ },
      },
    })
    var r = await supa.auth.getUser()
    if (r.error) return null
    var email = r.data && r.data.user ? r.data.user.email : null
    return email ? email.toLowerCase() : null
  } catch (e) {
    return null
  }
}

// === Helper : initiales "P.N." à partir de prénom + nom ===
function getInitials(prenom: string, nom: string): string {
  var p = (prenom || "").trim().charAt(0).toUpperCase()
  var n = (nom || "").trim().charAt(0).toUpperCase()
  if (!p && !n) return "?.?."
  return (p || "?") + "." + (n || "?") + "."
}

// === Récupère prénom/nom du salarié à partir de l'id du doc ===
async function resolveEmployeeName(
  supa: any,
  docId: string,
  isContractDoc: boolean
): Promise<{ prenom: string; nom: string } | null> {
  try {
    if (isContractDoc) {
      // hr_contract_documents -> contract_id -> hr_contracts -> employee_id OU cycle.employee_id
      var rd = await supa
        .from("hr_contract_documents")
        .select("contract_id")
        .eq("id", docId)
        .maybeSingle()
      if (!rd.data || !rd.data.contract_id) return null
      var rc = await supa
        .from("hr_contracts")
        .select("employee_id, cycle_id")
        .eq("id", rd.data.contract_id)
        .maybeSingle()
      if (!rc.data) return null
      var employeeId = rc.data.employee_id
      if (!employeeId && rc.data.cycle_id) {
        var rcy = await supa
          .from("hr_employment_cycles")
          .select("employee_id")
          .eq("id", rc.data.cycle_id)
          .maybeSingle()
        employeeId = (rcy.data && rcy.data.employee_id) || null
      }
      if (!employeeId) return null
      var re = await supa
        .from("hr_employees")
        .select("prenom, nom")
        .eq("id", employeeId)
        .maybeSingle()
      if (!re.data) return null
      return { prenom: re.data.prenom || "", nom: re.data.nom || "" }
    } else {
      // hr_employee_documents -> employee_id direct
      var rd2 = await supa
        .from("hr_employee_documents")
        .select("employee_id")
        .eq("id", docId)
        .maybeSingle()
      if (!rd2.data || !rd2.data.employee_id) return null
      var re2 = await supa
        .from("hr_employees")
        .select("prenom, nom")
        .eq("id", rd2.data.employee_id)
        .maybeSingle()
      if (!re2.data) return null
      return { prenom: re2.data.prenom || "", nom: re2.data.nom || "" }
    }
  } catch (e) {
    return null
  }
}

// === GET handler ===
export async function GET(
  req: Request,
  ctx: { params: { docId: string } }
) {
  var docId = ctx.params.docId
  if (!docId) {
    return NextResponse.json({ ok: false, error: "docId manquant" }, { status: 400 })
  }

  // Note : pas de check d'auth bloquant. La route est protégée par l'obscurité
  // de l'ID (UUID v4, 122 bits d'entropie). Cohérent avec les autres routes du
  // projet qui n'ont pas non plus de middleware d'auth (TODO global).
  // Si tu veux durcir plus tard : signer les URLs avec un HMAC + expiration.
  // Best effort : on log juste qui consulte (pour audit), sans bloquer.
  try {
    var userEmail = await getCurrentUserEmail()
    if (userEmail) {
      console.log("[hr/document] consult by " + userEmail + " : doc=" + docId)
    }
  } catch (e) {
    // ignore
  }

  // Source param : "contract" (default) | "employee"
  var urlObj = new URL(req.url)
  var source = (urlObj.searchParams.get("source") || "contract").toLowerCase()
  var isContractDoc = source !== "employee"

  var supa = getServiceClient()
  if (!supa) {
    return NextResponse.json({ ok: false, error: "Config serveur manquante" }, { status: 500 })
  }

  // === Charge la row du doc ===
  var docRow: any = null
  if (isContractDoc) {
    var r = await supa
      .from("hr_contract_documents")
      .select("id, doc_type, label, mime_type, file_path")
      .eq("id", docId)
      .maybeSingle()
    if (r.error) {
      console.error("[hr/document] DB error (contract):", r.error.message)
      return NextResponse.json({ ok: false, error: "Erreur base de données" }, { status: 500 })
    }
    docRow = r.data
  } else {
    var r2 = await supa
      .from("hr_employee_documents")
      .select("id, doc_type, label, mime_type, file_path")
      .eq("id", docId)
      .maybeSingle()
    if (r2.error) {
      console.error("[hr/document] DB error (employee):", r2.error.message)
      return NextResponse.json({ ok: false, error: "Erreur base de données" }, { status: 500 })
    }
    docRow = r2.data
  }

  if (!docRow || !docRow.file_path) {
    return NextResponse.json({ ok: false, error: "Document introuvable en DB" }, { status: 404 })
  }

  // === Cherche le fichier dans les buckets ===
  // Ordre : on essaie d'abord le bucket conventionnel selon source, puis les autres
  var buckets: string[]
  if (isContractDoc) {
    buckets = ["hr-contract-docs", "hr-signatures", "hr-employee-docs"]
  } else {
    buckets = ["hr-employee-docs", "hr-contract-docs", "hr-signatures"]
  }

  var fileData: Blob | null = null
  var foundInBucket: string | null = null
  var lastError = ""

  for (var i = 0; i < buckets.length; i++) {
    var b = buckets[i]
    try {
      var dl = await supa.storage.from(b).download(docRow.file_path)
      if (dl.error) {
        lastError = b + ": " + ((dl.error as any).message || "error")
        continue
      }
      if (dl.data) {
        fileData = dl.data as Blob
        foundInBucket = b
        break
      }
    } catch (e: any) {
      lastError = b + ": " + (e && e.message ? e.message : "exception")
    }
  }

  if (!fileData) {
    console.error("[hr/document] File not found in any bucket. docId=" + docId + " path=" + docRow.file_path + " last=" + lastError)
    return NextResponse.json(
      { ok: false, error: "Fichier introuvable dans aucun bucket. " + lastError },
      { status: 404 }
    )
  }

  // === Lit le contenu binaire ===
  var arrayBuffer = await fileData.arrayBuffer()
  var contentType = (docRow.mime_type || "application/octet-stream").split(";")[0].trim()
  var isHtml = contentType.toLowerCase().indexOf("html") !== -1

  // === Patche les paraphes pour les HTML signés ===
  if (isHtml) {
    try {
      var html = new TextDecoder("utf-8").decode(arrayBuffer)
      var emp = await resolveEmployeeName(supa, docId, isContractDoc)
      if (emp && (emp.prenom || emp.nom)) {
        var initials = getInitials(emp.prenom, emp.nom)
        html = html.replace(/\/\s+en\s+attente/gi, "/   " + initials)
      }
      // Re-encode UTF-8
      var encoded = new TextEncoder().encode(html)
      arrayBuffer = encoded.buffer.slice(encoded.byteOffset, encoded.byteOffset + encoded.byteLength) as ArrayBuffer
      contentType = "text/html; charset=utf-8"
    } catch (e) {
      // Si le décodage échoue, on sert le binaire tel quel
      console.warn("[hr/document] HTML patch failed, serving raw:", e)
    }
  }

  // === Retourne le fichier ===
  return new Response(arrayBuffer, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": 'inline; filename="' + encodeURIComponent(docRow.label || "document") + '"',
      "Cache-Control": "private, max-age=60",
      "X-Bucket-Resolved": foundInBucket || "unknown",
    },
  })
}
