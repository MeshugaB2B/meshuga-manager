// FILE PATH dans le repo (REMPLACE temporairement) :
//   src/app/api/employer-validate/load/route.ts
//
// ⚠️ VERSION DEBUG TEMPORAIRE — révèle l'email vu et les cookies présents.
// À remettre dans l'état "PATCH__1__" une fois le diagnostic terminé.

import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { createServerClient } from "@supabase/ssr"
import { createClient } from "@supabase/supabase-js"

export var dynamic = "force-dynamic"

async function getAuthDiagnostic() {
  var result: any = {
    seen_email: null,
    cookie_names: [] as string[],
    cookies_count: 0,
    auth_error: null,
    env_url_set: false,
    env_anon_set: false,
  }
  try {
    var url = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
    var anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
    result.env_url_set = !!url
    result.env_anon_set = !!anon
    if (!url || !anon) {
      result.auth_error = "missing_env_vars"
      return result
    }
    var cookieStore = cookies()
    var allCookies = cookieStore.getAll()
    result.cookies_count = allCookies.length
    result.cookie_names = allCookies.map(function (c: any) { return c.name })

    var supa = createServerClient(url, anon, {
      cookies: {
        getAll: function () {
          return cookieStore.getAll()
        },
        setAll: function () {},
      },
    })
    var r: any = await supa.auth.getUser()
    if (r.error) {
      result.auth_error = String(r.error.message || r.error)
      return result
    }
    result.seen_email = r.data && r.data.user ? (r.data.user.email || null) : null
  } catch (e: any) {
    result.auth_error = "exception: " + String(e && e.message ? e.message : e)
  }
  return result
}

export async function GET(req: Request) {
  try {
    var u = new URL(req.url)
    var type = u.searchParams.get("type") || ""
    var id = u.searchParams.get("id") || ""
    var token = u.searchParams.get("token") || ""

    if (!type || !id || !token) {
      return NextResponse.json({ ok: false, error: "missing_params" }, { status: 400 })
    }
    if (type !== "contract" && type !== "amendment") {
      return NextResponse.json({ ok: false, error: "invalid_type" }, { status: 400 })
    }

    var diag = await getAuthDiagnostic()
    var seen = diag.seen_email ? String(diag.seen_email).toLowerCase() : null

    if (seen !== "edward@meshuga.fr") {
      return NextResponse.json(
        {
          ok: false,
          error: "forbidden",
          reason: "not_employer",
          debug: diag,
        },
        { status: 403 }
      )
    }

    // Reste de la logique (load réelle) — identique à la version stable
    var supaUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
    var serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ""
    var admin = createClient(supaUrl, serviceKey)

    var table = type === "contract" ? "hr_contracts" : "hr_contract_amendments"
    var selectCols = [
      "id",
      "employee_id",
      "cycle_id",
      "prepared_by_email",
      "prepared_at",
      "employer_validation_token",
      "employer_validation_token_expires_at",
      "employer_validated_at",
      "employer_validated_by_email",
      "employer_pending_recipient_email",
      "employer_pending_recipient_phone",
      "employer_pending_include_welcome_pack",
    ].join(",")

    var row: any = await admin.from(table).select(selectCols).eq("id", id).maybeSingle()
    if (row.error || !row.data) {
      return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 })
    }
    var r = row.data

    if (r.employer_validated_at) {
      return NextResponse.json({
        ok: true,
        status: "already_validated",
        validated_at: r.employer_validated_at,
        validated_by: r.employer_validated_by_email,
      })
    }

    if (!r.employer_validation_token || r.employer_validation_token !== token) {
      return NextResponse.json({ ok: false, error: "invalid_token" }, { status: 401 })
    }

    var now = new Date()
    var exp = r.employer_validation_token_expires_at
      ? new Date(r.employer_validation_token_expires_at)
      : null
    if (exp && exp.getTime() < now.getTime()) {
      return NextResponse.json({
        ok: true,
        status: "expired",
        expired_at: r.employer_validation_token_expires_at,
      })
    }

    var employeeId: string | null = r.employee_id
    if (!employeeId && r.cycle_id) {
      var cycleRow: any = await admin
        .from("hr_employee_cycles")
        .select("employee_id")
        .eq("id", r.cycle_id)
        .maybeSingle()
      if (cycleRow.data && cycleRow.data.employee_id) employeeId = cycleRow.data.employee_id
    }

    var emp: any = null
    if (employeeId) {
      var e: any = await admin
        .from("hr_employees")
        .select("id,prenom,nom,email,telephone")
        .eq("id", employeeId)
        .maybeSingle()
      if (e.data) emp = e.data
    }

    var docTypes = type === "contract" ? ["contrat_genere"] : ["avenant"]
    var docCol = type === "contract" ? "contract_id" : "amendment_id"
    var docQ: any = await admin
      .from("hr_contract_docs")
      .select("id,doc_type,file_name,created_at")
      .eq(docCol, id)
      .in("doc_type", docTypes)
      .order("created_at", { ascending: false })
      .limit(1)
    var docId = docQ.data && docQ.data.length ? docQ.data[0].id : null

    return NextResponse.json({
      ok: true,
      status: "pending",
      doc: {
        type: type,
        id: r.id,
        label: type === "contract" ? "Contrat de travail" : "Avenant au contrat",
      },
      employee: emp ? { prenom: emp.prenom, nom: emp.nom } : null,
      prepared: { by_email: r.prepared_by_email, at: r.prepared_at },
      channels: {
        email: r.employer_pending_recipient_email,
        phone: r.employer_pending_recipient_phone,
        include_welcome_pack: !!r.employer_pending_include_welcome_pack,
      },
      doc_id: docId,
      preview_url: docId ? "/api/hr/document/" + docId + "?source=contract" : null,
    })
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: "server_error", detail: String(e) },
      { status: 500 }
    )
  }
}
