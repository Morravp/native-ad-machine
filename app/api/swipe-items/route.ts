import sql from '@/lib/db'
import { NextRequest } from 'next/server'

// Allow Chrome extension (chrome-extension://) to POST here
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

export async function GET(req: NextRequest) {
  const board_id = req.nextUrl.searchParams.get('board_id')
  const rows = board_id
    ? await sql`
        SELECT i.*, b.name AS board_name
        FROM swipe_items i
        LEFT JOIN swipe_boards b ON b.id = i.board_id
        WHERE i.board_id = ${board_id}
        ORDER BY i.created_at DESC
      `
    : await sql`
        SELECT i.*, b.name AS board_name
        FROM swipe_items i
        LEFT JOIN swipe_boards b ON b.id = i.board_id
        ORDER BY i.created_at DESC
      `
  return Response.json(rows, { headers: corsHeaders() })
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const [row] = await sql`
    INSERT INTO swipe_items (board_id, advertiser_name, headline, ad_copy, image_url, video_url, source_url, notes, tags)
    VALUES (
      ${body.board_id ?? null},
      ${body.advertiser_name ?? null},
      ${body.headline ?? null},
      ${body.ad_copy ?? null},
      ${body.image_url ?? null},
      ${body.video_url ?? null},
      ${body.source_url ?? null},
      ${body.notes ?? null},
      ${body.tags ?? []}
    )
    RETURNING *
  `
  return Response.json(row, { headers: corsHeaders() })
}
