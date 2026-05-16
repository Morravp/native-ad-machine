'use client'

import { useEffect, useState } from 'react'
import { FormatExample } from '@/lib/types'

type AdType = 'native_ad' | 'vsl'

export default function FormatsPage() {
  const [adType, setAdType] = useState<AdType>('native_ad')
  const [formats, setFormats] = useState<FormatExample[]>([])
  const [label, setLabel] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  async function loadFormats(type: AdType) {
    setLoading(true)
    const res = await fetch(`/api/formats?ad_type=${type}`)
    const data = await res.json()
    setFormats(Array.isArray(data) ? data : [])
    setLoading(false)
  }

  useEffect(() => { loadFormats(adType) }, [adType])

  async function addExample() {
    if (!file) { alert('Please select a file first.'); return }
    setSaving(true)
    const fd = new FormData()
    fd.append('label', label || file.name)
    fd.append('file', file)
    fd.append('ad_type', adType)
    await fetch('/api/formats', { method: 'POST', body: fd })
    setLabel('')
    setFile(null)
    setSaving(false)
    loadFormats(adType)
  }

  async function deleteFormat(id: string) {
    if (!confirm('Delete this format example?')) return
    await fetch(`/api/formats/${id}`, { method: 'DELETE' })
    loadFormats(adType)
  }

  return (
    <>
      <div className="topbar">
        <div className="topbar-title">Format Library</div>
      </div>
      <div className="content">
        <div className="tabs">
          <div
            className={`tab${adType === 'native_ad' ? ' active' : ''}`}
            onClick={() => setAdType('native_ad')}
          >
            Native Ad (copy)
          </div>
          <div
            className={`tab${adType === 'vsl' ? ' active' : ''}`}
            onClick={() => setAdType('vsl')}
          >
            VSL Script
          </div>
        </div>

        <div className="form-layout">
          <div>
            <div className="form-card">
              <div className="form-card-header">
                <div className="form-card-title">
                  {adType === 'native_ad' ? 'Native Ad Examples' : 'VSL Script Examples'}
                </div>
                <span style={{ fontSize: 12, color: 'var(--text3)' }}>{formats.length} examples</span>
              </div>
              <div className="form-card-body">
                <div className="notice-box">
                  ⚠ These are for <strong style={{ color: 'var(--text2)' }}>structure & format reference only</strong>.
                  The AI will mirror the layout — it will NOT copy content, angles, or claims.
                </div>
                {loading ? (
                  <div style={{ textAlign: 'center', padding: 24, color: 'var(--text3)', fontSize: 13 }}>Loading…</div>
                ) : !formats.length ? (
                  <div style={{ textAlign: 'center', padding: 24, color: 'var(--text3)', fontSize: 13 }}>
                    No examples uploaded yet.
                  </div>
                ) : (
                  <div className="uploaded-files">
                    {formats.map(f => (
                      <div key={f.id} className="file-chip">
                        <span style={{ fontSize: 14 }}>📄</span>
                        <div style={{ flex: 1 }}>
                          <div className="file-chip-name">{f.file_name}</div>
                          {f.label && f.label !== f.file_name && (
                            <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>{f.label}</div>
                          )}
                        </div>
                        <button className="file-chip-remove" onClick={() => deleteFormat(f.id)}>✕</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div>
            <div className="form-card">
              <div className="form-card-header">
                <div className="form-card-title">Upload Example</div>
              </div>
              <div className="form-card-body">
                <div>
                  <label className="field-label">Example label</label>
                  <input
                    type="text"
                    value={label}
                    onChange={e => setLabel(e.target.value)}
                    placeholder={
                      adType === 'native_ad'
                        ? 'e.g. Long-form health advertorial, 3-hook intro'
                        : 'e.g. 10-min VSL, problem-agitate-solve structure'
                    }
                  />
                </div>
                <div>
                  <label className="field-label">Upload file</label>
                  <div className="upload-zone" onClick={() => document.getElementById('format-file-input')?.click()}>
                    <div className="upload-zone-icon">⬆</div>
                    <div className="upload-zone-text">
                      <strong>{file ? file.name : 'Click to upload'}</strong>
                      {!file && ' format example'}
                    </div>
                  </div>
                  <input
                    id="format-file-input"
                    type="file"
                    style={{ display: 'none' }}
                    onChange={e => setFile(e.target.files?.[0] || null)}
                  />
                </div>
                <button
                  className="btn btn-accent"
                  style={{ width: '100%', justifyContent: 'center' }}
                  onClick={addExample}
                  disabled={saving}
                >
                  {saving ? '…' : '+ Add to Library'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
