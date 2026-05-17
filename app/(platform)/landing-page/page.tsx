'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface Clone {
  id: string
  url: string
  title: string
  created_at: string
}

export default function LandingPageList() {
  const router = useRouter()
  const [clones, setClones] = useState<Clone[]>([])
  const [loading, setLoading] = useState(true)
  const [url, setUrl] = useState('')
  const [cloning, setCloning] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/cloned-pages')
      .then(r => r.json())
      .then(data => { setClones(Array.isArray(data) ? data : []); setLoading(false) })
  }, [])

  async function handleClone(e: React.FormEvent) {
    e.preventDefault()
    if (!url.trim()) return
    setCloning(true)
    setError('')
    try {
      const res = await fetch('/api/clone-page', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Clone failed')
      router.push(`/landing-page/${data.id}`)
    } catch (err: any) {
      setError(err.message)
      setCloning(false)
    }
  }

  async function deleteClone(id: string, e: React.MouseEvent) {
    e.preventDefault()
    if (!confirm('Delete this clone?')) return
    await fetch(`/api/cloned-pages/${id}`, { method: 'DELETE' })
    setClones(prev => prev.filter(c => c.id !== id))
  }

  return (
    <>
      <div className="topbar">
        <div className="topbar-title">Landing Page Cloner</div>
      </div>
      <div className="content">
        <form onSubmit={handleClone} className="lp-url-bar">
          <input
            className="lp-url-input"
            type="url"
            placeholder="https://example.com/product-page"
            value={url}
            onChange={e => setUrl(e.target.value)}
            disabled={cloning}
            required
          />
          <button type="submit" className="btn btn-accent" disabled={cloning}>
            {cloning ? <><span className="spinner" />  Cloning…</> : '◈ Clone Page'}
          </button>
        </form>

        {error && (
          <div className="notice-box" style={{ color: 'var(--red)', marginBottom: 20, borderColor: 'rgba(224,90,78,0.3)' }}>
            {error}
          </div>
        )}

        {cloning && (
          <div className="notice-box" style={{ marginBottom: 20 }}>
            Fetching and processing the page — this may take 10–30 seconds depending on the site…
          </div>
        )}

        <div className="section-header">
          <div className="section-title">Saved Clones</div>
        </div>

        {loading ? (
          <div style={{ color: 'var(--text3)', fontSize: 13, padding: '32px 0' }}>Loading…</div>
        ) : !clones.length ? (
          <div className="empty-rules" style={{ marginTop: 0 }}>
            No clones yet. Paste a URL above to get started.
          </div>
        ) : (
          <div className="clones-grid">
            {clones.map(clone => (
              <Link key={clone.id} href={`/landing-page/${clone.id}`} className="clone-card">
                <div className="clone-thumb">◈</div>
                <div className="clone-info">
                  <div className="clone-title">{clone.title || 'Untitled Page'}</div>
                  <div className="clone-url">{clone.url}</div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
                    <div className="clone-date">
                      {new Date(clone.created_at).toLocaleDateString('nl-NL')}
                    </div>
                    <button
                      className="btn btn-sm"
                      style={{ color: 'var(--red)', padding: '3px 8px', fontSize: 11 }}
                      onClick={e => deleteClone(clone.id, e)}
                    >✕</button>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </>
  )
}
