import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import sql from '@/lib/db'

const client = new Anthropic()

function stripStyles(html: string): { stripped: string; styles: string[] } {
  const styles: string[] = []
  const stripped = html.replace(/<style[^>]*>([\s\S]*?)<\/style>/gi, (block, css) => {
    styles.push(block)
    return `<!--STYLE_PLACEHOLDER_${styles.length - 1}-->`
  })
  return { stripped, styles }
}

function restoreStyles(html: string, styles: string[]): string {
  return html.replace(/<!--STYLE_PLACEHOLDER_(\d+)-->/g, (_, i) => styles[parseInt(i)] || '')
}

export async function POST(req: Request) {
  try {
    const { id, language } = await req.json()
    if (!id || !language) {
      return NextResponse.json({ error: 'id and language are required' }, { status: 400 })
    }

    const [row] = await sql`SELECT html FROM cloned_pages WHERE id = ${id}`
    if (!row) return NextResponse.json({ error: 'Page not found' }, { status: 404 })

    const { stripped, styles } = stripStyles(row.html)

    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 32000,
      messages: [
        {
          role: 'user',
          content: `Translate all visible text content in this HTML page to ${language}.

Rules:
- Translate ONLY text that appears visible to the user (inside tags like p, h1-h6, span, a, button, li, td, th, label, div text nodes, alt attributes, placeholder attributes, title attributes)
- Do NOT translate: class names, IDs, data attributes, CSS values, URLs, href values, src values, HTML tag names, or JavaScript
- Do NOT translate brand names, product names, or proper nouns that should stay in the original language
- Preserve all HTML structure, attributes, and formatting exactly — only the text content changes
- Return ONLY the complete translated HTML, no explanations, no markdown code blocks

HTML to translate:
${stripped}`,
        },
      ],
    })

    const translatedStripped = message.content[0].type === 'text' ? message.content[0].text : stripped
    const translatedHtml = restoreStyles(translatedStripped, styles)

    await sql`UPDATE cloned_pages SET html = ${translatedHtml} WHERE id = ${id}`

    return NextResponse.json({ html: translatedHtml })
  } catch (err: any) {
    console.error('translate-page error:', err)
    return NextResponse.json({ error: err.message || 'Translation failed' }, { status: 500 })
  }
}
