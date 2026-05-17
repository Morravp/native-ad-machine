'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import AdDetailModal from '@/components/AdDetailModal'
import ConfirmModal from '@/components/ConfirmModal'
import { Ad } from '@/lib/types'

export default function AdsLogPage() {
  const [ads, setAds] = useState<Ad[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedAd, setSelectedAd] = useState<Ad | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)

  async function loadAds() {
    const res = await fetch('/api/ads')
    const data = await res.json()
    setAds(Array.isArray(data) ? data : [])
    setLoading(false)
  }

  useEffect(() => { loadAds() }, [])

  async function confirmDelete() {
    if (!deleteTarget) return
    await fetch(`/api/ads/${deleteTarget}`, { method: 'DELETE' })
    setDeleteTarget(null)
    loadAds()
  }

  return (
    <>
      <div className="topbar">
        <div className="topbar-title">Ad Log</div>
        <div className="topbar-actions">
          <Link href="/generator" className="btn btn-accent">✦ Generate New</Link>
        </div>
      </div>

      <div className="content">
        <div className="ads-table">
          <div className="ads-table-header">
            <span>ID</span>
            <span>Brand</span>
            <span>Country</span>
            <span>Date</span>
            <span>Preview</span>
            <span></span>
          </div>
          {loading ? (
            <div style={{ textAlign: 'center', padding: 40, color: 'var(--text3)', fontSize: 13 }}>Loading…</div>
          ) : !ads.length ? (
            <div style={{ textAlign: 'center', padding: 40, color: 'var(--text3)', fontSize: 13 }}>
              No ads saved yet.{' '}
              <Link href="/generator" style={{ color: 'var(--accent)' }}>Generate your first →</Link>
            </div>
          ) : ads.map(ad => (
            <div key={ad.id} className="ads-table-row" onClick={() => setSelectedAd(ad)}>
              <span style={{ overflow: 'hidden', minWidth: 0 }}><span className="ad-id" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'inline-block', maxWidth: '100%' }}>{ad.ad_id}</span></span>
              <span style={{ fontSize: 13 }}>{ad.brand_name ?? '—'}</span>
              <span style={{ fontSize: 12, color: 'var(--text2)' }}>{ad.country}</span>
              <span style={{ fontSize: 12, color: 'var(--text2)' }}>
                {new Date(ad.created_at).toLocaleDateString('nl-NL')}
              </span>
              <span style={{ fontSize: 12, color: 'var(--text3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {ad.body?.slice(0, 80)}…
              </span>
              <span>
                <button
                  className="btn btn-sm"
                  style={{ color: 'var(--red)' }}
                  onClick={e => { e.stopPropagation(); setDeleteTarget(ad.id) }}
                >✕</button>
              </span>
            </div>
          ))}
        </div>
      </div>

      {selectedAd && (
        <AdDetailModal
          ad={selectedAd}
          brandName={selectedAd.brand_name ?? ''}
          onClose={() => setSelectedAd(null)}
        />
      )}

      <ConfirmModal
        open={!!deleteTarget}
        title="Delete this ad?"
        message="This ad will be permanently removed from your log."
        confirmLabel="Delete"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </>
  )
}
