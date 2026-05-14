// aqicn-proxy — Supabase Edge Function
// Proxies requests to https://api.waqi.info, appending the WAQI token
// from Supabase secrets so the token never reaches the frontend.
//
// Usage: GET /functions/v1/aqicn-proxy?path=<encodeURIComponent("/feed/geo:14.5;121.0/")>

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const WAQI_BASE = "https://api.waqi.info"

serve(async (req: Request) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, content-type",
      },
    })
  }

  const token = Deno.env.get("WAQI_TOKEN")
  if (!token) {
    return new Response(JSON.stringify({ error: "WAQI_TOKEN secret not set" }), {
      status: 500,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    })
  }

  const url   = new URL(req.url)
  const path  = url.searchParams.get("path")

  if (!path) {
    return new Response(JSON.stringify({ error: "Missing ?path= query param" }), {
      status: 400,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    })
  }

  // Build the upstream URL and append the token
  const upstream = new URL(`${WAQI_BASE}${path}`)
  upstream.searchParams.set("token", token)

  try {
    const upstreamRes = await fetch(upstream.toString())
    const body        = await upstreamRes.text()

    return new Response(body, {
      status: upstreamRes.status,
      headers: {
        "Content-Type": upstreamRes.headers.get("Content-Type") ?? "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 502,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    })
  }
})
