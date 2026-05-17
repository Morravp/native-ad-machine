import { NextResponse } from 'next/server'
import sql from '@/lib/db'

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'

function resolveUrl(href: string, base: string): string {
  try {
    return new URL(href, base).href
  } catch {
    return href
  }
}

function extractTitle(html: string): string {
  const m = html.match(/<title[^>]*>([^<]*)<\/title>/i)
  return m ? m[1].trim() : ''
}

async function fetchText(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { 'User-Agent': UA },
    signal: AbortSignal.timeout(10000),
  })
  if (!res.ok) return ''
  return res.text()
}

async function inlineCss(html: string, baseUrl: string): Promise<string> {
  const linkPattern = /<link([^>]*?)>/gi
  const results: Array<{ original: string; replacement: string }> = []
  let match: RegExpExecArray | null

  while ((match = linkPattern.exec(html)) !== null) {
    const tag = match[0]
    const attrs = match[1]
    if (!/rel=["']stylesheet["']/i.test(attrs)) continue

    const hrefMatch = attrs.match(/href=["']([^"']+)["']/i)
    if (!hrefMatch) continue

    const cssUrl = resolveUrl(hrefMatch[1], baseUrl)
    if (!cssUrl.startsWith('http')) continue

    try {
      const cssText = await fetchText(cssUrl)
      if (cssText) {
        const fixedCss = cssText.replace(/url\(["']?([^)"']+)["']?\)/g, (m, p) => {
          if (p.startsWith('data:') || p.startsWith('http')) return m
          return `url("${resolveUrl(p, cssUrl)}")`
        })
        results.push({ original: tag, replacement: `<style>${fixedCss}</style>` })
      }
    } catch {
      // skip failed CSS fetches
    }
  }

  let result = html
  for (const { original, replacement } of results) {
    result = result.replace(original, replacement)
  }
  return result
}

function fixRelativeUrls(html: string, baseUrl: string): string {
  return html.replace(/(?:href|src|action)=["']([^"'#][^"']*?)["']/gi, (match, url) => {
    if (url.startsWith('http') || url.startsWith('//') || url.startsWith('data:') || url.startsWith('mailto:') || url.startsWith('tel:')) {
      return match
    }
    const absolute = resolveUrl(url, baseUrl)
    return match.replace(url, absolute)
  })
}

function removeScripts(html: string): string {
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<noscript\b[^<]*(?:(?!<\/noscript>)<[^<]*)*<\/noscript>/gi, '')
}

function removeTrackers(html: string): string {
  return html
    .replace(/<link[^>]*\brel=["'](?:preconnect|dns-prefetch)["'][^>]*>/gi, '')
    .replace(/<meta[^>]*\b(?:googlebot|robots)[^>]*>/gi, '')
}

export async function POST(req: Request) {
  try {
    const { url } = await req.json()
    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 })
    }

    let targetUrl: string
    try {
      targetUrl = new URL(url).href
    } catch {
      return NextResponse.json({ error: 'Invalid URL' }, { status: 400 })
    }

    const res = await fetch(targetUrl, {
      headers: { 'User-Agent': UA },
      signal: AbortSignal.timeout(15000),
    })

    if (!res.ok) {
      return NextResponse.json({ error: `Could not fetch page: ${res.status} ${res.statusText}` }, { status: 400 })
    }

    let html = await res.text()
    const finalUrl = res.url || targetUrl
    const title = extractTitle(html)

    html = await inlineCss(html, finalUrl)
    html = fixRelativeUrls(html, finalUrl)
    html = removeScripts(html)
    html = removeTrackers(html)

    const base64Url = `<base href="${finalUrl}" />`
    if (html.includes('<head>')) {
      html = html.replace('<head>', '<head>' + base64Url)
    } else if (html.includes('<head ')) {
      html = html.replace(/<head[^>]*>/, (m) => m + base64Url)
    }

    const [{ id }] = await sql`
      INSERT INTO cloned_pages (url, title, html)
      VALUES (${finalUrl}, ${title}, ${html})
      RETURNING id
    `

    return NextResponse.json({ id, title })
  } catch (err: any) {
    console.error('clone-page error:', err)
    return NextResponse.json({ error: err.message || 'Failed to clone page' }, { status: 500 })
  }
}
