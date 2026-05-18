import { NextResponse } from 'next/server'
import sql from '@/lib/db'

export async function POST(req: Request) {
  const { liquidContent, sectionName } = await req.json()
  if (!liquidContent || !sectionName) {
    return NextResponse.json({ error: 'liquidContent and sectionName required' }, { status: 400 })
  }

  // Load credentials
  const [row] = await sql`SELECT store_url, access_token, theme_id FROM shopify_settings WHERE id = 1`
  if (!row?.store_url || !row?.access_token) {
    return NextResponse.json({ error: 'Shopify not connected' }, { status: 400 })
  }
  if (!row.theme_id) {
    return NextResponse.json({ error: 'No theme selected — finish connecting in settings' }, { status: 400 })
  }

  // Build a safe filename: sections/cloned-warning-notice.liquid
  const filename = `sections/cloned-${sectionName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50)}.liquid`

  const res = await fetch(
    `https://${row.store_url}/admin/api/2024-01/themes/${row.theme_id}/assets.json`,
    {
      method: 'PUT',
      headers: {
        'X-Shopify-Access-Token': row.access_token,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ asset: { key: filename, value: liquidContent } }),
    }
  )

  const data = await res.json()
  if (!res.ok) {
    return NextResponse.json(
      { error: data?.errors || `Shopify returned ${res.status}` },
      { status: res.status }
    )
  }

  const editorUrl = `https://${row.store_url}/admin/themes/${row.theme_id}/editor`
  return NextResponse.json({ ok: true, filename, editorUrl })
}
