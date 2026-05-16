import { NextRequest } from 'next/server'
import { extractText } from '@/lib/extract-text'

// Returns extracted text from the uploaded file.
// The generator passes this text directly in the generate request body.
export async function POST(req: NextRequest) {
  const formData = await req.formData()
  const file = formData.get('file') as File
  if (!file) return Response.json({ error: 'Missing file' }, { status: 400 })

  const text = await extractText(file)
  return Response.json({ text, name: file.name })
}
