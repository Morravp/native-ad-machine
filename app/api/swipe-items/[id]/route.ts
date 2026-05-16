import sql from '@/lib/db'
import { NextRequest } from 'next/server'

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  }
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders() })
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await req.json()
  const [row] = await sql`
    UPDATE swipe_items
    SET
      board_id = ${body.board_id ?? null},
      advertiser_name = ${body.advertiser_name ?? null},
      headline = ${body.headline ?? null},
      ad_copy = ${body.ad_copy ?? null},
      image_url = ${body.image_url ?? null},
      video_url = ${body.video_url ?? null},
      source_url = ${body.source_url ?? null},
      notes = ${body.notes ?? null},
      tags = ${body.tags ?? []}
    WHERE id = ${id}
    RETURNING *
  `
  return Response.json(row, { headers: corsHeaders() })
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  await sql`DELETE FROM swipe_items WHERE id = ${id}`
  return Response.json({ success: true }, { headers: corsHeaders() })
}
