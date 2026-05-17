import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import sql from '@/lib/db'

export const maxDuration = 300

const client = new Anthropic()

function stripBulk(html: string): { stripped: string; styles: string[]; scripts: string[] } {
  const styles: string[] = []
  const scripts: string[] = []

  let stripped = html.replace(/<style[^>]*>([\s\S]*?)<\/style>/gi, (block) => {
    styles.push(block)
    return `<!--STYLE_${styles.length - 1}-->`
  })
  stripped = stripped.replace(/<script[^>]*>([\s\S]*?)<\/script>/gi, (block) => {
    scripts.push(block)
    return `<!--SCRIPT_${scripts.length - 1}-->`
  })
  // Strip HTML comments to reduce size
  stripped = stripped.replace(/<!--(?!STYLE_|SCRIPT_)[\s\S]*?-->/g, '')

  return { stripped, styles, scripts }
}

function restoreBulk(html: string, styles: string[], scripts: string[]): string {
  return html
    .replace(/<!--STYLE_(\d+)-->/g, (_, i) => styles[parseInt(i)] || '')
    .replace(/<!--SCRIPT_(\d+)-->/g, (_, i) => scripts[parseInt(i)] || '')
}

export async function POST(req: Request) {
  try {
    const { id, language } = await req.json()
    if (!id || !language) {
      return NextResponse.json({ error: 'id and language are required' }, { status: 400 })
    }

    const [row] = await sql`SELECT html FROM cloned_pages WHERE id = ${id}`
    if (!row) return NextResponse.json({ error: 'Page not found' }, { status: 404 })

    const { stripped, styles, scripts } = stripBulk(row.html)

    // Use streaming to avoid SDK timeout error on large pages
    const stream = client.messages.stream({
      model: 'claude-sonnet-4-6',
      max_tokens: 16000,
      messages: [
        {
          role: 'user',
          content: `Translate all visible user-facing text in this HTML to ${language}.

Rules:
- Translate ONLY visible text: content inside p, h1-h6, span, a, button, li, td, th, label, div text nodes, plus alt/placeholder/title attributes
- Do NOT translate: class names, IDs, data-* attributes, CSS values, URLs, href/src values, HTML tag names
- Keep brand names, product names, and proper nouns in their original language
- Preserve all HTML structure and attributes exactly
- Return ONLY the complete HTML, no markdown, no explanation

HTML:
${stripped}`,
        },
      ],
    })

    const message = await stream.finalMessage()
    const translatedStripped = message.content[0].type === 'text' ? message.content[0].text : stripped
    const translatedHtml = restoreBulk(translatedStripped, styles, scripts)

    await sql`UPDATE cloned_pages SET html = ${translatedHtml} WHERE id = ${id}`

    return NextResponse.json({ html: translatedHtml })
  } catch (err: any) {
    console.error('translate-page error:', err)
    return NextResponse.json({ error: err.message || 'Translation failed' }, { status: 500 })
  }
}
