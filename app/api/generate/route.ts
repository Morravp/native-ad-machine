import Anthropic from '@anthropic-ai/sdk'
import sql from '@/lib/db'
import { NextRequest } from 'next/server'

export const maxDuration = 300 // 5 minutes

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

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

  const brandRulesText = brand.extra_rules
    ? `\nBRAND-SPECIFIC RULES:\n${brand.extra_rules}`
    : ''

  const productSection = productDocs.length
    ? `\nPRODUCT DOCS (use for all content, claims, USPs):\n${productDocs.map((d: any) => `[${d.name}]:\n${d.content}`).join('\n\n')}`
    : ''

  const personaSection = personaDocs.length
    ? `\nPERSONA DOCS:\n${personaDocs.map((d: any) => `[${d.name}]:\n${d.content}`).join('\n\n')}`
    : ''

  const competitorSection = competitor_ad
    ? `\nFORMAT REFERENCE (structure/format ONLY — do NOT copy content, angle, or claims):\n${competitor_ad}`
    : ''

  const extraContextSection = extra_context
    ? `\nEXTRA CONTEXT FROM MARKETER:\n${extra_context}`
    : ''

  const extraDocsSection = (extra_doc_texts ?? []).length
    ? `\nEXTRA DOCS FOR THIS AD:\n${(extra_doc_texts as string[]).join('\n\n')}`
    : ''

  const prompt = `You are an expert native ad copywriter specialising in advertorial-style content.

AD ID: ${ad_id}
BRAND: ${brand.name}
TARGET MARKET: ${country}
BADGE NUMBER: ${badge_number}
${rulesText}${brandRulesText}${productSection}${personaSection}${competitorSection}${extraContextSection}${extraDocsSection}

Write a compelling advertorial-style native ad for ${brand.name} targeting ${country}.
Follow ALL copywriting rules strictly.
If a format reference is provided, mirror its structure and flow — write entirely original content based only on the brand and product docs above.
Start the ad directly. At the very top of the output, include the Ad ID: ${ad_id}
End with a strong, clear call to action.`

  let stream
  try {
    stream = await anthropic.messages.stream({
      model: 'claude-sonnet-4-6',
      max_tokens: 8192,
      messages: [{ role: 'user', content: prompt }],
    })
  } catch (err: any) {
    console.error('Anthropic stream error:', err)
    return Response.json(
      { error: err?.message ?? 'Failed to start generation' },
      { status: 500 }
    )
  }

  const encoder = new TextEncoder()
  const readable = new ReadableStream({
    async start(controller) {
      // Send a keepalive comment every 15s to prevent Railway/proxy from
      // dropping the SSE connection during slow token generation
      const keepalive = setInterval(() => {
        try { controller.enqueue(encoder.encode(': keepalive\n\n')) } catch {}
      }, 15000)

      try {
        for await (const event of stream) {
          if (
            event.type === 'content_block_delta' &&
            event.delta.type === 'text_delta'
          ) {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ text: event.delta.text })}\n\n`)
            )
          }
        }
      } catch (err: any) {
        console.error('Anthropic stream read error:', err)
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ error: err?.message ?? 'Stream error' })}\n\n`)
        )
      }
      clearInterval(keepalive)
      controller.enqueue(encoder.encode('data: [DONE]\n\n'))
      controller.close()
    },
  })

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}
