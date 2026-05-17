import { NextResponse } from 'next/server'
import sql from '@/lib/db'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [row] = await sql`SELECT * FROM cloned_pages WHERE id = ${id}`
  if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(row)
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await sql`DELETE FROM cloned_pages WHERE id = ${id}`
  return NextResponse.json({ ok: true })
}
