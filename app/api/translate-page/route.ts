import Anthropic from '@anthropic-ai/sdk'
import sql from '@/lib/db'

export const maxDuration = 300

const client = new Anthropic()

type TextMap = Record<string, string>

// Extract all translatable text nodes + key attributes, replace with placeholders
function extractTexts(html: string): { template: string; map: TextMap } {
  const map: TextMap = {}
  let i = 0

  function key() { return `«T${i++}»` }

  // Text nodes between tags (skip style/script content)
  let inStyle = false
  let inScript = false
  let template = html
    .replace(/<style[\s\S]*?<\/style>/gi, (m) => { return m }) // preserve but don't touch inside
    .replace(/<script[\s\S]*?<\/script>/gi, (m) => { return m })

  // Replace text content between tags
  template = template.replace(/>([^<]+)</g, (match, text) => {
    const trimmed = text.trim()
    // Skip empty, pure whitespace, numbers-only, or single chars
    if (!trimmed || trimmed.length < 2) return match
    // Skip if it looks like data (numbers, symbols, template syntax)
    if (/^[\d\s.,;:!?@#%&*()\-_=+[\]{}'"|\\/<>~`]+$/.test(trimmed)) return match
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) return match
    const k = key()
    map[k] = trimmed
    return match.replace(text, text.replace(trimmed, k))
  })

  // alt attributes
  template = template.replace(/\balt=["']([^"']{2,})["']/g, (match, text) => {
    if (/^[\d\s\W]+$/.test(text)) return match
    const k = key()
    map[k] = text
    return match.replace(text, k)
  })

  // placeholder attributes
  template = template.replace(/\bplaceholder=["']([^"']{2,})["']/g, (match, text) => {
    const k = key()
    map[k] = text
    return match.replace(text, k)
  })

  return { template, map }
}

function applyTranslations(template: string, translated: TextMap, original: TextMap): string {
  let result = template
  for (const [k, originalText] of Object.entries(original)) {
    const translatedText = translated[k] ?? originalText
    // Use split/join to replace ALL occurrences of the placeholder
    result = result.split(k).join(translatedText)
  }
  return result
}

function parseJsonFromResponse(text: string): TextMap {
  // Handle responses that may be wrapped in markdown code blocks
  const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/) || text.match(/(\{[\s\S]*\})/)
  const raw = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : text
  return JSON.parse(raw.trim())
}

const BATCH_SIZE = 150

export async function POST(req: Request) {
  const { id, language } = await req.json()
  if (!id || !language) {
    return Response.json({ error: 'id and language are required' }, { status: 400 })
  }

  const [row] = await sql`SELECT html FROM cloned_pages WHERE id = ${id}`
  if (!row) return Response.json({ error: 'Page not found' }, { status: 404 })

  const { template, map } = extractTexts(row.html)
  const allKeys = Object.keys(map)
  const totalBatches = Math.ceil(allKeys.length / BATCH_SIZE)
  const encoder = new TextEncoder()

  const body = new ReadableStream({
    async start(controller) {
      function send(obj: object) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`))
      }

      try {
        const translated: TextMap = {}
        send({ type: 'progress', value: 0.05 })

        for (let b = 0; b < totalBatches; b++) {
          const batchKeys = allKeys.slice(b * BATCH_SIZE, (b + 1) * BATCH_SIZE)
          const batchObj: TextMap = {}
          for (const k of batchKeys) batchObj[k] = map[k]

          const stream = client.messages.stream({
            model: 'claude-sonnet-4-6',
            max_tokens: 8192,
            messages: [
              {
                role: 'user',
                content: `Translate the values in this JSON object to ${language}.

Rules:
- Translate ONLY the values, never the keys
- Keep brand names, product names, and proper nouns in the original language
- Preserve any HTML tags or special characters inside the values exactly
- Return ONLY a valid JSON object — no markdown, no explanation

JSON:
${JSON.stringify(batchObj, null, 2)}`,
              },
            ],
          })

          stream.on('text', () => {
            const batchProgress = (b + 0.5) / totalBatches
            send({ type: 'progress', value: 0.05 + batchProgress * 0.88 })
          })

          const message = await stream.finalMessage()
          const responseText = message.content[0].type === 'text' ? message.content[0].text : '{}'

          try {
            const batchTranslated = parseJsonFromResponse(responseText)
            Object.assign(translated, batchTranslated)
          } catch {
            // If JSON parse fails for this batch, keep originals
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
    },
  })
}
