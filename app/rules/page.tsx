'use client'

import { useEffect, useState } from 'react'
import { GlobalRule } from '@/lib/types'

type AdType = 'native_ad' | 'vsl'

export default function RulesPage() {
  const [adType, setAdType] = useState<AdType>('native_ad')
  const [rules, setRules] = useState<GlobalRule[]>([])
  const [newRule, setNewRule] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  async function loadRules(type: AdType) {
    setLoading(true)
    const res = await fetch(`/api/rules?ad_type=${type}`)
    const data = await res.json()
    setRules(Array.isArray(data) ? data : [])
    setLoading(false)
  }

  useEffect(() => { loadRules(adType) }, [adType])

  async function addRule() {
    const text = newRule.trim()
    if (!text) return
    setSaving(true)
    await fetch('/api/rules', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rule_text: text, ad_type: adType }),
    })
    setNewRule('')
    setSaving(false)
    loadRules(adType)
  }

  async function deleteRule(id: string) {
    await fetch(`/api/rules/${id}`, { method: 'DELETE' })
    loadRules(adType)
  }

  function handleRulesFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = async (ev) => {
      const lines = (ev.target?.result as string)
        .split('\n')
        .map(l => l.trim())
        .filter(l => l.length > 5)
      for (const line of lines) {
        await fetch('/api/rules', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ rule_text: line, ad_type: adType }),
        })
      }
      loadRules(adType)
    }
    reader.readAsText(file)
  }

  return (
    <>
      <div className="topbar">
        <div className="topbar-title">Global Copywriting Rules</div>
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
                  {adType === 'native_ad' ? 'Native Ad Rules' : 'VSL Script Rules'}
                </div>
                <span style={{ fontSize: 12, color: 'var(--text3)' }}>{rules.length} rules</span>
              </div>
              <div className="form-card-body">
                {loading ? (
                  <div style={{ color: 'var(--text3)', fontSize: 13, textAlign: 'center', padding: 16 }}>Loading…</div>
                ) : !rules.length ? (
                  <div className="empty-rules">No rules yet. Add your first rule →</div>
                ) : (
                  <div className="rules-list">
                    {rules.map((r, i) => (
                      <div key={r.id} className="rule-item">
                        <span className="rule-num">{String(i + 1).padStart(2, '0')}</span>
                        <span style={{ flex: 1 }}>{r.rule_text}</span>
                        <button className="rule-remove" onClick={() => deleteRule(r.id)}>✕</button>
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
                <div className="form-card-title">Add Rule</div>
              </div>
              <div className="form-card-body">
                <div>
                  <label className="field-label">Rule text</label>
                  <textarea
                    value={newRule}
                    onChange={e => setNewRule(e.target.value)}
                    placeholder={
                      adType === 'native_ad'
                        ? 'e.g. Always open with a relatable problem…'
                        : 'e.g. Open with a bold hook that calls out the viewer…'
                    }
                    style={{ minHeight: 120 }}
                    onKeyDown={e => { if (e.key === 'Enter' && e.metaKey) addRule() }}
                  />
                </div>
                <button
                  className="btn btn-accent"
                  style={{ width: '100%', justifyContent: 'center' }}
                  onClick={addRule}
                  disabled={saving}
                >
                  {saving ? '…' : '+ Add Rule'}
                </button>

                <div className="divider"></div>

                <div>
                  <label className="field-label">Upload rules doc</label>
                  <div className="upload-zone" onClick={() => document.getElementById('rules-doc-file')?.click()}>
                    <div className="upload-zone-icon">⬆</div>
                    <div className="upload-zone-text"><strong>Click to upload</strong> rules document</div>
                    <div className="upload-zone-text" style={{ fontSize: 11, marginTop: 4 }}>TXT — each line becomes a rule</div>
                  </div>
                  <input
                    id="rules-doc-file"
                    type="file"
                    accept=".txt"
                    style={{ display: 'none' }}
                    onChange={handleRulesFile}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
