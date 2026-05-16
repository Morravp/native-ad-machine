import sql from '@/lib/db'
import { NextRequest } from 'next/server'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const [board] = await sql`SELECT * FROM swipe_boards WHERE id = ${id}`
  if (!board) return Response.json({ error: 'Not found' }, { status: 404 })
  const items = await sql`
    SELECT * FROM swipe_items WHERE board_id = ${id} ORDER BY created_at DESC
  `
  return Response.json({ ...board, items })
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await req.json()
  const [row] = await sql`
    UPDATE swipe_boards
    SET name = ${body.name}, description = ${body.description ?? null}, color = ${body.color ?? '0'}
    WHERE id = ${id}
    RETURNING *
  `
  return Response.json(row)
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  await sql`DELETE FROM swipe_boards WHERE id = ${id}`
  return Response.json({ success: true })
}
