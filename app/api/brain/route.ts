import sql from '@/lib/db'

export async function GET() {
  const docs = await sql`
    SELECT id, name, file_type, chunk_count, created_at
    FROM brain_documents
    ORDER BY created_at DESC
  `
  const [{ total_chunks }] = await sql`
    SELECT COALESCE(SUM(chunk_count), 0)::int AS total_chunks
    FROM brain_documents
  `
  return Response.json({ documents: docs, total_chunks })
}
