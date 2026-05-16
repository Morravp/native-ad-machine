import sql from '@/lib/db'
import { NextRequest } from 'next/server'

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  }
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders() })
}

export async function GET() {
  const rows = await sql`
    SELECT b.*, COUNT(i.id)::int AS item_count
    FROM swipe_boards b
    LEFT JOIN swipe_items i ON i.board_id = b.id
    GROUP BY b.id
    ORDER BY b.created_at ASC
  `
  return Response.json(rows, { headers: corsHeaders() })
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const [row] = await sql`
    INSERT INTO swipe_boards (name, description, color)
    VALUES (${body.name}, ${body.description ?? null}, ${body.color ?? '0'})
    RETURNING *
  `
  return Response.json(row, { headers: corsHeaders() })
}
