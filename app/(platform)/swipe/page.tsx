'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import ConfirmModal from '@/components/ConfirmModal'

interface Board {
  id: string
  name: string
  description: string | null
  color: string
  item_count: number
  created_at: string
}

const COLORS = [
  { value: '0', label: 'Yellow', hex: '#e8c547' },
  { value: '1', label: 'Blue', hex: '#5b8dee' },
  { value: '2', label: 'Green', hex: '#4caf7d' },
  { value: '3', label: 'Red', hex: '#e05c5c' },
  { value: '4', label: 'Purple', hex: '#a374ea' },
]

function colorHex(val: string) {
  return COLORS.find(c => c.value === val)?.hex ?? '#e8c547'
}

export default function SwipePage() {
  const [boards, setBoards] = useState<Board[]>([])
  const [loading, setLoading] = useState(true)
  const [showNew, setShowNew] = useState(false)
  const [name, setName] = useState('')
  const [desc, setDesc] = useState('')
  const [color, setColor] = useState('0')
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Board | null>(null)

  async function load() {
    setLoading(true)
    const res = await fetch('/api/swipe-boards')
    const data = await res.json()
    setBoards(Array.isArray(data) ? data : [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function createBoard() {
    if (!name.trim()) return
    setSaving(true)
    await fetch('/api/swipe-boards', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name.trim(), description: desc.trim() || null, color }),
    })
    setName('')
    setDesc('')
    setColor('0')
    setShowNew(false)
    setSaving(false)
    load()
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    await fetch(`/api/swipe-boards/${deleteTarget.id}`, { method: 'DELETE' })
    setDeleteTarget(null)
    load()
  }

  return (
    <>
      <div className="topbar">
        <div className="topbar-title">Swipe Files</div>
        <button className="btn btn-accent" onClick={() => setShowNew(true)}>+ New Board</button>
      </div>
      <div className="content">

        {showNew && (
          <div className="modal-backdrop" onClick={() => setShowNew(false)}>
            <div className="modal" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <div className="modal-title">New Board</div>
                <button className="modal-close" onClick={() => setShowNew(false)}>✕</button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <label className="field-label">Board name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="e.g. Health & Wellness Hooks"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="field-label">Description (optional)</label>
                  <input
                    type="text"
                    value={desc}
                    onChange={e => setDesc(e.target.value)}
                    placeholder="What kind of ads go here?"
                  />
                </div>
                <div>
                  <label className="field-label">Color</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {COLORS.map(c => (
                      <div
                        key={c.value}
                        onClick={() => setColor(c.value)}
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: '50%',
                          background: c.hex,
                          cursor: 'pointer',
                          border: color === c.value ? '2px solid var(--text1)' : '2px solid transparent',
                        }}
                        title={c.label}
                      />
                    ))}
                  </div>
                </div>
                <button className="btn btn-accent" onClick={createBoard} disabled={saving || !name.trim()}>
                  {saving ? '…' : 'Create Board'}
                </button>
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: 'center', padding: 48, color: 'var(--text3)', fontSize: 13 }}>Loading…</div>
        ) : !boards.length ? (
          <div style={{ textAlign: 'center', padding: 48, color: 'var(--text3)', fontSize: 13 }}>
            No boards yet. Create one to start saving ads.
          </div>
        ) : (
          <div className="brand-grid">
            {boards.map(b => (
              <Link key={b.id} href={`/swipe/${b.id}`} className="brand-card" style={{ textDecoration: 'none' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div
                    style={{
                      width: 12,
                      height: 12,
                      borderRadius: '50%',
                      background: colorHex(b.color),
                      marginTop: 3,
                      flexShrink: 0,
                    }}
                  />
                  <button
                    className="file-chip-remove"
                    onClick={e => { e.preventDefault(); setDeleteTarget(b) }}
                    style={{ marginLeft: 'auto' }}
                  >
                    ✕
                  </button>
                </div>
                <div className="brand-card-name" style={{ marginTop: 8 }}>{b.name}</div>
                {b.description && (
                  <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 4, lineHeight: 1.4 }}>
                    {b.description}
                  </div>
                )}
                <div style={{ marginTop: 12, fontSize: 12, color: 'var(--text3)' }}>
                  {b.item_count} {b.item_count === 1 ? 'ad' : 'ads'}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      <ConfirmModal
        open={!!deleteTarget}
        title="Delete this board?"
        message={deleteTarget ? `"${deleteTarget.name}" and all its saved ads will be permanently removed.` : undefined}
        confirmLabel="Delete"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </>
  )
}
