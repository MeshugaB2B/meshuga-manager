// FILE PATH dans le repo :
//   src/app/api/contracts/[id]/employer-approve/route.ts

import { NextResponse } from "next/server"
import { executeEmployerApprove } from "@/lib/employer-validation"
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

    var result = await executeEmployerApprove({
      kind: "contract",
      id: id,
      token: token,
      approverEmail: email,
    })

    if (!result.ok) {
      var statusMap: any = {
        not_found: 404,
        already_validated: 409,
        invalid_token: 401,
        expired: 410,
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
