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
  video_url: string | null
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
  const [modal, setModal] = useState<SwipeItem | null>(null)
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

  function openModal(item: SwipeItem) {
    setModal(item)
    setEditNotes(item.notes ?? '')
  }

  function closeModal() {
    setModal(null)
    setEditNotes('')
  }

  async function saveNotes() {
    if (!modal) return
    setSaving(true)
    await fetch(`/api/swipe-items/${modal.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...modal, notes: editNotes }),
    })
    setItems(prev => prev.map(i => i.id === modal.id ? { ...i, notes: editNotes } : i))
    setModal(prev => prev ? { ...prev, notes: editNotes } : null)
    setSaving(false)
  }

  async function deleteItem(itemId: string) {
    if (!confirm('Remove this ad from the board?')) return
    await fetch(`/api/swipe-items/${itemId}`, { method: 'DELETE' })
    setItems(prev => prev.filter(i => i.id !== itemId))
    if (modal?.id === itemId) closeModal()
  }

  function timeAgo(dateStr: string) {
    const diff = Date.now() - new Date(dateStr).getTime()
    const days = Math.floor(diff / 86400000)
    if (days === 0) return 'Today'
    if (days === 1) return '1d ago'
    if (days < 30) return `${days}d ago`
    const months = Math.floor(days / 30)
    return `${months}mo ago`
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
        <div style={{ fontSize: 13, color: 'var(--text3)' }}>
          {items.length} {items.length === 1 ? 'ad' : 'ads'}
        </div>
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
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: 16,
          }}>
            {items.map(item => (
              <div key={item.id} style={{
                background: 'var(--bg2)',
                border: '1px solid var(--border)',
                borderRadius: 12,
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                transition: 'border-color 0.15s',
              }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
                onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
              >
                {/* Media */}
                <div style={{
                  width: '100%',
                  aspectRatio: '1.6',
                  background: 'var(--bg3)',
                  overflow: 'hidden',
                  flexShrink: 0,
                  position: 'relative',
                }}>
                  {item.video_url && item.video_url !== 'video' ? (
                    <video
                      src={item.video_url}
                      poster={item.image_url ?? undefined}
                      controls
                      style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                    />
                  ) : item.image_url ? (
                    <>
                      <img
                        src={item.image_url}
                        alt=""
                        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                      />
                      {item.video_url === 'video' && (
                        <div style={{
                          position: 'absolute', inset: 0,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          background: 'rgba(0,0,0,0.3)',
                          pointerEvents: 'none',
                        }}>
                          <div style={{
                            width: 40, height: 40, borderRadius: '50%',
                            background: 'rgba(0,0,0,0.6)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 16, color: '#fff',
                          }}>▶</div>
                        </div>
                      )}
                    </>
                  ) : (
                    <div style={{
                      width: '100%', height: '100%',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: 'var(--text3)', fontSize: 28,
                    }}>
                      ◻
                    </div>
                  )}
                </div>

                {/* Card body */}
                <div style={{ padding: '12px 14px', flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {/* Advertiser + date */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                    {item.advertiser_name && (
                      <div style={{
                        fontSize: 11, fontWeight: 700, color: 'var(--accent)',
                        textTransform: 'uppercase', letterSpacing: '0.05em',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {item.advertiser_name}
                      </div>
                    )}
                    <div style={{ fontSize: 11, color: 'var(--text3)', flexShrink: 0 }}>
                      {timeAgo(item.created_at)}
                    </div>
                  </div>

                  {/* Headline */}
                  {item.headline && (
                    <div style={{
                      fontSize: 13, fontWeight: 600, color: 'var(--text1)', lineHeight: 1.35,
                    }}>
                      {item.headline}
                    </div>
                  )}

                  {/* Ad copy preview */}
                  {item.ad_copy && (
                    <div style={{
                      fontSize: 12, color: 'var(--text3)', lineHeight: 1.5,
                      overflow: 'hidden', display: '-webkit-box',
                      WebkitLineClamp: 3, WebkitBoxOrient: 'vertical',
                      flex: 1,
                    }}>
                      {item.ad_copy}
                    </div>
                  )}

                  {/* Notes badge */}
                  {item.notes && (
                    <div style={{
                      fontSize: 11, color: 'var(--text3)',
                      background: 'var(--bg3)', borderRadius: 5,
                      padding: '3px 7px', alignSelf: 'flex-start',
                    }}>
                      📝 Note
                    </div>
                  )}
                </div>

                {/* Footer buttons */}
                <div style={{
                  display: 'flex',
                  borderTop: '1px solid var(--border)',
                }}>
                  <button
                    onClick={() => openModal(item)}
                    style={{
                      flex: 1, padding: '10px', background: 'none', border: 'none',
                      color: 'var(--text2)', fontSize: 12, fontWeight: 600,
                      cursor: 'pointer', borderRight: '1px solid var(--border)',
                      fontFamily: 'inherit',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg3)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                  >
                    Details
                  </button>
                  {item.source_url && (
                    <a
                      href={item.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        flex: 1, padding: '10px', background: 'none',
                        color: 'var(--text2)', fontSize: 12, fontWeight: 600,
                        cursor: 'pointer', textDecoration: 'none',
                        textAlign: 'center', display: 'block',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg3)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                    >
                      View Original ↗
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Detail modal */}
      {modal && (
        <div className="modal-backdrop" onClick={closeModal}>
          <div
            className="modal"
            style={{ maxWidth: 520, width: '100%' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="modal-header">
              <div className="modal-title">{modal.advertiser_name ?? 'Ad Detail'}</div>
              <button className="modal-close" onClick={closeModal}>✕</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {modal.video_url && modal.video_url !== 'video' ? (
                <video
                  src={modal.video_url}
                  poster={modal.image_url ?? undefined}
                  controls
                  style={{ width: '100%', borderRadius: 8, maxHeight: 320 }}
                />
              ) : modal.image_url ? (
                <img
                  src={modal.image_url}
                  alt=""
                  style={{ width: '100%', borderRadius: 8, maxHeight: 280, objectFit: 'cover' }}
                />
              ) : null}

              {modal.headline && (
                <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text1)', lineHeight: 1.35 }}>
                  {modal.headline}
                </div>
              )}

              {modal.ad_copy && (
                <div style={{
                  fontSize: 13, color: 'var(--text2)', lineHeight: 1.7,
                  whiteSpace: 'pre-wrap', maxHeight: 200, overflowY: 'auto',
                  background: 'var(--bg3)', borderRadius: 7, padding: '10px 12px',
                }}>
                  {modal.ad_copy}
                </div>
              )}

              {modal.source_url && (
                <a
                  href={modal.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ fontSize: 12, color: 'var(--accent)' }}
                >
                  View original ad ↗
                </a>
              )}

              <div>
                <label className="field-label">Notes</label>
                <textarea
                  value={editNotes}
                  onChange={e => setEditNotes(e.target.value)}
                  placeholder="Hook style, offer angle, what stands out…"
                  style={{ minHeight: 80 }}
                />
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  className="btn btn-accent"
                  style={{ flex: 1, justifyContent: 'center' }}
                  onClick={saveNotes}
                  disabled={saving}
                >
                  {saving ? '…' : 'Save Notes'}
                </button>
                <button
                  className="btn"
                  style={{ color: 'var(--text3)' }}
                  onClick={() => deleteItem(modal.id)}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
