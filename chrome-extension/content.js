// Injected into facebook.com/ads/library/*
// Adds "Save to Board" buttons on ad cards with an inline board picker panel

const BUTTON_CLASS = 'adm-save-btn'
const MARKED_ATTR = 'data-adm-injected'
const PANEL_ID = 'adm-panel'

let baseUrl = ''
let boards = []
let boardsLoaded = false

// Load config from storage
chrome.storage.local.get('baseUrl', d => {
  baseUrl = (d.baseUrl || '').replace(/\/$/, '')
  if (baseUrl) loadBoards()
})

async function loadBoards() {
  try {
    const res = await fetch(`${baseUrl}/api/swipe-boards`)
    boards = await res.json()
    boardsLoaded = true
  } catch {
    boardsLoaded = false
  }
}

// ── Inline panel ──────────────────────────────────────────────────────────────

function removePanel() {
  const existing = document.getElementById(PANEL_ID)
  if (existing) existing.remove()
}

function showPanel(anchorBtn, adData) {
  removePanel()

  const panel = document.createElement('div')
  panel.id = PANEL_ID
  panel.style.cssText = `
    position: fixed;
    z-index: 2147483647;
    background: #0d0d0f;
    border: 1px solid #2a2a32;
    border-radius: 10px;
    box-shadow: 0 8px 32px rgba(0,0,0,0.7);
    width: 300px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    font-size: 13px;
    color: #e8e8e8;
    padding: 0;
    overflow: hidden;
  `

  // Position near button
  const rect = anchorBtn.getBoundingClientRect()
  let top = rect.bottom + 8
  let left = rect.right - 300
  if (left < 8) left = 8
  if (top + 320 > window.innerHeight) top = rect.top - 328
  panel.style.top = top + 'px'
  panel.style.left = left + 'px'

  // Header
  const header = document.createElement('div')
  header.style.cssText = `
    display: flex; align-items: center; justify-content: space-between;
    padding: 12px 14px 10px;
    border-bottom: 1px solid #1e1e24;
  `
  header.innerHTML = `
    <div>
      <div style="font-size:12px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:#e8c547;">AD MACHINE</div>
      <div style="font-size:10px;color:#555;margin-top:1px;">Save to swipe board</div>
    </div>
    <button id="adm-panel-close" style="background:none;border:none;color:#555;cursor:pointer;font-size:16px;line-height:1;padding:2px;">✕</button>
  `
  panel.appendChild(header)

  const body = document.createElement('div')
  body.style.cssText = 'padding: 12px 14px; display: flex; flex-direction: column; gap: 10px;'

  if (!baseUrl) {
    body.innerHTML = `<div style="color:#888;font-size:12px;line-height:1.6;">
      No URL configured.<br>Click the extension icon → ⚙ Settings and enter your Ad Machine URL.
    </div>`
  } else if (!boardsLoaded || !boards.length) {
    body.innerHTML = `
      <div style="color:#888;font-size:12px;line-height:1.6;" id="adm-boards-msg">
        ${!boardsLoaded ? 'Loading boards…' : 'No boards found. Create one in your dashboard first.'}
      </div>
    `
    if (!boardsLoaded) {
      loadBoards().then(() => {
        const msg = document.getElementById('adm-boards-msg')
        if (msg) {
          if (boards.length) {
            // Replace with the full form
            removePanel()
            showPanel(anchorBtn, adData)
          } else {
            msg.textContent = 'No boards found. Create one in your dashboard first.'
          }
        }
      })
    }
  } else {
    // Ad preview
    const preview = document.createElement('div')
    preview.style.cssText = `
      background:#15151a; border:1px solid #1e1e24; border-radius:7px;
      padding:9px 11px; font-size:12px;
    `
    let previewHtml = ''
    if (adData.advertiser_name) previewHtml += `<div style="font-size:10px;font-weight:700;color:#e8c547;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:3px;">${esc(adData.advertiser_name)}</div>`
    if (adData.ad_copy) {
      const snippet = adData.ad_copy.slice(0, 100) + (adData.ad_copy.length > 100 ? '…' : '')
      previewHtml += `<div style="color:#aaa;line-height:1.45;">${esc(snippet)}</div>`
    }
    preview.innerHTML = previewHtml || '<div style="color:#555;">Ad captured</div>'
    body.appendChild(preview)

    // Board select
    const boardLabel = document.createElement('label')
    boardLabel.style.cssText = 'font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;color:#555;'
    boardLabel.textContent = 'Save to board'
    body.appendChild(boardLabel)

    const select = document.createElement('select')
    select.id = 'adm-board-select'
    select.style.cssText = `
      width:100%; background:#15151a; border:1px solid #1e1e24; border-radius:6px;
      color:#e8e8e8; font-size:12px; padding:7px 10px; outline:none;
      font-family:inherit; cursor:pointer;
    `
    boards.forEach(b => {
      const opt = document.createElement('option')
      opt.value = b.id
      opt.textContent = `${b.name} (${b.item_count} ads)`
      select.appendChild(opt)
    })
    body.appendChild(select)

    // Notes
    const notesLabel = document.createElement('label')
    notesLabel.style.cssText = 'font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;color:#555;'
    notesLabel.textContent = 'Notes (optional)'
    body.appendChild(notesLabel)

    const notes = document.createElement('textarea')
    notes.id = 'adm-notes'
    notes.placeholder = 'Hook style, offer angle, what stands out…'
    notes.style.cssText = `
      width:100%; background:#15151a; border:1px solid #1e1e24; border-radius:6px;
      color:#e8e8e8; font-size:12px; padding:7px 10px; outline:none;
      font-family:inherit; resize:vertical; min-height:56px; box-sizing:border-box;
    `
    body.appendChild(notes)

    // Save button
    const saveBtn = document.createElement('button')
    saveBtn.id = 'adm-save-btn'
    saveBtn.textContent = 'Save to Board'
    saveBtn.style.cssText = `
      width:100%; background:#e8c547; color:#0d0d0f; border:none; border-radius:7px;
      padding:9px; font-size:13px; font-weight:700; cursor:pointer;
      font-family:inherit; letter-spacing:0.02em;
    `
    saveBtn.addEventListener('mouseenter', () => { saveBtn.style.background = '#f0d05a' })
    saveBtn.addEventListener('mouseleave', () => { saveBtn.style.background = '#e8c547' })

    saveBtn.addEventListener('click', async () => {
      const boardId = select.value
      if (!boardId) return
      saveBtn.disabled = true
      saveBtn.textContent = '…'

      try {
        const res = await fetch(`${baseUrl}/api/swipe-items`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            board_id: boardId,
            advertiser_name: adData.advertiser_name || null,
            headline: adData.headline || null,
            ad_copy: adData.ad_copy || null,
            image_url: adData.image_url || null,
            source_url: adData.source_url || null,
            notes: notes.value.trim() || null,
            tags: [],
          }),
        })
        if (!res.ok) throw new Error()
        saveBtn.textContent = '✓ Saved!'
        saveBtn.style.background = '#4caf7d'
        anchorBtn.textContent = '✓ Saved'
        anchorBtn.style.background = '#4caf7d'
        anchorBtn.style.color = '#fff'
        setTimeout(() => {
          removePanel()
          anchorBtn.textContent = '⊕ Save to Board'
          anchorBtn.style.background = '#e8c547'
          anchorBtn.style.color = '#0d0d0f'
        }, 1800)
      } catch {
        saveBtn.textContent = 'Error — check URL in extension settings'
        saveBtn.style.background = '#e05c5c'
        saveBtn.style.color = '#fff'
        saveBtn.disabled = false
      }
    })
    body.appendChild(saveBtn)
  }

  panel.appendChild(body)
  document.body.appendChild(panel)

  // Close on outside click or X button
  document.getElementById('adm-panel-close')?.addEventListener('click', removePanel)
  setTimeout(() => {
    document.addEventListener('click', function outsideClick(e) {
      if (!panel.contains(e.target)) {
        removePanel()
        document.removeEventListener('click', outsideClick)
      }
    })
  }, 0)
}

