'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import BrandModal from '@/components/BrandModal'
import AdDetailModal from '@/components/AdDetailModal'
import { Brand, BrandDoc, Ad } from '@/lib/types'

export default function BrandDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const [brand, setBrand] = useState<Brand | null>(null)
  const [docs, setDocs] = useState<BrandDoc[]>([])
  const [ads, setAds] = useState<Ad[]>([])
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedAd, setSelectedAd] = useState<Ad | null>(null)
  const [loading, setLoading] = useState(true)

  async function load() {
    const [brandRes, adsRes] = await Promise.all([
      fetch(`/api/brands/${id}`),
      fetch('/api/ads'),
    ])
    const brandData = await brandRes.json()
    const adsData = await adsRes.json()

    setBrand(brandData)
    setDocs(brandData.docs || [])
    setAds((Array.isArray(adsData) ? adsData : []).filter((a: Ad) => a.brand_id === id))
    setLoading(false)
  }

  useEffect(() => { load() }, [id])

  async function deleteBrand() {
    if (!confirm('Delete this brand?')) return
    await fetch(`/api/brands/${id}`, { method: 'DELETE' })
    router.push('/brands')
  }

  const productDocs = docs.filter(d => d.type === 'product')
  const personaDocs = docs.filter(d => d.type === 'persona')

  if (loading) return (
    <>
      <div className="topbar"><div className="topbar-title">Brand</div></div>
      <div className="content" style={{ textAlign: 'center', padding: 48, color: 'var(--text3)' }}>Loading…</div>
    </>
  )

  if (!brand) return (
    <>
      <div className="topbar"><div className="topbar-title">Not found</div></div>
      <div className="content"><Link href="/brands" className="btn">← Back to Brands</Link></div>
    </>
  )

  return (
    <>
      <div className="topbar">
        <div className="topbar-title">{brand.name}</div>
        <div className="topbar-actions">
          <Link href="/brands" className="btn btn-sm">← Back</Link>
          <button className="btn btn-sm" onClick={() => setModalOpen(true)}>✎ Edit</button>
          <Link href={`/generator?brand_id=${brand.id}`} className="btn btn-sm btn-accent">✦ Generate Ad</Link>
        </div>
      </div>

      <div className="content">
        <div className="form-layout">
          <div className="form-left">
            <div className="form-card">
              <div className="form-card-header">
                <div className="form-card-title">Brand Info</div>
              </div>
              <div className="form-card-body">
                <div>
                  <span className="field-label">Name</span>
                  <div style={{ fontSize: 14 }}>{brand.name}</div>
                </div>
                <div>
                  <span className="field-label">Countries</span>
                  <div className="brand-tags">
                    {brand.countries?.map(c => <span key={c} className="tag">{c}</span>)}
                  </div>
                </div>
                {brand.notes && (
                  <div>
                    <span className="field-label">Notes</span>
                    <div style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.6 }}>{brand.notes}</div>
                  </div>
                )}
              </div>
            </div>

            <div className="form-card">
              <div className="form-card-header">
                <div className="form-card-title">Product Docs</div>
                <span style={{ fontSize: 12, color: 'var(--text3)' }}>{productDocs.length} files</span>
              </div>
              <div className="form-card-body">
                {productDocs.length ? productDocs.map(d => (
                  <div key={d.id} className="file-chip">
                    <span style={{ fontSize: 14 }}>📄</span>
                    <span className="file-chip-name">{d.name}</span>
                  </div>
                )) : <div style={{ color: 'var(--text3)', fontSize: 13 }}>No product docs uploaded.</div>}
              </div>
            </div>

            <div className="form-card">
              <div className="form-card-header">
                <div className="form-card-title">Persona Docs</div>
                <span style={{ fontSize: 12, color: 'var(--text3)' }}>{personaDocs.length} files</span>
              </div>
              <div className="form-card-body">
                {personaDocs.length ? personaDocs.map(d => (
                  <div key={d.id} className="file-chip">
                    <span style={{ fontSize: 14 }}>👤</span>
                    <span className="file-chip-name">{d.name}</span>
                  </div>
                )) : <div style={{ color: 'var(--text3)', fontSize: 13 }}>No persona docs uploaded.</div>}
              </div>
            </div>
          </div>

          <div className="form-right">
            <div className="form-card">
              <div className="form-card-header">
                <div className="form-card-title">Brand-specific Rules</div>
              </div>
              <div className="form-card-body">
                <div style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
                  {brand.extra_rules || <span style={{ color: 'var(--text3)' }}>None set.</span>}
                </div>
              </div>
            </div>

            <div className="form-card">
              <div className="form-card-header">
                <div className="form-card-title">Ads for this brand</div>
                <span style={{ fontSize: 12, color: 'var(--text3)' }}>{ads.length} total</span>
              </div>
              <div className="form-card-body">
                {ads.length ? ads.slice(0, 8).map(ad => (
                  <div
                    key={ad.id}
                    className="file-chip"
                    style={{ cursor: 'pointer' }}
                    onClick={() => setSelectedAd(ad)}
                  >
                    <span className="ad-id" style={{ fontSize: 10 }}>{ad.ad_id}</span>
                    <span style={{ flex: 1, fontSize: 12, color: 'var(--text2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {ad.body?.slice(0, 60)}…
                    </span>
                  </div>
                )) : (
                  <div style={{ color: 'var(--text3)', fontSize: 13 }}>
                    No ads yet.{' '}
                    <Link href={`/generator?brand_id=${brand.id}`} style={{ color: 'var(--accent)' }}>Generate →</Link>
                  </div>
                )}
              </div>
            </div>

            <button className="btn btn-sm btn-danger" style={{ width: '100%', justifyContent: 'center' }} onClick={deleteBrand}>
              Delete Brand
            </button>
          </div>
        </div>
      </div>

      {modalOpen && (
        <BrandModal
          brand={brand}
          existingDocs={docs}
          onClose={() => setModalOpen(false)}
          onSaved={() => { setModalOpen(false); load() }}
        />
      )}

      {selectedAd && (
        <AdDetailModal
          ad={selectedAd}
          brandName={brand.name}
          onClose={() => setSelectedAd(null)}
        />
      )}
    </>
  )
}
