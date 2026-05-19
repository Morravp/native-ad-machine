import { NextRequest } from 'next/server'
import sql from '@/lib/db'
import { extractText } from '@/lib/extract-text'
import { chunkText, embedTexts } from '@/lib/brain'

export const maxDuration = 300

export async function POST(req: NextRequest) {
  const formData = await req.formData()
  const file = formData.get('file') as File | null
  if (!file) return Response.json({ error: 'No file provided' }, { status: 400 })

  // 1. Extract text
  let text: string
  try {
    text = await extractText(file)
  } catch (err: any) {
    return Response.json({ error: `Text extraction failed: ${err.message}` }, { status: 422 })
  }

  if (!text || text.length < 50) {
    return Response.json({ error: 'Could not extract readable text from this file' }, { status: 422 })
  }

  // 2. Chunk
  const chunks = chunkText(text)
  if (chunks.length === 0) {
    return Response.json({ error: 'Document produced no usable chunks' }, { status: 422 })
  }

  // 3. Embed all chunks
  let embeddings: number[][]
  try {
    embeddings = await embedTexts(chunks)
  } catch (err: any) {
    return Response.json({ error: `Embedding failed: ${err.message}` }, { status: 500 })
  }

  // 4. Store document + chunks in a transaction
  const fileType = file.name.split('.').pop()?.toLowerCase() ?? 'txt'

  const [doc] = await sql`
    INSERT INTO brain_documents (name, file_type, chunk_count)
    VALUES (${file.name}, ${fileType}, ${chunks.length})
    RETURNING *
  `

  await sql.begin(async (tx) => {
    for (let i = 0; i < chunks.length; i++) {
      const vectorStr = '[' + embeddings[i].join(',') + ']'
      await tx`
        INSERT INTO brain_chunks (document_id, content, chunk_index, embedding)
        VALUES (${doc.id}, ${chunks[i]}, ${i}, ${vectorStr}::vector)
      `
    }
  })

  return Response.json({
    id: doc.id,
    name: doc.name,
    file_type: fileType,
    chunk_count: chunks.length,
    created_at: doc.created_at,
  })
}
