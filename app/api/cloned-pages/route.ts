import { NextResponse } from 'next/server'
import sql from '@/lib/db'

export async function GET() {
  const rows = await sql`
    SELECT id, url, title, created_at
    FROM cloned_pages
    ORDER BY created_at DESC
  `
  return NextResponse.json(rows)
}
