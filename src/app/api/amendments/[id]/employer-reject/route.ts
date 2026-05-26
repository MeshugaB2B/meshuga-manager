// FILE PATH dans le repo :
//   src/app/api/amendments/[id]/employer-reject/route.ts

import { NextResponse } from "next/server"
import { executeEmployerReject } from "@/lib/employer-validation"
import { getUserEmailFromBearer } from "@/lib/server-auth"

export var dynamic = "force-dynamic"

export async function POST(req: Request, ctx: { params: { id: string } }) {
  try {
    var email = await getUserEmailFromBearer(req)
    if (email !== "edward@meshuga.fr") {
      return NextResponse.json(
        { ok: false, error: "forbidden", debug: { seen_email: email } },
        { status: 403 }
      )
    }

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
      kind: "amendment",
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
