'use client'

import { Ad } from '@/lib/types'

interface Props {
  ad: Ad
  brandName: string
  onClose: () => void
}

export default function AdDetailModal({ ad, brandName, onClose }: Props) {
  async function copy() {
    await navigator.clipboard.writeText(ad.body)
  }

  return (
    <div className="modal-overlay open" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-wide">
        <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 13, color: 'var(--accent)', marginBottom: 6 }}>
          {ad.ad_id}
        </div>
        <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 16, marginBottom: 16 }}>
          {brandName}
        </div>
        <div style={{
          fontSize: 14,
          lineHeight: 1.85,
          color: 'var(--text2)',
          whiteSpace: 'pre-wrap',
          maxHeight: 400,
          overflowY: 'auto',
        }}>
          {ad.body}
        </div>
        <div className="modal-actions">
          <button className="btn" onClick={onClose}>Close</button>
          <button className="btn btn-accent" onClick={copy}>⎘ Copy</button>
        </div>
      </div>
    </div>
  )
}