// ── Card detection & button injection ─────────────────────────────────────────

function extractAdData(card) {
  const ad = {}

  const sponsored = [...card.querySelectorAll('a[href]')].find(a => {
    const t = a.textContent.trim()
    return t.length > 0 && t.length < 60
  })
  if (sponsored) ad.advertiser_name = sponsored.textContent.trim()

  const textEls = card.querySelectorAll('div[dir="auto"], span[dir="auto"]')
  let longest = ''
  textEls.forEach(el => {
    const text = el.innerText?.trim() ?? ''
    if (text.length > longest.length) longest = text
  })
  if (longest) ad.ad_copy = longest.slice(0, 2000)

  const img = card.querySelector('img[src*="fbcdn"], img[src*="cdninstagram"]')
  if (img?.src) ad.image_url = img.src

  ad.source_url = window.location.href
  return ad
}

function injectButton(card) {
  if (card.getAttribute(MARKED_ATTR)) return
  card.setAttribute(MARKED_ATTR, '1')

  const btn = document.createElement('button')
  btn.className = BUTTON_CLASS
  btn.textContent = '⊕ Save to Board'
  btn.style.cssText = `
    position: absolute;
    top: 10px;
    right: 10px;
    background: #e8c547;
    color: #0d0d0f;
    border: none;
    border-radius: 6px;
    padding: 5px 10px;
    font-size: 11px;
    font-weight: 700;
    cursor: pointer;
    z-index: 9999;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    letter-spacing: 0.03em;
    box-shadow: 0 2px 6px rgba(0,0,0,0.4);
    white-space: nowrap;
  `

  btn.addEventListener('mouseenter', () => { if (btn.textContent === '⊕ Save to Board') btn.style.background = '#f0d05a' })
  btn.addEventListener('mouseleave', () => { if (btn.textContent === '⊕ Save to Board') btn.style.background = '#e8c547' })

  btn.addEventListener('click', e => {
    e.preventDefault()
    e.stopPropagation()
    const adData = extractAdData(card)
    showPanel(btn, adData)
  })

  const style = window.getComputedStyle(card)
  if (style.position === 'static') card.style.position = 'relative'
  card.appendChild(btn)
}

function findAndInjectCards() {
  document.querySelectorAll('*').forEach(el => {
    if (el.classList?.contains(BUTTON_CLASS)) return
    if (el.children.length > 2) return
    const text = el.textContent || ''
    if (!/bibliotheek.id|library.id|bibliotheks.id|id de la biblioth|ID de biblioteca/i.test(text)) return
    if (text.trim().length > 100) return

    let ancestor = el.parentElement
    for (let i = 0; i < 15 && ancestor && ancestor !== document.body; i++) {
      const r = ancestor.getBoundingClientRect()
      if (r.width >= 280 && r.height >= 300) {
        injectButton(ancestor)
        break
      }
      ancestor = ancestor.parentElement
    }
  })
}

findAndInjectCards()

let debounceTimer = null
const observer = new MutationObserver(() => {
  clearTimeout(debounceTimer)
  debounceTimer = setTimeout(findAndInjectCards, 500)
})
observer.observe(document.body, { childList: true, subtree: true })

function esc(str) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
