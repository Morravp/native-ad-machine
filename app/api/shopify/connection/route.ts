import { NextResponse } from 'next/server'
import sql from '@/lib/db'

async function ensureTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS shopify_settings (
      id INTEGER PRIMARY KEY DEFAULT 1,
      store_url TEXT,
      access_token TEXT,
      theme_id TEXT,
      theme_name TEXT,
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      CHECK (id = 1)
    )
  `
}

// GET — return connection status (never return the token)
export async function GET() {
  await ensureTable()
  const [row] = await sql`SELECT store_url, theme_id, theme_name FROM shopify_settings WHERE id = 1`
  if (!row?.store_url) return NextResponse.json({ connected: false })
  return NextResponse.json({
    connected: true,
    storeUrl: row.store_url,
    themeId: row.theme_id,
    themeName: row.theme_name,
  })
}

// POST — save credentials + return available themes
export async function POST(req: Request) {
  await ensureTable()
  const { storeUrl, accessToken } = await req.json()
  if (!storeUrl || !accessToken) {
    return NextResponse.json({ error: 'storeUrl and accessToken required' }, { status: 400 })
  }

  const normalised = storeUrl.replace(/^https?:\/\//, '').replace(/\/$/, '')

  // Validate by fetching the shop
  let shopName = normalised
  try {
    const res = await fetch(`https://${normalised}/admin/api/2024-01/shop.json`, {
      headers: { 'X-Shopify-Access-Token': accessToken },
    })
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      return NextResponse.json(
        { error: body?.errors || 'Invalid credentials — check your store URL and token.' },
        { status: 400 }
      )
    }
    const data = await res.json()
    shopName = data.shop?.name ?? normalised
  } catch {
    return NextResponse.json({ error: 'Could not reach Shopify. Check the store URL.' }, { status: 400 })
  }

  // Fetch available themes
  let themes: { id: string; name: string; role: string }[] = []
  try {
    const res = await fetch(`https://${normalised}/admin/api/2024-01/themes.json`, {
      headers: { 'X-Shopify-Access-Token': accessToken },
    })
    const data = await res.json()
    themes = (data.themes ?? []).map((t: any) => ({
      id: String(t.id),
      name: t.name,
      role: t.role, // 'main' = live theme
    }))
  } catch { /* non-fatal */ }

  // Upsert credentials
  await sql`
    INSERT INTO shopify_settings (id, store_url, access_token, updated_at)
    VALUES (1, ${normalised}, ${accessToken}, NOW())
    ON CONFLICT (id) DO UPDATE SET
      store_url    = EXCLUDED.store_url,
      access_token = EXCLUDED.access_token,
      theme_id     = NULL,
      theme_name   = NULL,
      updated_at   = NOW()
  `

  return NextResponse.json({ ok: true, shopName, themes })
}

// PATCH — save selected theme
export async function PATCH(req: Request) {
  await ensureTable()
  const { themeId, themeName } = await req.json()
  if (!themeId) return NextResponse.json({ error: 'themeId required' }, { status: 400 })
  await sql`
    UPDATE shopify_settings SET theme_id = ${themeId}, theme_name = ${themeName ?? ''}, updated_at = NOW() WHERE id = 1
  `
  return NextResponse.json({ ok: true })
}

// DELETE — disconnect
export async function DELETE() {
  await ensureTable()
  await sql`DELETE FROM shopify_settings WHERE id = 1`
  return NextResponse.json({ ok: true })
}
