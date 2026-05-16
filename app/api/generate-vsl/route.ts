import Anthropic from '@anthropic-ai/sdk'
import sql from '@/lib/db'
import { NextRequest } from 'next/server'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  const {
    brand_id,
    ad_id,
    country,
    badge_number,
    format_ref,
    extra_context,
    extra_doc_texts,
  } = await req.json()

  const [[brand], docs, rules] = await Promise.all([
    sql`SELECT * FROM brands WHERE id = ${brand_id}`,
    sql`SELECT * FROM brand_docs WHERE brand_id = ${brand_id} ORDER BY created_at`,
    sql`SELECT * FROM global_rules WHERE ad_type = 'vsl' ORDER BY order_index`,
  ])

  if (!brand) return Response.json({ error: 'Brand not found' }, { status: 404 })

  const productDocs = docs.filter((d: any) => d.type === 'product')
  const personaDocs = docs.filter((d: any) => d.type === 'persona')

  const rulesText = rules.length
    ? `VSL SCRIPT RULES (apply all strictly):\n${rules.map((r: any, i: number) => `${i + 1}. ${r.rule_text}`).join('\n')}`
    : ''

  const brandRulesText = brand.extra_rules
    ? `\nBRAND-SPECIFIC RULES:\n${brand.extra_rules}`
    : ''

  const productSection = productDocs.length
    ? `\nPRODUCT DOCS (use for all claims, USPs, benefits):\n${productDocs.map((d: any) => `[${d.name}]:\n${d.content}`).join('\n\n')}`
    : ''

  const personaSection = personaDocs.length
    ? `\nPERSONA / TARGET AUDIENCE:\n${personaDocs.map((d: any) => `[${d.name}]:\n${d.content}`).join('\n\n')}`
    : ''

  const formatSection = format_ref
    ? `\nFORMAT REFERENCE (mirror structure ONLY — do NOT copy content, angle, or claims):\n${format_ref}`
    : ''

  const extraContextSection = extra_context
    ? `\nEXTRA CONTEXT:\n${extra_context}`
    : ''

  const extraDocsSection = (extra_doc_texts ?? []).length
    ? `\nEXTRA DOCS:\n${(extra_doc_texts as string[]).join('\n\n')}`
    : ''

  const prompt = `You are an expert direct-response copywriter specialising in Video Sales Letter (VSL) scripts.

SCRIPT ID: ${ad_id}
BRAND: ${brand.name}
TARGET MARKET: ${country}
${rulesText}${brandRulesText}${productSection}${personaSection}${formatSection}${extraContextSection}${extraDocsSection}

Write a complete, compelling VSL script for ${brand.name} targeting ${country}.
Structure the script with clear sections: Hook, Problem, Agitation, Solution, Product Introduction, Benefits, Social Proof, Offer, and Call to Action.
Follow ALL rules strictly.
If a format reference is provided, mirror its structure — write entirely original content based only on the brand and product docs.
Write in a conversational, spoken tone as if being read aloud on camera.
At the very top, include the Script ID: ${ad_id}
End with a strong, urgent call to action.`

  let stream
  try {
    stream = await anthropic.messages.stream({
      model: 'claude-sonnet-4-6',
      max_tokens: 4000,
      messages: [{ role: 'user', content: prompt }],
    })
  } catch (err: any) {
    console.error('Anthropic VSL stream error:', err)
    return Response.json(
      { error: err?.message ?? 'Failed to start generation' },
      { status: 500 }
    )
  }

  const encoder = new TextEncoder()
  const readable = new ReadableStream({
    async start(controller) {
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
        console.error('Anthropic VSL stream read error:', err)
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ error: err?.message ?? 'Stream error' })}\n\n`)
        )
      }
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
