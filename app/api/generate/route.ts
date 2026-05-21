import Anthropic from '@anthropic-ai/sdk'
import sql from '@/lib/db'
import { NextRequest } from 'next/server'
import { retrieveRelevantChunks } from '@/lib/brain'

export const maxDuration = 300

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const SSE_HEADERS = {
  'Content-Type': 'text/event-stream',
  'Cache-Control': 'no-cache',
  'Connection': 'keep-alive',
}

export async function POST(req: NextRequest) {
  const {
    brand_id,
    ad_id,
    country,
    badge_number,
    competitor_ad,
    extra_context,
    extra_doc_texts,
  } = await req.json()

  const [[brand], docs, rules] = await Promise.all([
    sql`SELECT * FROM brands WHERE id = ${brand_id}`,
    sql`SELECT * FROM brand_docs WHERE brand_id = ${brand_id} ORDER BY created_at`,
    sql`SELECT * FROM global_rules ORDER BY order_index`,
  ])

  if (!brand) return Response.json({ error: 'Brand not found' }, { status: 404 })

  const productDocs = docs.filter((d: any) => d.type === 'product')
  const personaDocs = docs.filter((d: any) => d.type === 'persona')

  const rulesText = rules.length
    ? `GLOBAL COPYWRITING RULES (apply all strictly):\n${rules.map((r: any, i: number) => `${i + 1}. ${r.rule_text}`).join('\n')}`
    : ''
  const brandRulesText = brand.extra_rules ? `\nBRAND-SPECIFIC RULES:\n${brand.extra_rules}` : ''
  const productSection = productDocs.length
    ? `\nPRODUCT DOCS (use for all content, claims, USPs):\n${productDocs.map((d: any) => `[${d.name}]:\n${d.content}`).join('\n\n')}`
    : ''
  const personaSection = personaDocs.length
    ? `\nPERSONA DOCS:\n${personaDocs.map((d: any) => `[${d.name}]:\n${d.content}`).join('\n\n')}`
    : ''
  const competitorSection = competitor_ad
    ? `\nFORMAT REFERENCE (structure/format ONLY — do NOT copy content, angle, or claims):\n${competitor_ad}`
    : ''
  const extraContextSection = extra_context ? `\nEXTRA CONTEXT FROM MARKETER:\n${extra_context}` : ''
  const extraDocsSection = (extra_doc_texts ?? []).length
    ? `\nEXTRA DOCS FOR THIS AD:\n${(extra_doc_texts as string[]).join('\n\n')}`
    : ''

  const brainQuery = [brand.name, country, extra_context ?? '', competitor_ad?.slice(0, 300) ?? '']
    .filter(Boolean).join(' ')

  const encoder = new TextEncoder()

  // Return the SSE response immediately so Railway sees activity right away.
  // Brain retrieval + Anthropic stream setup both happen INSIDE the stream
  // while the keepalive is already running — no dead time on the wire.
  const readable = new ReadableStream({
    async start(controller) {
      const send = (data: string) => {
        try { controller.enqueue(encoder.encode(data)) } catch {}
      }

      // Keepalive every 5s — keeps Railway's proxy from dropping the connection
      const keepalive = setInterval(() => send(': keepalive\n\n'), 5000)

      try {
        // 1. Retrieve brain knowledge (runs while keepalive is active)
        const brainChunks = await retrieveRelevantChunks(brainQuery, 6).catch(() => [] as string[])
        const brainSection = brainChunks.length
          ? `\nMARKETING KNOWLEDGE BASE (expert e-commerce & direct response knowledge — apply where relevant):\n${brainChunks.map((c, i) => `[${i + 1}] ${c}`).join('\n\n')}`
          : ''

        // 2. Build prompt
        const prompt = `You are an expert native ad copywriter specialising in advertorial-style content.

AD ID: ${ad_id}
BRAND: ${brand.name}
TARGET MARKET: ${country}
BADGE NUMBER: ${badge_number}
${rulesText}${brandRulesText}${productSection}${personaSection}${competitorSection}${extraContextSection}${extraDocsSection}${brainSection}

Write a compelling advertorial-style native ad for ${brand.name} targeting ${country}.
Follow ALL copywriting rules strictly.
If a format reference is provided, mirror its structure and flow — write entirely original content based only on the brand and product docs above.
Apply relevant principles from the Marketing Knowledge Base to strengthen the copy.
Start the ad directly. At the very top of the output, include the Ad ID: ${ad_id}
End with a strong, clear call to action.`

        // 3. Stream from Anthropic (also while keepalive is active)
        const stream = await anthropic.messages.stream({
          model: 'claude-sonnet-4-6',
          max_tokens: 8192,
          messages: [{ role: 'user', content: prompt }],
        })

        for await (const event of stream) {
          if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
            send(`data: ${JSON.stringify({ text: event.delta.text })}\n\n`)
          }
        }
      } catch (err: any) {
        console.error('Generate error:', err)
        send(`data: ${JSON.stringify({ error: err?.message ?? 'Generation failed' })}\n\n`)
      }

      clearInterval(keepalive)
      send('data: [DONE]\n\n')
      controller.close()
    },
  })

  return new Response(readable, { headers: SSE_HEADERS })
}
