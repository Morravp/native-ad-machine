import sql from '@/lib/db'
import { NextRequest } from 'next/server'
import { extractText } from '@/lib/extract-text'

export async function GET(req: NextRequest) {
  const ad_type = req.nextUrl.searchParams.get('ad_type') || 'native_ad'
  const rows = await sql`
    SELECT * FROM format_examples
    WHERE ad_type = ${ad_type}
    ORDER BY created_at DESC
  `
  return Response.json(rows)
}

export async function POST(req: NextRequest) {
  const formData = await req.formData()
  const label = (formData.get('label') as string) || ''
  const ad_type = (formData.get('ad_type') as string) || 'native_ad'
  const file = formData.get('file') as File
  if (!file) return Response.json({ error: 'Missing file' }, { status: 400 })

  const content = await extractText(file)
  const [row] = await sql`
    INSERT INTO format_examples (label, file_name, content, ad_type)
    VALUES (${label || file.name}, ${file.name}, ${content}, ${ad_type})
    RETURNING *
  `
  return Response.json(row)
}
