'use client'

import { useEffect, useState, use } from 'react'
import Link from 'next/link'

interface SwipeItem {
  id: string
  board_id: string
  advertiser_name: string | null
  headline: string | null
  ad_copy: string | null
  image_url: string | null
  source_url: string | null
  notes: string | null
  tags: string[]
  created_at: string
}

interface Board {
  id: string
  name: string
  description: string | null
  color: string
}

export default function BoardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [board, setBoard] = useState<Board | null>(null)
  const [items, setItems] = useState<SwipeItem[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<SwipeItem | null>(null)
  const [editNotes, setEditNotes] = useState('')
  const [saving, setSaving] = useState(false)

  async function load() {
    setLoading(true)
    const res = await fetch(`/api/swipe-boards/${id}`)
    if (!res.ok) { setLoading(false); return }
    const data = await res.json()
    setBoard({ id: data.id, name: data.name, description: data.description, color: data.color })
    setItems(data.items ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [id])

  async function deleteItem(itemId: string) {
    if (!confirm('Remove this ad from the board?')) return
    await fetch(`/api/swipe-items/${itemId}`, { method: 'DELETE' })
    setItems(prev => prev.filter(i => i.id !== itemId))
    if (selected?.id === itemId) setSelected(null)
  }

  async function saveNotes() {
    if (!selected) return
    setSaving(true)
    await fetch(`/api/swipe-items/${selected.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...selected, notes: editNotes }),
    })
    setItems(prev => prev.map(i => i.id === selected.id ? { ...i, notes: editNotes } : i))
    setSelected(prev => prev ? { ...prev, notes: editNotes } : null)
    setSaving(false)
  }

  function openItem(item: SwipeItem) {
    setSelected(item)
    setEditNotes(item.notes ?? '')
  }

  return (
    <>
      <div className="topbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Link href="/swipe" style={{ color: 'var(--text3)', textDecoration: 'none', fontSize: 13 }}>
            ← Boards
          </Link>
          <div className="topbar-title">{board?.name ?? '…'}</div>
        </div>
        <div style={{ fontSize: 13, color: 'var(--text3)' }}>{items.length} {items.length === 1 ? 'ad' : 'ads'}</div>
      </div>

      <div className="content">
        {loading ? (
          <div style={{ textAlign: 'center', padding: 48, color: 'var(--text3)', fontSize: 13 }}>Loading…</div>
        ) : !items.length ? (
          <div style={{ textAlign: 'center', padding: 48, color: 'var(--text3)', fontSize: 13 }}>
            No ads saved to this board yet.<br />
            Use the Chrome extension on the Facebook Ads Library to save ads here.
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>

            {/* Grid */}
            <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 }}>
              {items.map(item => (
                <div
                  key={item.id}
                  className="brand-card"
                  style={{ cursor: 'pointer', border: selected?.id === item.id ? '1px solid var(--accent)' : undefined }}
                  onClick={() => openItem(item)}
                >
                  {item.image_url && (
                    <img
                      src={item.image_url}
                      alt=""
                      style={{ width: '100%', borderRadius: 6, marginBottom: 10, objectFit: 'cover', maxHeight: 160 }}
                    />
                  )}
                  {item.advertiser_name && (
                    <div style={{ fontSize: 11, color: 'var(--accent)', fontWeight: 600, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      {item.advertiser_name}
                    </div>
                  )}
                  {item.headline && (
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text1)', marginBottom: 6, lineHeight: 1.35 }}>
                      {item.headline}
                    </div>
                  )}
                  {item.ad_copy && (
                    <div style={{ fontSize: 12, color: 'var(--text3)', lineHeight: 1.5, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' }}>
                      {item.ad_copy}
                    </div>
                  )}
                  {item.tags?.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 8 }}>
                      {item.tags.map(tag => (
                        <span key={tag} style={{ fontSize: 10, padding: '2px 7px', borderRadius: 99, background: 'var(--bg3)', color: 'var(--text3)' }}>
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Detail panel */}
            {selected && (
              <div className="form-card" style={{ width: 320, flexShrink: 0, position: 'sticky', top: 16 }}>
                <div className="form-card-header">
                  <div className="form-card-title">{selected.advertiser_name ?? 'Ad Detail'}</div>
                  <button className="modal-close" onClick={() => setSelected(null)}>✕</button>
                </div>
                <div className="form-card-body">
                  {selected.image_url && (
                    <img src={selected.image_url} alt="" style={{ width: '100%', borderRadius: 6, marginBottom: 8 }} />
                  )}
                  {selected.headline && (
                    <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 6 }}>{selected.headline}</div>
                  )}
                  {selected.ad_copy && (
                    <div style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.6, whiteSpace: 'pre-wrap', marginBottom: 12 }}>
                      {selected.ad_copy}
                    </div>
                  )}
                  {selected.source_url && (
                    <a
                      href={selected.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ fontSize: 12, color: 'var(--accent)', display: 'block', marginBottom: 12 }}
                    >
                      View original ad ↗
                    </a>
                  )}
                  <div>
                    <label className="field-label">Notes</label>
                    <textarea
                      value={editNotes}
                      onChange={e => setEditNotes(e.target.value)}
                      placeholder="What's interesting about this ad? Hook style, offer angle…"
                      style={{ minHeight: 80 }}
                    />
                  </div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                    <button className="btn btn-accent" style={{ flex: 1, justifyContent: 'center' }} onClick={saveNotes} disabled={saving}>
                      {saving ? '…' : 'Save Notes'}
                    </button>
                    <button className="btn" style={{ color: 'var(--text3)' }} onClick={() => deleteItem(selected.id)}>
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  )
}
