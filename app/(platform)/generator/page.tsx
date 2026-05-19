'use client'

import { useEffect, useState, useRef, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Brand, BrandDoc, GlobalRule } from '@/lib/types'

const COUNTRIES = ['NL/BE', 'NL', 'BE', 'DE', 'FR', 'UK', 'US']

function buildAdId(badge: number, country: string) {
  const now = new Date()
  const d = String(now.getDate()).padStart(2, '0')
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const y = now.getFullYear()
  return `BADGE #${badge} - ${country} - ${d}/${m}/${y}`
}

function GeneratorInner() {
  const searchParams = useSearchParams()
  const defaultBrandId = searchParams.get('brand_id') || ''

  const [brands, setBrands] = useState<Brand[]>([])
  const [rules, setRules] = useState<GlobalRule[]>([])
  const [selectedBrandId, setSelectedBrandId] = useState(defaultBrandId)
  const [brandDocs, setBrandDocs] = useState<BrandDoc[]>([])
  const [badge, setBadge] = useState(1)
  const [country, setCountry] = useState('NL/BE')
  const [competitor, setCompetitor] = useState('')
  const [extraContext, setExtraContext] = useState('')
  const [extraFiles, setExtraFiles] = useState<File[]>([])
  const [generating, setGenerating] = useState(false)
  const [output, setOutput] = useState('')
  const [outputAdId, setOutputAdId] = useState('')
  const [saved, setSaved] = useState(false)
  const [lastExtraDocTexts, setLastExtraDocTexts] = useState<string[]>([])
  const outputRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    Promise.all([
      fetch('/api/brands').then(r => r.json()),
      fetch('/api/rules?ad_type=native_ad').then(r => r.json()),
    ]).then(([b, r]) => {
      setBrands(Array.isArray(b) ? b : [])
      setRules(Array.isArray(r) ? r : [])
    })
  }, [])

  useEffect(() => {
    if (!selectedBrandId) { setBrandDocs([]); return }
    fetch(`/api/brands/${selectedBrandId}`)
      .then(r => r.json())
      .then(d => setBrandDocs(d.docs || []))
  }, [selectedBrandId])

  const adId = buildAdId(badge, country)

  async function extractExtraDocs() {
    const texts: string[] = []
    for (const file of extraFiles) {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/ad-extra-docs', { method: 'POST', body: fd })
      const data = await res.json()
      if (data.text) texts.push(`[${data.name}]:\n${data.text}`)
    }
    return texts
  }

  async function generate() {
    if (!selectedBrandId) { alert('Please select a brand first.'); return }
    setGenerating(true)
    setOutput('')
    setOutputAdId('')
    setSaved(false)

    let extraDocTexts: string[] = []
    if (extraFiles.length) {
      extraDocTexts = await extractExtraDocs()
    }
    setLastExtraDocTexts(extraDocTexts)

    const res = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        brand_id: selectedBrandId,
        ad_id: adId,
        country,
        badge_number: badge,
        competitor_ad: competitor || null,
        extra_context: extraContext || null,
        extra_doc_texts: extraDocTexts,
      }),
    })

    if (!res.ok || !res.body) {
      setOutput('Error generating ad. Please check your API key and try again.')
      setGenerating(false)
      return
    }

    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let full = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      const chunk = decoder.decode(value)
      for (const line of chunk.split('\n')) {
        if (!line.startsWith('data: ')) continue
        const payload = line.slice(6)
        if (payload === '[DONE]') continue
        try {
          const { text } = JSON.parse(payload)
          full += text
          setOutput(full)
          if (outputRef.current) {
            outputRef.current.scrollTop = outputRef.current.scrollHeight
          }
        } catch {}
      }
    }

    setOutputAdId(adId)
    setGenerating(false)
  }

  async function saveToLog() {
    if (!output || !selectedBrandId) return
    await fetch('/api/ads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ad_id: outputAdId || adId,
        brand_id: selectedBrandId,
        country,
        badge_number: badge,
        body: output,
        competitor_ad: competitor || null,
        extra_context: extraContext || null,
        extra_doc_texts: lastExtraDocTexts.length ? lastExtraDocTexts : [],
      }),
    })
    setSaved(true)
  }

  async function copyOutput() {
    await navigator.clipboard.writeText(output)
  }

  const productDocs = brandDocs.filter(d => d.type === 'product')
  const personaDocs = brandDocs.filter(d => d.type === 'persona')

  return (
    <>
      <div className="topbar">
        <div className="topbar-title">Generate Native Ad</div>
      </div>
      <div className="content">
        <div className="form-layout">
          {/* LEFT */}
          <div className="form-left">
            <div className="form-card">
              <div className="form-card-header">
                <div className="form-card-title">Ad Identity</div>
              </div>
              <div className="form-card-body">
                <div>
                  <label className="field-label">Select Brand</label>
                  <select value={selectedBrandId} onChange={e => setSelectedBrandId(e.target.value)}>
                    <option value="">— select brand —</option>
                    {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </div>
                <div className="input-row">
                  <div>
                    <label className="field-label">Badge #</label>
                    <input
                      type="number"
                      value={badge}
                      min={1}
                      onChange={e => setBadge(Number(e.target.value))}
                    />
                  </div>
                  <div>
                    <label className="field-label">Country</label>
                    <select value={country} onChange={e => setCountry(e.target.value)}>
                      {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                </div>
                <div className="ad-id-preview">
                  <div className="ad-id-preview-label">Ad ID Preview</div>
                  <div className="ad-id-preview-value">{adId}</div>
                </div>
              </div>
            </div>

            <div className="form-card">
              <div className="form-card-header">
                <div className="form-card-title">Competitor Ad (format reference only)</div>
              </div>
              <div className="form-card-body">
                <div>
                  <span className="field-sublabel">
                    Paste native ad copy from a competitor. The AI will learn the format — NOT the content or angle.
                  </span>
                  <textarea
                    value={competitor}
                    onChange={e => setCompetitor(e.target.value)}
                    placeholder="Paste competitor ad copy here..."
                    style={{ minHeight: 140 }}
                  />
                </div>
              </div>
            </div>

            <div className="form-card">
              <div className="form-card-header">
                <div className="form-card-title">Extra Context</div>
              </div>
              <div className="form-card-body">
                <div>
                  <label className="field-label">Manual notes</label>
                  <span className="field-sublabel">Specific angle, claim, hook, or anything extra for this particular ad.</span>
                  <textarea
                    value={extraContext}
                    onChange={e => setExtraContext(e.target.value)}
                    placeholder="e.g. Focus on the sleep angle. Use the 'busy mom' hook..."
                    style={{ minHeight: 100 }}
                  />
                </div>
                <div>
                  <label className="field-label">Upload extra docs for this ad</label>
                  <div className="upload-zone" onClick={() => document.getElementById('gen-extra-file')?.click()}>
                    <div className="upload-zone-icon">⬆</div>
                    <div className="upload-zone-text"><strong>Click to upload</strong> or drop files here</div>
                    <div className="upload-zone-text" style={{ fontSize: 11, marginTop: 4 }}>PDF, DOCX, TXT</div>
                  </div>
                  <input
                    id="gen-extra-file"
                    type="file"
                    multiple
                    style={{ display: 'none' }}
                    onChange={e => setExtraFiles(prev => [...prev, ...Array.from(e.target.files || [])])}
                  />
                  <div className="uploaded-files">
                    {extraFiles.map((f, i) => (
                      <div key={i} className="file-chip">
                        <span style={{ fontSize: 14 }}>📄</span>
                        <span className="file-chip-name">{f.name}</span>
                        <button className="file-chip-remove" onClick={() => setExtraFiles(prev => prev.filter((_, j) => j !== i))}>✕</button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT */}
          <div className="form-right">
            <div className="form-card">
              <div className="form-card-header">
                <div className="form-card-title">Brand Docs Active</div>
              </div>
              <div className="form-card-body">
                {!selectedBrandId ? (
                  <div style={{ textAlign: 'center', padding: 16, color: 'var(--text3)', fontSize: 13 }}>
                    Select a brand to see its docs
                  </div>
                ) : (productDocs.length + personaDocs.length) === 0 ? (
                  <div style={{ textAlign: 'center', padding: 16, color: 'var(--text3)', fontSize: 13 }}>
                    No docs on this brand yet.
                  </div>
                ) : (
                  [...productDocs, ...personaDocs].map(d => (
                    <div key={d.id} className="file-chip">
                      <span style={{ fontSize: 14 }}>{d.type === 'product' ? '📄' : '👤'}</span>
                      <span className="file-chip-name">{d.name}</span>
                      <span style={{ fontSize: 10, color: 'var(--green)' }}>✓ active</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="form-card">
              <div className="form-card-header">
                <div className="form-card-title">Global Rules Active</div>
              </div>
              <div className="form-card-body" style={{ gap: 8, maxHeight: 280, overflowY: 'auto' }}>
                {!rules.length ? (
                  <div style={{ textAlign: 'center', padding: 16, color: 'var(--text3)', fontSize: 13 }}>
                    No global rules yet.{' '}
                    <Link href="/rules" style={{ color: 'var(--accent)' }}>Add rules →</Link>
                  </div>
                ) : rules.map((r, i) => (
                  <div key={r.id} className="rule-item">
                    <span className="rule-num">{String(i + 1).padStart(2, '0')}</span>
                    <span>{r.rule_text}</span>
                  </div>
                ))}
              </div>
            </div>

            <button
              className="btn btn-accent"
              style={{ width: '100%', justifyContent: 'center', padding: 14, fontSize: 15 }}
              onClick={generate}
              disabled={generating}
            >
              {generating ? <><span className="spinner"></span> Generating…</> : '✦ Generate Ad'}
            </button>
          </div>
        </div>

        {/* OUTPUT */}
        <div style={{ marginTop: 20 }}>
          <div className="output-section">
            <div className="output-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div className="form-card-title">Output</div>
                {outputAdId && <span className="ad-id">{outputAdId}</span>}
              </div>
              {output && !generating && (
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn btn-sm" onClick={copyOutput}>⎘ Copy</button>
                  <button
                    className="btn btn-sm"
                    onClick={saveToLog}
                    style={saved ? { color: 'var(--green)' } : {}}
                  >
                    {saved ? '✓ Saved!' : '+ Save to Log'}
                  </button>
                </div>
              )}
            </div>
            {generating && <div className="generating-bar"></div>}
            <div
              ref={outputRef}
              className={`output-body${output ? '' : ' empty'}`}
              style={output ? { maxHeight: 600, overflowY: 'auto' } : {}}
            >
              {output ? output : (
                <>
                  <div className="output-empty-icon">✦</div>
                  <div>Fill in the fields and hit generate</div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

export default function GeneratorPage() {
  return (
    <Suspense fallback={null}>
      <GeneratorInner />
    </Suspense>
  )
}
