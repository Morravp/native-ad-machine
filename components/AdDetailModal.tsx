'use client'

import { useState } from 'react'
import { Ad } from '@/lib/types'

interface Props {
  ad: Ad
  brandName: string
  onClose: () => void
}

type Tab = 'output' | 'inputs'

export default function AdDetailModal({ ad, brandName, onClose }: Props) {
  const [tab, setTab] = useState<Tab>('output')
  const [copied, setCopied] = useState(false)

  async function copy() {
    await navigator.clipboard.writeText(ad.body)
    setCopied(true)
    setTimeout(() => setCopied(false), 1800)
  }

  const hasInputs = ad.competitor_ad || ad.extra_context || (ad.extra_doc_texts && ad.extra_doc_texts.length > 0)

  return (
    <div className="modal-overlay open" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-wide">

        {/* Header */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
            <div>
              <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 12, color: 'var(--accent)', marginBottom: 4 }}>
                {ad.ad_id}
              </div>
              <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 18 }}>
                {brandName}
              </div>
            </div>
            <button
              onClick={onClose}
              style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: 18, padding: '2px 4px', lineHeight: 1, flexShrink: 0 }}
            >✕</button>
          </div>

          {/* Meta pills */}
          <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
            <span style={pill}>Badge #{ad.badge_number}</span>
            <span style={pill}>{ad.country}</span>
            <span style={pill}>{new Date(ad.created_at).toLocaleDateString('nl-NL')}</span>
            {ad.competitor_ad && <span style={{ ...pill, background: 'rgba(232,197,71,0.1)', color: 'var(--accent)', border: '1px solid rgba(232,197,71,0.25)' }}>Competitor ad</span>}
            {ad.extra_context && <span style={{ ...pill, background: 'rgba(232,197,71,0.1)', color: 'var(--accent)', border: '1px solid rgba(232,197,71,0.25)' }}>Extra context</span>}
            {ad.extra_doc_texts && ad.extra_doc_texts.length > 0 && (
              <span style={{ ...pill, background: 'rgba(232,197,71,0.1)', color: 'var(--accent)', border: '1px solid rgba(232,197,71,0.25)' }}>
                {ad.extra_doc_texts.length} doc{ad.extra_doc_texts.length > 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 2, marginBottom: 14, borderBottom: '1px solid var(--border)', paddingBottom: 0 }}>
          <button
            onClick={() => setTab('output')}
            style={tabBtn(tab === 'output')}
          >
            ✦ Generated Ad
          </button>
          {hasInputs && (
            <button
              onClick={() => setTab('inputs')}
              style={tabBtn(tab === 'inputs')}
            >
              ⚙ Inputs Used
            </button>
          )}
        </div>

        {/* Output tab */}
        {tab === 'output' && (
          <div>
            <div style={{
              fontSize: 14,
              lineHeight: 1.85,
              color: 'var(--text2)',
              whiteSpace: 'pre-wrap',
              maxHeight: 420,
              overflowY: 'auto',
              background: 'var(--bg3)',
              borderRadius: 8,
              padding: '14px 16px',
            }}>
              {ad.body}
            </div>
            <div className="modal-actions" style={{ marginTop: 16 }}>
              <button className="btn" onClick={onClose}>Close</button>
              <button className="btn btn-accent" onClick={copy}>
                {copied ? '✓ Copied!' : '⎘ Copy'}
              </button>
            </div>
          </div>
        )}

        {/* Inputs tab */}
        {tab === 'inputs' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxHeight: 480, overflowY: 'auto' }}>

            {ad.competitor_ad && (
              <section>
                <div style={sectionLabel}>Competitor Ad (format reference)</div>
                <div style={sectionBody}>{ad.competitor_ad}</div>
              </section>
            )}

            {ad.extra_context && (
              <section>
                <div style={sectionLabel}>Extra Context / Notes</div>
                <div style={sectionBody}>{ad.extra_context}</div>
              </section>
            )}

            {ad.extra_doc_texts && ad.extra_doc_texts.length > 0 && (
              <section>
                <div style={sectionLabel}>Uploaded Docs ({ad.extra_doc_texts.length})</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {ad.extra_doc_texts.map((docText, i) => {
                    // Format is "[filename]:\ncontent" — split on first newline
                    const newlineIdx = docText.indexOf('\n')
                    const header = newlineIdx > -1 ? docText.slice(0, newlineIdx).replace(/^\[|\]:?$/g, '') : `Doc ${i + 1}`
                    const content = newlineIdx > -1 ? docText.slice(newlineIdx + 1) : docText
                    return (
                      <div key={i}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                          📄 {header}
                        </div>
                        <div style={{ ...sectionBody, maxHeight: 160 }}>{content}</div>
                      </div>
                    )
                  })}
                </div>
              </section>
            )}

            {!hasInputs && (
              <div style={{ textAlign: 'center', padding: 32, color: 'var(--text3)', fontSize: 13 }}>
                No extra inputs were used for this ad.
              </div>
            )}

            <div className="modal-actions" style={{ marginTop: 4 }}>
              <button className="btn" onClick={onClose}>Close</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

const pill: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  padding: '3px 9px',
  borderRadius: 99,
  background: 'var(--bg3)',
  color: 'var(--text3)',
  border: '1px solid var(--border)',
  whiteSpace: 'nowrap',
}

function tabBtn(active: boolean): React.CSSProperties {
  return {
    background: 'none',
    border: 'none',
    borderBottom: active ? '2px solid var(--accent)' : '2px solid transparent',
    color: active ? 'var(--text1)' : 'var(--text3)',
    fontWeight: active ? 700 : 500,
    fontSize: 13,
    padding: '6px 14px',
    cursor: 'pointer',
    fontFamily: 'inherit',
    marginBottom: -1,
    transition: 'color 0.15s',
  }
}

const sectionLabel: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.07em',
  color: 'var(--text3)',
  marginBottom: 6,
}

const sectionBody: React.CSSProperties = {
  fontSize: 13,
  lineHeight: 1.7,
  color: 'var(--text2)',
  whiteSpace: 'pre-wrap',
  background: 'var(--bg3)',
  borderRadius: 7,
  padding: '10px 13px',
  overflowY: 'auto',
  maxHeight: 220,
}
