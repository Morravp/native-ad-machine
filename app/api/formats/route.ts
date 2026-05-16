import sql from '@/lib/db'
import { NextRequest } from 'next/server'
import { extractText } from '@/lib/extract-text'

export async function GET() {
  const rows = await sql`SELECT * FROM format_examples ORDER BY created_at DESC`
  return Response.json(rows)
}

export async function POST(req: NextRequest) {
  const formData = await req.formData()
  const label = (formData.get('label') as string) || ''
  const file = formData.get('file') as File
  if (!file) return Response.json({ error: 'Missing file' }, { status: 400 })

  const content = await extractText(file)
  const [row] = await sql`
    INSERT INTO format_examples (label, file_name, content)
    VALUES (${label || file.name}, ${file.name}, ${content})
    RETURNING *
  `
  return Response.json(row)
}
