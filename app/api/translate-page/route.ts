import Anthropic from '@anthropic-ai/sdk'
import sql from '@/lib/db'

export const maxDuration = 300

const client = new Anthropic()

type TextMap = Record<string, string>

function extractTexts(html: string): { template: string; map: TextMap } {
  const map: TextMap = {}
  let i = 0
  const placeholder = () => `__TXLT${i++}__`

  // Step 1: swap <style> and <script> blocks out entirely so the text
  // regex never runs over CSS selectors or JS code
  const blocked: string[] = []
  let template = html.replace(/<(style|script)[^>]*>[\s\S]*?<\/\1>/gi, (block) => {
    blocked.push(block)
    return `<!--BLK${blocked.length - 1}-->`
  })

  // Step 2: extract visible text nodes between HTML tags
  template = template.replace(/>([^<]+)</g, (match, text) => {
    const trimmed = text.trim()
    if (!trimmed || trimmed.length < 2) return match
    // skip numbers-only, symbols-only, template vars, json-like
    if (/^[\d\s.,;:!?@#%&*()\-_=+[\]{}'"|\\/<>~`]+$/.test(trimmed)) return match
    if (trimmed.startsWith('{') || trimmed.startsWith('[') || trimmed.startsWith('/*')) return match
    const k = placeholder()
    map[k] = trimmed
    return match.replace(text, text.replace(trimmed, k))
  })

  // Step 3: translatable attributes
  for (const attr of ['alt', 'placeholder', 'title', 'aria-label']) {
    const re = new RegExp(`\\b${attr}=["']([^"']{2,})["']`, 'g')
    template = template.replace(re, (match, text) => {
      if (/^[\d\s\W]+$/.test(text)) return match
      const k = placeholder()
      map[k] = text
      return match.replace(text, k)
    })
  }

  // Step 4: restore <style>/<script> blocks
  template = template.replace(/<!--BLK(\d+)-->/g, (_, idx) => blocked[parseInt(idx)] ?? '')

  return { template, map }
}

function applyTranslations(template: string, translated: TextMap, original: TextMap): string {
  let result = template
  for (const [k, originalText] of Object.entries(original)) {
    result = result.split(k).join(translated[k] ?? originalText)
  }
  return result
}

function parseJsonSafely(text: string): TextMap | null {
  // Claude sometimes wraps output in markdown code fences
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  const raw = fenced ? fenced[1] : text
  // Find the outermost {...} block
  const jsonMatch = raw.match(/\{[\s\S]*\}/)
  if (!jsonMatch) return null
  try {
    return JSON.parse(jsonMatch[0])
  } catch {
    return null
  }
}

const BATCH_SIZE = 100

export async function POST(req: Request) {
  const { id, language } = await req.json()
  if (!id || !language) {
    return Response.json({ error: 'id and language are required' }, { status: 400 })
  }

  const [row] = await sql`SELECT html FROM cloned_pages WHERE id = ${id}`
  if (!row) return Response.json({ error: 'Page not found' }, { status: 404 })

  const { template, map } = extractTexts(row.html)
  const allKeys = Object.keys(map)
  const totalBatches = Math.max(1, Math.ceil(allKeys.length / BATCH_SIZE))
  const encoder = new TextEncoder()

  const body = new ReadableStream({
    async start(controller) {
      function send(obj: object) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`))
      }

      try {
        const translated: TextMap = {}
        send({ type: 'progress', value: 0.05 })

        if (allKeys.length === 0) {
          // Nothing extractable — return as-is
          send({ type: 'done', html: row.html })
          return
        }

        for (let b = 0; b < totalBatches; b++) {
          const batchKeys = allKeys.slice(b * BATCH_SIZE, (b + 1) * BATCH_SIZE)
          const batchObj: TextMap = {}
          for (const k of batchKeys) batchObj[k] = map[k]
          const batchInputSize = Math.max(1, JSON.stringify(batchObj).length)

          const stream = client.messages.stream({
            model: 'claude-sonnet-4-6',
            max_tokens: 8192,
            messages: [
              {
                role: 'user',
                content: `Translate the values in this JSON object to ${language}.

Rules:
- Translate ONLY the values, NEVER the keys (keys look like __TXLT0__)
- Keep brand names, product names, and proper nouns unchanged
- Preserve any HTML inside values exactly
- Return ONLY a valid JSON object — no markdown, no explanation

${JSON.stringify(batchObj)}`,
              },
            ],
          })

          let accumulated = ''
          for await (const chunk of stream) {
            if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
              accumulated += chunk.delta.text
              const withinBatch = Math.min(0.95, accumulated.length / batchInputSize)
              send({ type: 'progress', value: 0.05 + ((b + withinBatch) / totalBatches) * 0.88 })
            }
          }

          const parsed = parseJsonSafely(accumulated)
          if (parsed) {
            Object.assign(translated, parsed)
          } else {
            // keep originals for this batch
            Object.assign(translated, batchObj)
          }

          send({ type: 'progress', value: 0.05 + ((b + 1) / totalBatches) * 0.88 })
        }

        const translatedHtml = applyTranslations(template, translated, map)
        await sql`UPDATE cloned_pages SET html = ${translatedHtml} WHERE id = ${id}`
        send({ type: 'done', html: translatedHtml })
      } catch (err: any) {
        console.error('translate-page error:', err)
        send({ type: 'error', error: err.message || 'Translation failed' })
      } finally {
        controller.close()
      }
    },
  })

  return new Response(body, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}
