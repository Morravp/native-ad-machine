import sql from '@/lib/db'
import { NextRequest } from 'next/server'

export async function GET() {
  const rows = await sql`
    SELECT a.*, b.name AS brand_name
    FROM ads a
    LEFT JOIN brands b ON b.id = a.brand_id
    ORDER BY a.created_at DESC
  `
  return Response.json(rows)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const [row] = await sql`
    INSERT INTO ads (ad_id, brand_id, country, badge_number, body, competitor_ad, extra_context)
    VALUES (
      ${body.ad_id}, ${body.brand_id}, ${body.country}, ${body.badge_number},
      ${body.body}, ${body.competitor_ad ?? null}, ${body.extra_context ?? null}
    )
    RETURNING *
  `
  await sql`UPDATE brands SET ad_count = ad_count + 1 WHERE id = ${body.brand_id}`
  return Response.json(row)
}
