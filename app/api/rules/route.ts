import sql from '@/lib/db'
import { NextRequest } from 'next/server'

export async function GET() {
  const rows = await sql`SELECT * FROM global_rules ORDER BY order_index ASC`
  return Response.json(rows)
}

export async function POST(req: NextRequest) {
  const { rule_text } = await req.json()
  const [{ max }] = await sql`SELECT COALESCE(MAX(order_index), -1) AS max FROM global_rules`
  const [row] = await sql`
    INSERT INTO global_rules (rule_text, order_index)
    VALUES (${rule_text}, ${Number(max) + 1})
    RETURNING *
  `
  return Response.json(row)
}
