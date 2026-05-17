'use client'

import { useEffect, useState } from 'react'
import ConfirmModal from '@/components/ConfirmModal'
import { FormatExample } from '@/lib/types'

type AdType = 'native_ad' | 'vsl'

export default function FormatsPage() {
  const [viewType, setViewType] = useState<AdType>('native_ad')
  const [formats, setFormats] = useState<FormatExample[]>([])
  const [label, setLabel] = useState('')
  const [uploadType, setUploadType] = useState<AdType>('native_ad')
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<FormatExample | null>(null)

  async function loadFormats(type: AdType) {
    setLoading(true)
    const res = await fetch(`/api/formats?ad_type=${type}`)
    const data = await res.json()
    setFormats(Array.isArray(data) ? data : [])
    setLoading(false)
  }

  useEffect(() => { loadFormats(viewType) }, [viewType])

  async function addExample() {
    if (!file) { alert('Please select a file first.'); return }
    setSaving(true)
    const fd = new FormData()
    fd.append('label', label || file.name)
    fd.append('file', file)
    fd.append('ad_type', uploadType)
    await fetch('/api/formats', { method: 'POST', body: fd })
    setLabel('')
    setFile(null)
    setSaving(false)
    if (viewType === uploadType) loadFormats(viewType)
    else setViewType(uploadType)
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    await fetch(`/api/formats/${deleteTarget.id}`, { method: 'DELETE' })
    setDeleteTarget(null)
    loadFormats(viewType)
  }

  return (
    <>
      <div className="topbar">
        <div className="topbar-title">Format Library</div>
      </div>
      <div className="content">
        <div className="form-layout">

          {/* LEFT — list with tabs */}
          <div>
            <div className="form-card">
              <div className="form-card-header">
                <div className="form-card-title">Uploaded Examples</div>
                <span style={{ fontSize: 12, color: 'var(--text3)' }}>{formats.length} examples</span>
              </div>
              <div style={{ display: 'flex', borderBottom: '1px solid var(--border)' }}>
                <div
                  className={`tab${viewType === 'native_ad' ? ' active' : ''}`}
                  onClick={() => setViewType('native_ad')}
                >
                  Native Ad (copy)
                </div>
                <div
                  className={`tab${viewType === 'vsl' ? ' active' : ''}`}
                  onClick={() => setViewType('vsl')}
                >
                  VSL Script
                </div>
              </div>
              <div className="form-card-body">
                <div className="notice-box">
                  ⚠ For <strong style={{ color: 'var(--text2)' }}>structure & format reference only</strong> — the AI mirrors the layout, not the content.
                </div>
                {loading ? (
                  <div style={{ textAlign: 'center', padding: 24, color: 'var(--text3)', fontSize: 13 }}>Loading…</div>
                ) : !formats.length ? (
                  <div style={{ textAlign: 'center', padding: 24, color: 'var(--text3)', fontSize: 13 }}>
                    No {viewType === 'native_ad' ? 'Native Ad' : 'VSL'} examples uploaded yet.
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
                        <button className="file-chip-remove" onClick={() => setDeleteTarget(f)}>✕</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* RIGHT — upload with explicit type selector */}
          <div>
            <div className="form-card">
              <div className="form-card-header">
                <div className="form-card-title">Upload Example</div>
              </div>
              <div className="form-card-body">

                <div>
                  <label className="field-label">Upload for</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <div
                      className={`country-tag${uploadType === 'native_ad' ? ' selected' : ''}`}
                      onClick={() => setUploadType('native_ad')}
                      style={{ flex: 1, textAlign: 'center' }}
                    >
                      Native Ad (copy)
                    </div>
                    <div
                      className={`country-tag${uploadType === 'vsl' ? ' selected' : ''}`}
                      onClick={() => setUploadType('vsl')}
                      style={{ flex: 1, textAlign: 'center' }}
                    >
                      VSL Script
                    </div>
                  </div>
                </div>

                <div>
                  <label className="field-label">Example label</label>
                  <input
                    type="text"
                    value={label}
                    onChange={e => setLabel(e.target.value)}
                    placeholder={
                      uploadType === 'native_ad'
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
                  {saving ? '…' : `+ Add to ${uploadType === 'native_ad' ? 'Native Ad' : 'VSL'} Library`}
                </button>
              </div>
            </div>
          </div>

        </div>
      </div>

      <ConfirmModal
        open={!!deleteTarget}
        title="Delete this format example?"
        message={deleteTarget ? `"${deleteTarget.label || deleteTarget.file_name}" will be permanently removed from the library.` : undefined}
        confirmLabel="Delete"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </>
  )
}
