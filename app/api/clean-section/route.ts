import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic()

export async function POST(req: Request) {
  const { sectionHtml, pageStyles, pageUrl } = await req.json()
  if (!sectionHtml) return Response.json({ error: 'sectionHtml required' }, { status: 400 })

  const prompt = `You are an expert HTML/CSS developer specializing in landing pages and Shopify themes.

I have scraped a section from a landing page at ${pageUrl || 'unknown URL'}. Your job is to rewrite it as clean, production-ready HTML+CSS.

ORIGINAL SECTION HTML:
\`\`\`html
${String(sectionHtml).slice(0, 25000)}
\`\`\`

${pageStyles ? `RELEVANT PAGE STYLES:
\`\`\`css
${String(pageStyles).slice(0, 12000)}
\`\`\`` : ''}

Write a clean, self-contained version of this section. Requirements:
- All CSS in a single <style> block at the top (no external stylesheets, no CDN)
- Preserve the exact visual design: colors, fonts, spacing, layout, and copy
- Use semantic HTML5 elements where appropriate
- Keep all original image src URLs exactly as they appear
- No JavaScript
- No Tailwind, Bootstrap, or other framework classes — write plain CSS
- Scoped class names (prefix with .sec- to avoid Shopify theme conflicts)
- Ready to paste directly into a Shopify liquid section

Return ONLY the HTML code. Start with <style> and end with the closing tag of the section. No explanation, no markdown fences.`

  try {
    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 8192,
      messages: [{ role: 'user', content: prompt }],
    })

    let html = message.content[0]?.type === 'text' ? message.content[0].text.trim() : ''

    // Strip any accidental markdown fences
    const fenced = html.match(/```(?:html)?\s*([\s\S]*?)```/)
    if (fenced) html = fenced[1].trim()

    return Response.json({ html })
  } catch (err: any) {
    console.error('clean-section error:', err)
    return Response.json({ error: err.message || 'Generation failed' }, { status: 500 })
  }
}
