import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic()

export async function POST(req: Request) {
  const { sectionHtml, pageStyles, pageUrl } = await req.json()
  if (!sectionHtml) return Response.json({ error: 'sectionHtml required' }, { status: 400 })

  const prompt = `You are a senior Shopify theme developer. Convert the scraped HTML section below into a complete, production-ready Shopify Liquid section file (.liquid).

SOURCE URL: ${pageUrl || 'unknown'}

ORIGINAL SECTION HTML:
\`\`\`html
${String(sectionHtml).slice(0, 25000)}
\`\`\`

${pageStyles ? `PAGE STYLES (for reference):
\`\`\`css
${String(pageStyles).slice(0, 10000)}
\`\`\`` : ''}

---

OUTPUT REQUIREMENTS:

## 1 — CSS (top of file, inside <style> tag)
- Scope every class name with {{ section.id }}: e.g. .sec-hero-{{ section.id }}
- Recreate the exact visual design: colors, fonts, spacing, layout, border-radius, shadows
- No external stylesheets, no CDN links — write everything inline
- Include @media queries for mobile (max-width: 768px)

## 2 — HTML template (Liquid)
Replace ALL hardcoded content with Liquid variables:

TEXT & COPY:
- Short labels, titles, button text → {{ section.settings.xxx }}
- Paragraphs, body copy → {{ section.settings.xxx | newline_to_br }}
- Rich content with bold/italic/links → {{ section.settings.xxx }}  (richtext type)

IMAGES:
\`\`\`liquid
{% if section.settings.xxx_image != blank %}
  <img src="{{ section.settings.xxx_image | image_url: width: 1200 }}" alt="{{ section.settings.xxx_image.alt | escape }}" loading="lazy">
{% else %}
  <img src="ORIGINAL_SRC_URL" alt="fallback alt text" loading="lazy">
{% endif %}
\`\`\`

LINKS / CTAs:
- href values → {{ section.settings.xxx_link }}
- Button text → {{ section.settings.xxx_text }}

REPEATABLE ITEMS (testimonials, FAQ, features, icons, steps, cards):
- Use {% for block in section.blocks %} … {% endfor %}
- Add {{ block.shopify_attributes }} on each block's root element
- Define a block type per item in the schema

COLORS (if the section has a configurable background or accent color):
- Expose as color settings → {{ section.settings.bg_color }}

## 3 — Schema (bottom of file)
\`\`\`liquid
{% schema %}
{
  "name": "Descriptive Section Name",
  "tag": "section",
  "class": "shopify-section",
  "settings": [
    // one entry per {{ section.settings.xxx }} used above
    // include "default" from the original copy
    // types: text | textarea | richtext | image_picker | url | color | checkbox | range | select | number | html
  ],
  "blocks": [
    // only if you used {% for block in section.blocks %}
    {
      "type": "item_type",
      "name": "Item Label",
      "settings": [ ... ]
    }
  ],
  "presets": [
    {
      "name": "Descriptive Section Name"
    }
  ]
}
{% endschema %}
\`\`\`

SCHEMA RULES:
- Every {{ section.settings.xxx }} MUST have a matching settings entry
- Every {{ block.settings.xxx }} MUST have a matching entry in the blocks array
- "default" must be the actual original text/value from the scraped HTML
- "label" must be human-readable: "Headline", "Body text", "Button URL", etc.
- Give the section a name matching its content: "Product Hero", "Testimonials", "FAQ Accordion", "Warning Notice", etc.

---

Return ONLY the raw Liquid code.
Start with <style> (or {%- liquid -%} if needed).
End with {% endschema %}.
No markdown fences. No explanation.`

  try {
    const message = await client.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 8192,
      messages: [{ role: 'user', content: prompt }],
    })

    let liquid = message.content[0]?.type === 'text' ? message.content[0].text.trim() : ''

    // Strip any accidental markdown fences
    const fenced = liquid.match(/```(?:liquid|html)?\s*([\s\S]*?)```/)
    if (fenced) liquid = fenced[1].trim()

    return Response.json({ html: liquid })
  } catch (err: any) {
    console.error('clean-section error:', err)
    return Response.json({ error: err.message || 'Generation failed' }, { status: 500 })
  }
}
