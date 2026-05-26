// FILE PATH dans le repo :
//   src/app/api/employer-validate/load/route.ts

import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { getUserEmailFromBearer } from "@/lib/server-auth"

export var dynamic = "force-dynamic"

function adminClient() {
  var url = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
  var key = process.env.SUPABASE_SERVICE_ROLE_KEY || ""
  return createClient(url, key)
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

    var email = await getUserEmailFromBearer(req)
    if (email !== "edward@meshuga.fr") {
      return NextResponse.json(
        { ok: false, error: "forbidden", reason: "not_employer", debug: { seen_email: email } },
        { status: 403 }
      )
    }

    var admin = adminClient()
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
