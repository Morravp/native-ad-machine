import sql from '@/lib/db'
import { NextRequest } from 'next/server'

export async function GET() {
  const rows = await sql`
    SELECT * FROM brands ORDER BY created_at ASC
  `
  return Response.json(rows)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const [row] = await sql`
    INSERT INTO brands (name, countries, extra_rules, notes, ad_count)
    VALUES (${body.name}, ${body.countries}, ${body.extra_rules ?? null}, ${body.notes ?? null}, 0)
    RETURNING *
  `
  return Response.json(row)
}
