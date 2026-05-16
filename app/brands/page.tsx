'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import BrandModal from '@/components/BrandModal'
import { Brand, BrandDoc } from '@/lib/types'

export default function BrandsPage() {
  const [brands, setBrands] = useState<Brand[]>([])
  const [modalOpen, setModalOpen] = useState(false)
  const [editingBrand, setEditingBrand] = useState<Brand | null>(null)
  const [editingDocs, setEditingDocs] = useState<BrandDoc[]>([])
  const [loading, setLoading] = useState(true)

  async function loadBrands() {
    const res = await fetch('/api/brands')
    const data = await res.json()
    setBrands(Array.isArray(data) ? data : [])
    setLoading(false)
  }

  useEffect(() => { loadBrands() }, [])

  function openNew() {
    setEditingBrand(null)
    setEditingDocs([])
    setModalOpen(true)
  }

  async function openEdit(brand: Brand) {
    const res = await fetch(`/api/brands/${brand.id}`)
    const data = await res.json()
    setEditingBrand(data)
    setEditingDocs(data.docs || [])
    setModalOpen(true)
  }

  async function deleteBrand(id: string) {
    if (!confirm('Delete this brand and all its data?')) return
    await fetch(`/api/brands/${id}`, { method: 'DELETE' })
    loadBrands()
  }

  function colorIndex(i: number) { return i % 5 }

  return (
    <>
      <div className="topbar">
        <div className="topbar-title">Brands</div>
        <div className="topbar-actions">
          <button className="btn btn-accent" onClick={openNew}>+ New Brand</button>
        </div>
      </div>

      <div className="content">
        {loading ? (
          <div style={{ textAlign: 'center', padding: 48, color: 'var(--text3)' }}>Loading…</div>
        ) : (
          <div className="brand-grid">
            {brands.map((brand, i) => {
              const initials = brand.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
              return (
                <div key={brand.id} className="brand-card" onClick={() => window.location.href = `/brands/${brand.id}`}>
                  <div className="brand-card-actions">
                    <button
                      className="btn btn-sm btn-icon"
                      onClick={e => { e.stopPropagation(); openEdit(brand) }}
                      title="Edit"
                    >✎</button>
                    <button
                      className="btn btn-sm btn-icon btn-danger"
                      onClick={e => { e.stopPropagation(); deleteBrand(brand.id) }}
                      title="Delete"
                    >✕</button>
                  </div>
                  <div className={`brand-avatar color-${colorIndex(i)}`}>{initials}</div>
                  <div className="brand-name">{brand.name}</div>
                  <div className="brand-meta">{brand.ad_count || 0} ads generated</div>
                  <div className="brand-tags">
                    {brand.countries?.map(c => (
                      <span key={c} className="tag">{c}</span>
                    ))}
                  </div>
                </div>
              )
            })}
            <div className="brand-card new-card" onClick={openNew}>
              <div style={{ fontSize: 28, opacity: 0.3 }}>+</div>
              <div style={{ fontSize: 13 }}>Add new brand</div>
            </div>
          </div>
        )}
      </div>

      {modalOpen && (
        <BrandModal
          brand={editingBrand}
          existingDocs={editingDocs}
          onClose={() => setModalOpen(false)}
          onSaved={() => { setModalOpen(false); loadBrands() }}
        />
      )}
    </>
  )
}
