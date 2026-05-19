import sql from '@/lib/db'

const VOYAGE_MODEL = 'voyage-3'  // 1024-dim, high quality
const CHUNK_SIZE = 400           // words per chunk
const CHUNK_OVERLAP = 40         // word overlap between adjacent chunks

// ── Text chunking ──────────────────────────────────────────────────────────────

export function chunkText(text: string): string[] {
  const cleaned = text.replace(/\s+/g, ' ').trim()
  const words = cleaned.split(' ').filter(w => w.length > 0)
  const chunks: string[] = []
  let i = 0
  while (i < words.length) {
    const chunk = words.slice(i, i + CHUNK_SIZE).join(' ')
    if (chunk.length > 80) chunks.push(chunk)
    i += CHUNK_SIZE - CHUNK_OVERLAP
  }
  return chunks
}

// ── Voyage AI embeddings ───────────────────────────────────────────────────────

async function embedBatch(texts: string[]): Promise<number[][]> {
  const key = process.env.VOYAGE_API_KEY
  if (!key) throw new Error('VOYAGE_API_KEY environment variable is not set')

  const res = await fetch('https://api.voyageai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${key}`,
    },
    body: JSON.stringify({ model: VOYAGE_MODEL, input: texts }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Voyage AI error ${res.status}: ${err}`)
  }

  const data = await res.json()
  return data.data.map((d: { embedding: number[] }) => d.embedding)
}

export async function embedTexts(texts: string[]): Promise<number[][]> {
  // Voyage AI allows up to 128 texts per request
  const BATCH = 100
  const all: number[][] = []
  for (let i = 0; i < texts.length; i += BATCH) {
    const embeddings = await embedBatch(texts.slice(i, i + BATCH))
    all.push(...embeddings)
  }
  return all
}

// ── Retrieval ──────────────────────────────────────────────────────────────────

export async function retrieveRelevantChunks(
  queryText: string,
  topK = 6
): Promise<string[]> {
  // If there's nothing in the brain yet, skip silently
  const [{ count }] = await sql`SELECT COUNT(*)::int AS count FROM brain_chunks`
  if ((count as number) === 0) return []

  const [embedding] = await embedTexts([queryText])
  const vectorStr = '[' + embedding.join(',') + ']'

  const rows = await sql`
    SELECT content
    FROM brain_chunks
    ORDER BY embedding <=> ${vectorStr}::vector
    LIMIT ${topK}
  `
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return rows.map((r: any) => r.content as string)
}
