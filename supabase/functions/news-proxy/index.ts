// news-proxy — Supabase Edge Function
// Proxies requests to GNews API, keeping the key server-side and adding CORS.
//
// Usage: GET /functions/v1/news-proxy?q=<query>
// Returns: GNews JSON response

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const CORS = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS })
  }

  const apiKey = Deno.env.get("GNEWS_API_KEY")
  if (!apiKey) {
    return new Response(JSON.stringify({ error: "GNEWS_API_KEY not set" }), {
      status: 500, headers: { "Content-Type": "application/json", ...CORS },
    })
  }

  const url  = new URL(req.url)
  const q    = url.searchParams.get("q")
  if (!q) {
    return new Response(JSON.stringify({ error: "Missing ?q= param" }), {
      status: 400, headers: { "Content-Type": "application/json", ...CORS },
    })
  }

  const upstream = `https://gnews.io/api/v4/search?q=${encodeURIComponent(q)}&lang=en&max=6&apikey=${apiKey}`

  try {
    const res  = await fetch(upstream)
    const body = await res.text()
    return new Response(body, {
      status: res.status,
      headers: { "Content-Type": "application/json", ...CORS },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 502, headers: { "Content-Type": "application/json", ...CORS },
    })
  }
})
