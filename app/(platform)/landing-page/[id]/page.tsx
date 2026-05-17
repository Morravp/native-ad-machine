'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'

interface Clone {
  id: string
  url: string
  title: string
  html: string
  created_at: string
}

interface SelectedElement {
  path: string
  tag: string
  text: string
  html: string
}

export default function CloneEditor() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [clone, setClone] = useState<Clone | null>(null)
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<SelectedElement | null>(null)
  const [editText, setEditText] = useState('')
  const [html, setHtml] = useState('')
  const [editMode, setEditMode] = useState(false)

  useEffect(() => {
    fetch(`/api/cloned-pages/${id}`)
      .then(r => r.json())
      .then(data => {
        setClone(data)
        setHtml(data.html)
        setLoading(false)
      })
  }, [id])

  useEffect(() => {
    function handleMessage(e: MessageEvent) {
      if (e.data?.type === 'ELEMENT_SELECTED') {
        setSelected(e.data)
        setEditText(e.data.text)
      }
    }
    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [])

  function injectEditScript(rawHtml: string, editModeOn: boolean): string {
    const script = editModeOn ? `
<script>
(function() {
  var selected = null;
  document.addEventListener('click', function(e) {
    e.preventDefault();
    e.stopPropagation();
    if (selected) selected.style.outline = '';
    selected = e.target;
    selected.style.outline = '2px solid #e8c547';
    selected.style.outlineOffset = '2px';
    var path = [];
    var el = selected;
    while (el && el !== document.body) {
      var idx = Array.from(el.parentNode ? el.parentNode.children : []).indexOf(el);
      path.unshift(el.tagName.toLowerCase() + ':nth-child(' + (idx + 1) + ')');
      el = el.parentElement;
    }
    window.parent.postMessage({
      type: 'ELEMENT_SELECTED',
      tag: selected.tagName,
      text: selected.innerText || selected.textContent || '',
      html: selected.innerHTML || '',
      path: path.join(' > ')
    }, '*');
  }, true);

  window.addEventListener('message', function(e) {
    if (e.data && e.data.type === 'UPDATE_ELEMENT' && selected) {
      selected.textContent = e.data.text;
    }
    if (e.data && e.data.type === 'GET_HTML') {
      window.parent.postMessage({ type: 'FULL_HTML', html: document.documentElement.outerHTML }, '*');
    }
  });
})();
<\/script>` : ''

    if (rawHtml.includes('</body>')) {
      return rawHtml.replace('</body>', script + '</body>')
    }
    return rawHtml + script
  }

  function applyEdit() {
    if (!selected || !iframeRef.current?.contentWindow) return
    iframeRef.current.contentWindow.postMessage({ type: 'UPDATE_ELEMENT', text: editText }, '*')
    setSelected(prev => prev ? { ...prev, text: editText } : null)
  }

  function requestDownload() {
    if (!iframeRef.current?.contentWindow) return
    const channel = new MessageChannel()
    channel.port1.onmessage = (e) => {
      if (e.data?.type === 'FULL_HTML') {
        const blob = new Blob([e.data.html], { type: 'text/html' })
        const a = document.createElement('a')
        a.href = URL.createObjectURL(blob)
        a.download = `${clone?.title || 'clone'}.html`
        a.click()
      }
    }
    iframeRef.current.contentWindow.postMessage({ type: 'GET_HTML' }, '*')
  }

  function downloadOriginal() {
    if (!html) return
    const blob = new Blob([html], { type: 'text/html' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `${clone?.title || 'clone'}.html`
    a.click()
  }

  if (loading) {
    return (
      <>
        <div className="topbar"><div className="topbar-title">Loading…</div></div>
        <div className="content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300 }}>
          <span className="spinner" />
        </div>
      </>
    )
  }

  if (!clone) {
    return (
      <>
        <div className="topbar"><div className="topbar-title">Not found</div></div>
        <div className="content">
          <Link href="/landing-page" className="btn">← Back</Link>
        </div>
      </>
    )
  }

  const iframeSrc = injectEditScript(html, editMode)

  return (
    <>
      <div className="topbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Link href="/landing-page" className="btn btn-sm">← Back</Link>
          <div className="topbar-title" style={{ fontSize: 15 }}>{clone.title || 'Untitled Page'}</div>
        </div>
        <div className="topbar-actions">
          <button
            className={`btn btn-sm${editMode ? ' btn-accent' : ''}`}
            onClick={() => { setEditMode(!editMode); setSelected(null) }}
          >
            {editMode ? '✓ Edit Mode On' : '✎ Edit Mode'}
          </button>
          <button className="btn btn-sm" onClick={downloadOriginal}>
            ↓ Download HTML
          </button>
        </div>
      </div>

      <div className="clone-editor">
        <div className="clone-preview-pane">
          <div className="clone-preview-toolbar">
            <div className="clone-preview-url">{clone.url}</div>
            {editMode && (
              <span style={{ fontSize: 11, color: 'var(--accent)', fontFamily: 'DM Mono', opacity: 0.8 }}>
                click elements to edit
              </span>
            )}
          </div>
          <div className="clone-iframe-wrap">
            <iframe
              ref={iframeRef}
              key={editMode ? 'edit' : 'view'}
              srcDoc={iframeSrc}
              sandbox="allow-scripts allow-same-origin"
              title="Page preview"
            />
          </div>
        </div>

        <div className="clone-edit-pane">
          <div className="clone-edit-header">
            <div className="clone-edit-title">Element Editor</div>
            <div className="clone-edit-hint">
              {editMode
                ? 'Click any element in the preview to select and edit it.'
                : 'Enable Edit Mode to select and modify page elements.'}
            </div>
          </div>

          {!editMode ? (
            <div className="clone-edit-empty">
              <span style={{ fontSize: 32, opacity: 0.2 }}>✎</span>
              Enable Edit Mode to<br />interact with the page.
            </div>
          ) : !selected ? (
            <div className="clone-edit-empty">
              <span style={{ fontSize: 32, opacity: 0.2 }}>◎</span>
              Click any element<br />in the preview to edit it.
            </div>
          ) : (
            <div className="clone-edit-selection">
              <div>
                <span className="clone-edit-tag">{selected.tag}</span>
              </div>
              <div className="clone-edit-field">
                <label className="field-label">Text content</label>
                <textarea
                  value={editText}
                  onChange={e => setEditText(e.target.value)}
                  rows={5}
                />
              </div>
              <button className="btn btn-accent" onClick={applyEdit}>
                Apply Change
              </button>
              <div className="notice-box">
                Changes are live in the preview. Download to save the edited HTML file.
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
