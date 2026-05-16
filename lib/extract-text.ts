// pdf-parse uses CommonJS; import via require to avoid ESM issues
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse: (buf: Buffer) => Promise<{ text: string }> = require('pdf-parse')

export async function extractText(file: File): Promise<string> {
  const bytes = await file.arrayBuffer()
  const buf = Buffer.from(bytes)
  const name = file.name.toLowerCase()

  if (name.endsWith('.pdf')) {
    try {
      const result = await pdfParse(buf)
      return result.text.trim()
    } catch {
      return `[Could not extract text from ${file.name}]`
    }
  }

  // .txt, .md, .docx (raw UTF-8 text fallback)
  return buf.toString('utf-8').trim()
}
