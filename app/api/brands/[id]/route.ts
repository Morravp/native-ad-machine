import sql from '@/lib/db'
import { NextRequest } from 'next/server'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const [brand] = await sql`SELECT * FROM brands WHERE id = ${id}`
  if (!brand) return Response.json({ error: 'Not found' }, { status: 404 })

  const docs = await sql`SELECT * FROM brand_docs WHERE brand_id = ${id} ORDER BY created_at`
  return Response.json({ ...brand, docs })
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await req.json()
  const [row] = await sql`
    UPDATE brands
    SET name = ${body.name},
        countries = ${body.countries},
        extra_rules = ${body.extra_rules ?? null},
        notes = ${body.notes ?? null}
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
  await sql`DELETE FROM brands WHERE id = ${id}`
  return Response.json({ success: true })
}
