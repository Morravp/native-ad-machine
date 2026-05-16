import sql from '@/lib/db'
import { NextRequest } from 'next/server'

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  await sql`DELETE FROM format_examples WHERE id = ${id}`
  return Response.json({ success: true })
}
