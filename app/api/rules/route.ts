import sql from '@/lib/db'
import { NextRequest } from 'next/server'

export async function GET(req: NextRequest) {
  const ad_type = req.nextUrl.searchParams.get('ad_type') || 'native_ad'
  const rows = await sql`
    SELECT * FROM global_rules
    WHERE ad_type = ${ad_type}
    ORDER BY order_index ASC
  `
  return Response.json(rows)
}

export async function POST(req: NextRequest) {
  const { rule_text, ad_type = 'native_ad' } = await req.json()
  const [{ max }] = await sql`
    SELECT COALESCE(MAX(order_index), -1) AS max FROM global_rules WHERE ad_type = ${ad_type}
  `
  const [row] = await sql`
    INSERT INTO global_rules (rule_text, order_index, ad_type)
    VALUES (${rule_text}, ${Number(max) + 1}, ${ad_type})
    RETURNING *
  `
  return Response.json(row)
}
