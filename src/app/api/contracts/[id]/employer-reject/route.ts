// ============================================================
// FILE PATH dans le repo :
//   src/app/api/contracts/[id]/employer-reject/route.ts
// ============================================================
// v2 (26/05/2026) — Sprint C3 fix auth :
//   Auth = token URL uniquement (vérifié par executeEmployerReject).
//   Plus de getUserEmailFromBearer.
// ============================================================

import { NextResponse } from "next/server"
import { executeEmployerReject } from "@/lib/employer-validation"

export var dynamic = "force-dynamic"

export async function POST(req: Request, ctx: { params: { id: string } }) {
  try {
    var id = ctx && ctx.params ? ctx.params.id : ""
    if (!id) {
      return NextResponse.json({ ok: false, error: "missing_id" }, { status: 400 })
    }

    var body: any = await req.json().catch(function () { return {} })
    var token = body && body.token ? String(body.token) : ""
    if (!token) {
      return NextResponse.json({ ok: false, error: "missing_token" }, { status: 400 })
    }
    var reason = body && body.reason ? String(body.reason) : ""

    var result = await executeEmployerReject({
      kind: "contract",
      id: id,
      token: token,
      reason: reason,
    })

    if (!result.ok) {
      var statusMap: any = {
        not_found: 404,
        already_validated: 409,
        invalid_token: 401,
      }
      var statusCode = statusMap[result.error || ""] || 500
      return NextResponse.json(result, { status: statusCode })
    }

    return NextResponse.json(result)
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: "server_error", detail: String(e) },
      { status: 500 }
    )
  }
}
