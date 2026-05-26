// FILE PATH dans le repo :
//   src/app/api/amendments/[id]/employer-reject/route.ts

import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { createServerClient } from "@supabase/ssr"
import { executeEmployerReject } from "@/lib/employer-validation"

export var dynamic = "force-dynamic"

async function getCurrentUserEmail() {
  try {
    var url = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
    var anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
    if (!url || !anon) return null
    var cookieStore = cookies()
    var supa = createServerClient(url, anon, {
      cookies: {
        getAll: function () {
          return cookieStore.getAll()
        },
        setAll: function () {},
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

export async function POST(req: Request, ctx: { params: { id: string } }) {
  try {
    var email = await getCurrentUserEmail()
    if (email !== "edward@meshuga.fr") {
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 })
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
