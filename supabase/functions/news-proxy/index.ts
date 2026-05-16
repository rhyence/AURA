// news-proxy — Supabase Edge Function
// Calls Anthropic API with web search to fetch fresh air quality news.
// Keeps the ANTHROPIC_API_KEY server-side and handles CORS for the browser.
//
// Usage: POST /functions/v1/news-proxy
// Body: { query: string }
// Returns: { articles: [{title, description, url, source, publishedAt}] }

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const CORS = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS })
  }

  const apiKey = Deno.env.get("ANTHROPIC_API_KEY")
  if (!apiKey) {
    return new Response(JSON.stringify({ error: "ANTHROPIC_API_KEY not set" }), {
      status: 500, headers: { "Content-Type": "application/json", ...CORS },
    })
  }

  let query: string
  try {
    const body = await req.json()
    query = body.query
    if (!query) throw new Error("missing query")
  } catch {
    return new Response(JSON.stringify({ error: "Body must be JSON with a query field" }), {
      status: 400, headers: { "Content-Type": "application/json", ...CORS },
    })
  }

  const today = new Date().toLocaleDateString("en-PH", {
    year: "numeric", month: "long", day: "numeric",
  })

  try {
    const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type":      "application/json",
        "x-api-key":         apiKey,
        "anthropic-version": "2023-06-01",
        "anthropic-beta":    "web-search-2025-03-05",
      },
      body: JSON.stringify({
        model:      "claude-sonnet-4-20250514",
        max_tokens: 1000,
        tools: [{ type: "web_search_20250305", name: "web_search" }],
        system: `You are a news aggregator for an air quality app in the Philippines. Today is ${today}.
Search for recent news articles matching the query. Return ONLY a valid JSON array, no markdown, no explanation:
[{"title":"...","description":"one or two sentence summary","url":"real article URL","source":"publication name","publishedAt":"ISO date or null"}]
Rules:
- Only include real articles found via web search, never invent them
- Prefer articles from the last 30 days; fall back to last 90 days
- Return up to 6 articles`,
        messages: [{ role: "user", content: `Search for: ${query}` }],
      }),
    })

    if (!anthropicRes.ok) {
      const err = await anthropicRes.text()
      throw new Error(`Anthropic ${anthropicRes.status}: ${err}`)
    }

    const data = await anthropicRes.json()
    const text = (data.content as any[])
      .filter((b: any) => b.type === "text")
      .map((b: any) => b.text)
      .join("")

    const match = text.match(/\[[\s\S]*\]/)
    if (!match) throw new Error("No JSON array in Anthropic response")

    const articles = JSON.parse(match[0])
    return new Response(JSON.stringify({ articles }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...CORS },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 502,
      headers: { "Content-Type": "application/json", ...CORS },
    })
  }
})
