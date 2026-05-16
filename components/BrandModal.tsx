'use client'

import { useState } from 'react'
import { Brand, BrandDoc } from '@/lib/types'

const COUNTRIES = ['NL/BE', 'NL', 'BE', 'DE', 'FR', 'UK', 'US']

interface Props {
  brand: Brand | null
  existingDocs: BrandDoc[]
  onClose: () => void
  onSaved: () => void
}

export default function BrandModal({ brand, existingDocs, onClose, onSaved }: Props) {
  const [name, setName] = useState(brand?.name || '')
  const [countries, setCountries] = useState<string[]>(brand?.countries || ['NL/BE'])
  const [extraRules, setExtraRules] = useState(brand?.extra_rules || '')
  const [notes, setNotes] = useState(brand?.notes || '')
  const [productFiles, setProductFiles] = useState<File[]>([])
  const [personaFiles, setPersonaFiles] = useState<File[]>([])
  const [existDocs] = useState<BrandDoc[]>(existingDocs)
  const [saving, setSaving] = useState(false)

  function toggleCountry(c: string) {
    setCountries(prev =>
      prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c]
    )
  }

  async function save() {
    if (!name.trim()) { alert('Please enter a brand name.'); return }
    setSaving(true)

    let brandId = brand?.id

    if (brand) {
      await fetch(`/api/brands/${brand.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, countries, extra_rules: extraRules, notes }),
      })
    } else {
      const res = await fetch('/api/brands', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, countries, extra_rules: extraRules, notes }),
      })
      const data = await res.json()
      brandId = data.id
    }

    for (const file of productFiles) {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('brand_id', brandId!)
      fd.append('type', 'product')
      await fetch('/api/brand-docs', { method: 'POST', body: fd })
    }

    for (const file of personaFiles) {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('brand_id', brandId!)
      fd.append('type', 'persona')
      await fetch('/api/brand-docs', { method: 'POST', body: fd })
    }

    setSaving(false)
    onSaved()
  }

  return (
    <div className="modal-overlay open" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-title">{brand ? 'Edit Brand' : 'New Brand'}</div>
        <div className="modal-form">
          <div>
            <label className="field-label">Brand Name</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. VitalSleep"
            />
          </div>

          <div>
            <label className="field-label">Default Countries</label>
            <div className="country-selector">
              {COUNTRIES.map(c => (
                <span
                  key={c}
                  className={`country-tag${countries.includes(c) ? ' selected' : ''}`}
                  onClick={() => toggleCountry(c)}
                >{c}</span>
              ))}
            </div>
          </div>

          <div>
            <label className="field-label">Product / USP Docs</label>
            {existDocs.filter(d => d.type === 'product').map(d => (
              <div key={d.id} className="file-chip" style={{ marginBottom: 6 }}>
                <span style={{ fontSize: 14 }}>📄</span>
                <span className="file-chip-name">{d.name}</span>
                <span style={{ fontSize: 10, color: 'var(--green)' }}>✓ saved</span>
              </div>
            ))}
            <div className="upload-zone" onClick={() => document.getElementById('modal-product-files')?.click()}>
              <div className="upload-zone-icon">⬆</div>
              <div className="upload-zone-text"><strong>Click to upload</strong> — USPs, ingredients, claims</div>
            </div>
            <input
              id="modal-product-files"
              type="file"
              multiple
              style={{ display: 'none' }}
              onChange={e => setProductFiles(prev => [...prev, ...Array.from(e.target.files || [])])}
            />
            <div className="uploaded-files">
              {productFiles.map((f, i) => (
                <div key={i} className="file-chip">
                  <span style={{ fontSize: 14 }}>📄</span>
                  <span className="file-chip-name">{f.name}</span>
                  <button className="file-chip-remove" onClick={() => setProductFiles(prev => prev.filter((_, j) => j !== i))}>✕</button>
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="field-label">Persona Docs</label>
            {existDocs.filter(d => d.type === 'persona').map(d => (
              <div key={d.id} className="file-chip" style={{ marginBottom: 6 }}>
                <span style={{ fontSize: 14 }}>👤</span>
                <span className="file-chip-name">{d.name}</span>
                <span style={{ fontSize: 10, color: 'var(--green)' }}>✓ saved</span>
              </div>
            ))}
            <div className="upload-zone" onClick={() => document.getElementById('modal-persona-files')?.click()}>
              <div className="upload-zone-icon">⬆</div>
              <div className="upload-zone-text"><strong>Upload personas</strong></div>
            </div>
            <input
              id="modal-persona-files"
              type="file"
              multiple
              style={{ display: 'none' }}
              onChange={e => setPersonaFiles(prev => [...prev, ...Array.from(e.target.files || [])])}
            />
            <div className="uploaded-files">
              {personaFiles.map((f, i) => (
                <div key={i} className="file-chip">
                  <span style={{ fontSize: 14 }}>👤</span>
                  <span className="file-chip-name">{f.name}</span>
                  <button className="file-chip-remove" onClick={() => setPersonaFiles(prev => prev.filter((_, j) => j !== i))}>✕</button>
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="field-label">Brand-specific extra rules</label>
            <textarea
              value={extraRules}
              onChange={e => setExtraRules(e.target.value)}
              placeholder="Optional — add rules specific to this brand on top of global rules..."
              style={{ minHeight: 80 }}
            />
          </div>

          <div>
            <label className="field-label">Notes</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Anything else about this brand..."
              style={{ minHeight: 60 }}
            />
          </div>
        </div>

        <div className="modal-actions">
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn btn-accent" onClick={save} disabled={saving}>
            {saving ? <><span className="spinner" style={{ width: 14, height: 14 }}></span> Saving…</> : 'Save Brand'}
          </button>
        </div>
      </div>
    </div>
  )
}
