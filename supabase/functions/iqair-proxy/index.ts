// iqair-proxy — Supabase Edge Function
// Proxies requests to https://api-airvisual.com/v2, appending the IQAir API key
// from Supabase secrets so the key never reaches the frontend.
//
// Usage: GET /functions/v1/iqair-proxy?path=<encodeURIComponent("/nearest_city?lat=14.5&lon=120.9")>

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const IQAIR_BASE = "https://api-airvisual.com/v2"

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS })
  }

  const key = Deno.env.get("IQAIR_API_KEY")
  if (!key) {
    return new Response(JSON.stringify({ error: "IQAIR_API_KEY secret not set" }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...CORS },
    })
  }

  const url  = new URL(req.url)
  const path = url.searchParams.get("path")

  if (!path) {
    return new Response(JSON.stringify({ error: "Missing ?path= query param" }), {
      status: 400,
      headers: { "Content-Type": "application/json", ...CORS },
    })
  }

  const upstream = new URL(`${IQAIR_BASE}${path}`)
  upstream.searchParams.set("key", key)

  try {
    const upstreamRes = await fetch(upstream.toString())
    const body        = await upstreamRes.text()
    return new Response(body, {
      status: upstreamRes.status,
      headers: {
        "Content-Type": upstreamRes.headers.get("Content-Type") ?? "application/json",
        ...CORS,
      },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 502,
      headers: { "Content-Type": "application/json", ...CORS },
    })
  }
})
