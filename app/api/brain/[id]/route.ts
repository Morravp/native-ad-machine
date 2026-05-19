import sql from '@/lib/db'
import { NextRequest } from 'next/server'

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  // Chunks are deleted automatically via ON DELETE CASCADE
  await sql`DELETE FROM brain_documents WHERE id = ${id}`
  return Response.json({ success: true })
}
