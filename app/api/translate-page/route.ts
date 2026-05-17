import Anthropic from '@anthropic-ai/sdk'
import sql from '@/lib/db'

export const maxDuration = 300

const client = new Anthropic()

type TextMap = Record<string, string>

function extractTexts(html: string): { template: string; map: TextMap } {
  const map: TextMap = {}
  let i = 0
  const ph = () => `__TXLT${i++}__`

  // Replace <style>/<script> with placeholders so we never touch their content
  const blocked: string[] = []
  let template = html.replace(/<(style|script)[^>]*>[\s\S]*?<\/\1>/gi, (block) => {
    blocked.push(block)
    return `<!--BLK${blocked.length - 1}-->`
  })

  // Extract text nodes
  template = template.replace(/>([^<]+)</g, (match, text) => {
    const t = text.trim()
    if (!t || t.length < 2) return match
    if (/^[\d\s.,;:!?@#%&*()\-_=+[\]{}'"|\\/<>~`]+$/.test(t)) return match
    if (t.startsWith('{') || t.startsWith('[') || t.startsWith('/*')) return match
    const k = ph()
    map[k] = t
    return match.replace(text, text.replace(t, k))
  })

  // Translatable attributes
  for (const attr of ['alt', 'placeholder', 'title', 'aria-label']) {
    const re = new RegExp(`\\b${attr}=["']([^"']{2,})["']`, 'g')
    template = template.replace(re, (match, text) => {
      if (/^[\d\s\W]+$/.test(text)) return match
      const k = ph()
      map[k] = text
      return match.replace(text, k)
    })
  }

  // Restore <style>/<script> blocks
  template = template.replace(/<!--BLK(\d+)-->/g, (_, idx) => blocked[parseInt(idx)] ?? '')

  return { template, map }
}

function applyTranslations(template: string, translated: TextMap, original: TextMap): string {
  let result = template
  for (const [k, orig] of Object.entries(original)) {
    result = result.split(k).join(translated[k] ?? orig)
  }
  return result
}

function parseJsonSafely(text: string): TextMap | null {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  const raw = fenced ? fenced[1] : text
  const block = raw.match(/\{[\s\S]*\}/)
  if (!block) return null
  try { return JSON.parse(block[0]) } catch { return null }
}

const BATCH_SIZE = 80

export async function POST(req: Request) {
  const { id, language } = await req.json()
  if (!id || !language) {
    return Response.json({ error: 'id and language are required' }, { status: 400 })
  }

  const [row] = await sql`SELECT html FROM cloned_pages WHERE id = ${id}`
  if (!row) return Response.json({ error: 'Page not found' }, { status: 404 })

  const { template, map } = extractTexts(row.html)
  const allKeys = Object.keys(map)
  const encoder = new TextEncoder()

  const body = new ReadableStream({
    async start(controller) {
      function send(obj: object) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`))
      }

      try {
        send({ type: 'progress', value: 0.05 })

        if (allKeys.length === 0) {
          send({ type: 'error', error: 'No translatable text found on this page.' })
          return
        }

        const totalBatches = Math.ceil(allKeys.length / BATCH_SIZE)
        const translated: TextMap = {}

        for (let b = 0; b < totalBatches; b++) {
          const batchKeys = allKeys.slice(b * BATCH_SIZE, (b + 1) * BATCH_SIZE)
          const batchObj: TextMap = {}
          for (const k of batchKeys) batchObj[k] = map[k]

          send({ type: 'progress', value: 0.1 + (b / totalBatches) * 0.8 })

          try {
            const message = await client.messages.create(
              {
                model: 'claude-sonnet-4-6',
                max_tokens: 8192,
                messages: [
                  {
                    role: 'user',
                    content: `Translate the values in this JSON to ${language}. Return ONLY a valid JSON object with the same keys. Never translate the keys. Keep brand names unchanged.

${JSON.stringify(batchObj)}`,
                  },
                ],
              },
              { timeout: 120_000 },
            )

            const responseText =
              message.content[0]?.type === 'text' ? message.content[0].text : null

            if (responseText) {
              const parsed = parseJsonSafely(responseText)
              Object.assign(translated, parsed ?? batchObj)
            } else {
              Object.assign(translated, batchObj)
            }
          } catch (batchErr: any) {
            // keep originals for this batch, continue
            console.error(`batch ${b} failed:`, batchErr?.message)
            Object.assign(translated, batchObj)
          }

          send({ type: 'progress', value: 0.1 + ((b + 1) / totalBatches) * 0.8 })
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
