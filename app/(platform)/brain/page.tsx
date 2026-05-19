'use client'

import { useEffect, useRef, useState } from 'react'

interface BrainDoc {
  id: string
  name: string
  file_type: string
  chunk_count: number
  created_at: string
}

interface UploadJob {
  id: string
  fileName: string
  status: 'uploading' | 'done' | 'error'
  error?: string
  chunk_count?: number
}

export default function BrainPage() {
  const [docs, setDocs] = useState<BrainDoc[]>([])
  const [totalChunks, setTotalChunks] = useState(0)
  const [loading, setLoading] = useState(true)
  const [jobs, setJobs] = useState<UploadJob[]>([])
  const [dragging, setDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function loadDocs() {
    const res = await fetch('/api/brain')
    const data = await res.json()
    setDocs(data.documents ?? [])
    setTotalChunks(data.total_chunks ?? 0)
    setLoading(false)
  }

  useEffect(() => { loadDocs() }, [])

  async function uploadFile(file: File) {
    const jobId = Math.random().toString(36).slice(2)
    setJobs(prev => [...prev, { id: jobId, fileName: file.name, status: 'uploading' }])

    const fd = new FormData()
    fd.append('file', file)

    try {
      const res = await fetch('/api/brain/upload', { method: 'POST', body: fd })
      const data = await res.json()

      if (!res.ok) {
        setJobs(prev => prev.map(j => j.id === jobId
          ? { ...j, status: 'error', error: data.error ?? 'Upload failed' }
          : j
        ))
        return
      }

      setJobs(prev => prev.map(j => j.id === jobId
        ? { ...j, status: 'done', chunk_count: data.chunk_count }
        : j
      ))
      setDocs(prev => [data, ...prev])
      setTotalChunks(prev => prev + (data.chunk_count ?? 0))
    } catch {
      setJobs(prev => prev.map(j => j.id === jobId
        ? { ...j, status: 'error', error: 'Network error' }
        : j
      ))
    }
  }

  function handleFiles(files: FileList | null) {
    if (!files) return
    Array.from(files).forEach(uploadFile)
  }

  async function deleteDoc(id: string, chunkCount: number) {
    if (!confirm('Remove this document from the Marketing Brain?')) return
    await fetch(`/api/brain/${id}`, { method: 'DELETE' })
    setDocs(prev => prev.filter(d => d.id !== id))
    setTotalChunks(prev => Math.max(0, prev - chunkCount))
  }

  function fileTypeBadge(type: string) {
    const colors: Record<string, string> = {
      pdf: '#e05c5c',
      docx: '#5b8dee',
      doc: '#5b8dee',
      txt: '#4caf7d',
      md: '#4caf7d',
    }
    return colors[type] ?? '#a374ea'
  }

  function timeAgo(dateStr: string) {
    const diff = Date.now() - new Date(dateStr).getTime()
    const days = Math.floor(diff / 86400000)
    if (days === 0) return 'Today'
    if (days === 1) return '1d ago'
    if (days < 30) return `${days}d ago`
    return `${Math.floor(days / 30)}mo ago`
  }

  const activeJobs = jobs.filter(j => j.status === 'uploading')

  return (
    <>
      <div className="topbar">
        <div>
          <div className="topbar-title">Marketing Brain</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          {totalChunks > 0 && (
            <div style={{ fontSize: 12, color: 'var(--text3)' }}>
              {docs.length} doc{docs.length !== 1 ? 's' : ''} · {totalChunks.toLocaleString()} chunks
            </div>
          )}
          <button className="btn btn-accent" onClick={() => fileInputRef.current?.click()}>
            + Upload Documents
          </button>
        </div>
      </div>

      <div className="content">

        {/* What is this */}
        <div style={{
          background: 'var(--bg2)', border: '1px solid var(--border)',
          borderRadius: 10, padding: '14px 18px', marginBottom: 20,
          display: 'flex', gap: 12, alignItems: 'flex-start',
        }}>
          <span style={{ fontSize: 20, flexShrink: 0 }}>🧠</span>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text1)', marginBottom: 3 }}>
              Your Marketing Knowledge Base
            </div>
            <div style={{ fontSize: 12, color: 'var(--text3)', lineHeight: 1.6 }}>
              Upload your e-commerce, direct response, and marketing documents here.
              Every ad and VSL you generate will automatically draw from the most relevant knowledge in this library —
              injected silently into every prompt. The more you add, the smarter your outputs become.
              Supports PDF, DOCX, TXT.
            </div>
          </div>
        </div>

        {/* Upload zone */}
        <div
          style={{
            border: `2px dashed ${dragging ? 'var(--accent)' : 'var(--border)'}`,
            borderRadius: 10,
            padding: '28px 20px',
            textAlign: 'center',
            marginBottom: 20,
            background: dragging ? 'rgba(232,197,71,0.04)' : 'var(--bg2)',
            cursor: 'pointer',
            transition: 'all 0.15s',
          }}
          onClick={() => fileInputRef.current?.click()}
          onDragOver={e => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={e => { e.preventDefault(); setDragging(false); handleFiles(e.dataTransfer.files) }}
        >
          <div style={{ fontSize: 28, marginBottom: 8 }}>⬆</div>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text1)' }}>
            Drag & drop files here, or click to browse
          </div>
          <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>
            PDF, DOCX, TXT — multiple files at once supported
          </div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,.docx,.doc,.txt,.md"
          style={{ display: 'none' }}
          onChange={e => { handleFiles(e.target.files); e.target.value = '' }}
        />

        {/* Active upload jobs */}
        {jobs.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
            {jobs.map(job => (
              <div key={job.id} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                background: 'var(--bg2)', border: '1px solid var(--border)',
                borderRadius: 8, padding: '10px 14px',
              }}>
                {job.status === 'uploading' && (
                  <span className="spinner" style={{ flexShrink: 0 }} />
                )}
                {job.status === 'done' && (
                  <span style={{ color: 'var(--green)', flexShrink: 0 }}>✓</span>
                )}
                {job.status === 'error' && (
                  <span style={{ color: 'var(--red)', flexShrink: 0 }}>✕</span>
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {job.fileName}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text3)' }}>
                    {job.status === 'uploading' && 'Extracting text, chunking, generating embeddings…'}
                    {job.status === 'done' && `Done — ${job.chunk_count} chunks created`}
                    {job.status === 'error' && `Error: ${job.error}`}
                  </div>
                </div>
                {job.status !== 'uploading' && (
                  <button
                    onClick={() => setJobs(prev => prev.filter(j => j.id !== job.id))}
                    style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: 14 }}
                  >✕</button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Document list */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: 48, color: 'var(--text3)', fontSize: 13 }}>Loading…</div>
        ) : docs.length === 0 && activeJobs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 48, color: 'var(--text3)', fontSize: 13 }}>
            No documents uploaded yet.<br />
            Upload your marketing and e-commerce knowledge to get started.
          </div>
        ) : (
          <div style={{
            background: 'var(--bg2)', border: '1px solid var(--border)',
            borderRadius: 10, overflow: 'hidden',
          }}>
            {docs.map((doc, i) => (
              <div key={doc.id} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '12px 16px',
                borderBottom: i < docs.length - 1 ? '1px solid var(--border)' : 'none',
              }}>
                {/* File type badge */}
                <div style={{
                  fontSize: 9, fontWeight: 800, letterSpacing: '0.06em',
                  color: '#fff', background: fileTypeBadge(doc.file_type),
                  borderRadius: 4, padding: '2px 6px', flexShrink: 0,
                  textTransform: 'uppercase',
                }}>
                  {doc.file_type}
                </div>

                {/* Name */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: 13, fontWeight: 600, color: 'var(--text1)',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {doc.name}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>
                    {doc.chunk_count} chunks · added {timeAgo(doc.created_at)}
                  </div>
                </div>

                {/* Delete */}
                <button
                  onClick={() => deleteDoc(doc.id, doc.chunk_count)}
                  className="btn btn-sm"
                  style={{ color: 'var(--red)', flexShrink: 0 }}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  )
}
