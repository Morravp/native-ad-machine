'use client'

import { useEffect, useState } from 'react'
import { GlobalRule } from '@/lib/types'

export default function RulesPage() {
  const [rules, setRules] = useState<GlobalRule[]>([])
  const [newRule, setNewRule] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  async function loadRules() {
    const res = await fetch('/api/rules')
    const data = await res.json()
    setRules(Array.isArray(data) ? data : [])
    setLoading(false)
  }

  useEffect(() => { loadRules() }, [])

  async function addRule() {
    const text = newRule.trim()
    if (!text) return
    setSaving(true)
    await fetch('/api/rules', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rule_text: text }),
    })
    setNewRule('')
    setSaving(false)
    loadRules()
  }

  async function deleteRule(id: string) {
    await fetch(`/api/rules/${id}`, { method: 'DELETE' })
    loadRules()
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
          body: JSON.stringify({ rule_text: line }),
        })
      }
      loadRules()
    }
    reader.readAsText(file)
  }

  return (
    <>
      <div className="topbar">
        <div className="topbar-title">Global Copywriting Rules</div>
      </div>
      <div className="content">
        <div className="form-layout">
          {/* LEFT — rules list */}
          <div>
            <div className="form-card">
              <div className="form-card-header">
                <div className="form-card-title">Rules</div>
                <span style={{ fontSize: 12, color: 'var(--text3)' }}>{rules.length} rules</span>
              </div>
              <div className="form-card-body">
                {loading ? (
                  <div style={{ color: 'var(--text3)', fontSize: 13, textAlign: 'center', padding: 16 }}>Loading…</div>
                ) : !rules.length ? (
                  <div className="empty-rules">No rules yet. Add your first copywriting rule →</div>
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

          {/* RIGHT — add rule */}
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
                    placeholder="e.g. Always open with a relatable problem the reader experiences. Never mention the product in the first paragraph..."
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
