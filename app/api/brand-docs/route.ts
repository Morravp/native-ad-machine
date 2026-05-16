import sql from '@/lib/db'
import { NextRequest } from 'next/server'
import { extractText } from '@/lib/extract-text'

export async function POST(req: NextRequest) {
  const formData = await req.formData()
  const brandId = formData.get('brand_id') as string
  const type = formData.get('type') as 'product' | 'persona'
  const file = formData.get('file') as File

  if (!file || !brandId) {
    return Response.json({ error: 'Missing file or brand_id' }, { status: 400 })
  }

  const content = await extractText(file)

  const [row] = await sql`
    INSERT INTO brand_docs (brand_id, name, type, content)
    VALUES (${brandId}, ${file.name}, ${type}, ${content})
    RETURNING *
  `
  return Response.json(row)
}

export async function DELETE(req: NextRequest) {
  const { id } = await req.json()
  await sql`DELETE FROM brand_docs WHERE id = ${id}`
  return Response.json({ success: true })
}
