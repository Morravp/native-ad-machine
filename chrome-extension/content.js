// Injected into facebook.com/ads/library/*

const BUTTON_CLASS = 'adm-save-btn'
const MARKED_ATTR = 'data-adm-injected'
const PANEL_ID = 'adm-panel'

let baseUrl = ''
let boards = []
let boardsLoaded = false

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

// ── Data extraction ────────────────────────────────────────────────────────────

// Labels that appear in the FB Ads Library UI — not actual ad content
const SKIP_PATTERNS = [
  /bibliotheek.id/i,
  /library.id/i,
  /bibliotheks.id/i,
  /gesponsord/i,
  /sponsored/i,
  /see page.s ad library/i,
  /bekijk paginabibliotheek/i,
  /advertentiegegevens/i,
  /ad details/i,
  /check eu/i,
  /transparantie/i,
  /transparency/i,
  /platformen/i,
  /platforms/i,
  /weergaven/i,
  /impressions/i,
  /uitgevoerd/i,
  /started running/i,
  /quick save/i,
  /meer inform/i,
  /learn more/i,
  /shop now/i,
  /get quote/i,
  /sign up/i,
  /download/i,
  /contact us/i,
  /book now/i,
  /apply now/i,
  /brandsearch/i,
]

function isAdContent(text) {
  if (!text || text.length < 15) return false
  for (const pat of SKIP_PATTERNS) {
    if (pat.test(text)) return false
  }
  return true
}

function extractAdData(card) {
  const ad = {}

  // ── Image: find the actual ad creative ──
  // The FB Ads Library card layout (top→bottom):
  //   [profile pic]  ← ABOVE "Gesponsord" label  — skip this
  //   [Gesponsord]
  //   [primary text]
  //   [AD CREATIVE IMAGE]  ← BELOW "Gesponsord"  — this is what we want
  //   [headline / link preview]

  // Step 1: find the bottom Y of the "Gesponsord/Sponsored" label
  let sponsoredBottom = -1
  card.querySelectorAll('*').forEach(el => {
    if (sponsoredBottom >= 0) return
    const t = (el.innerText || el.textContent || '').trim()
    if (/^(gesponsord|sponsored|gesponsert|sponsorisé|patrocinado)$/i.test(t) && el.children.length === 0) {
      sponsoredBottom = el.getBoundingClientRect().bottom
    }
  })

  // Step 2: find the largest image whose top is below the Gesponsord label
  let bestImg = null
  let bestArea = 0

  card.querySelectorAll('img[src]').forEach(img => {
    const r = img.getBoundingClientRect()
    if (r.width < 80 || r.height < 50) return           // skip icons
    if (sponsoredBottom >= 0 && r.top < sponsoredBottom) return  // skip profile pic above label
    const area = r.width * r.height
    if (area > bestArea) { bestArea = area; bestImg = img }
  })

  // Step 3: fallback — just the largest image in the card if step 2 found nothing
  if (!bestImg) {
    card.querySelectorAll('img[src]').forEach(img => {
      const r = img.getBoundingClientRect()
      if (r.width < 100 || r.height < 100) return
      const area = r.width * r.height
      if (area > bestArea) { bestArea = area; bestImg = img }
    })
  }

  if (bestImg?.src) ad.image_url = bestImg.src

  // ── Video: look for a <video> element in the card ──
  // Use its poster as the thumbnail and src as the video URL
  const video = card.querySelector('video[src], video source[src]')
  if (video) {
    const vid = video.tagName === 'VIDEO' ? video : video.closest('video')
    if (vid) {
      if (!ad.image_url && vid.poster) ad.image_url = vid.poster
      if (vid.poster && !ad.image_url) ad.image_url = vid.poster
      // Prefer poster over wrong image if we only have a tiny fallback
      if (vid.poster) ad.image_url = vid.poster
      const src = vid.src || vid.querySelector?.('source')?.src
      if (src) ad.video_url = src
    }
  }
  // Also try: video poster without src (FB sometimes streams via blob)
  if (!ad.video_url) {
    const vidEl = card.querySelector('video[poster]')
    if (vidEl) {
      if (vidEl.poster) ad.image_url = vidEl.poster
      ad.video_url = vidEl.src || 'video'  // flag as video even if src is blob
    }
  }

  // ── Advertiser name: find the link that's the page name ──
  // The FB ad preview shows "PageName · Gesponsord" — find the element just before "Gesponsord"
  let advertiserFound = false
  card.querySelectorAll('*').forEach(el => {
    if (advertiserFound) return
    const text = (el.innerText || el.textContent || '').trim()
    if (/^(gesponsord|sponsored)$/i.test(text)) {
      // Walk up and look for a sibling or nearby link
      let parent = el.parentElement
      for (let i = 0; i < 4 && parent; i++) {
        const links = parent.querySelectorAll('a[href]')
        links.forEach(a => {
          if (advertiserFound) return
          const t = a.textContent.trim()
          if (t.length > 1 && t.length < 80 && !t.includes('facebook.com') && !t.includes('http')) {
            ad.advertiser_name = t
            advertiserFound = true
          }
        })
        parent = parent.parentElement
      }
    }
  })

  // ── Ad copy: collect all text blocks, filter out UI labels ──
  const seen = new Set()
  const textCandidates = []

  card.querySelectorAll('div[dir="auto"], span[dir="auto"]').forEach(el => {
    // Skip if it contains child block elements (would double-count)
    const hasBlockChildren = [...el.children].some(c =>
      ['DIV', 'P', 'SECTION', 'ARTICLE'].includes(c.tagName)
    )
    if (hasBlockChildren) return

    const text = (el.innerText || el.textContent || '').trim()
    if (!text || seen.has(text)) return
    seen.add(text)
    if (isAdContent(text)) textCandidates.push(text)
  })

  // Sort longest first — primary copy is usually the longest
  textCandidates.sort((a, b) => b.length - a.length)

  if (textCandidates[0]) ad.ad_copy = textCandidates[0].slice(0, 3000)

  // Headline is often the second-longest distinct block (shorter, punchier)
  const headline = textCandidates.find(t =>
    t !== ad.ad_copy && t.length < 120 && t.length > 5
  )
  if (headline) ad.headline = headline

  ad.source_url = window.location.href
  return ad
}

// ── Inline panel ──────────────────────────────────────────────────────────────

function removePanel() {
  document.getElementById(PANEL_ID)?.remove()
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
    overflow: hidden;
  `

  const rect = anchorBtn.getBoundingClientRect()
  let top = rect.bottom + 8
  let left = rect.right - 300
  if (left < 8) left = 8
  if (top + 360 > window.innerHeight) top = rect.top - 368
  panel.style.top = top + 'px'
  panel.style.left = left + 'px'

  const header = document.createElement('div')
  header.style.cssText = `
    display:flex; align-items:center; justify-content:space-between;
    padding:12px 14px 10px; border-bottom:1px solid #1e1e24;
  `
  header.innerHTML = `
    <div>
      <div style="font-size:12px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:#e8c547;">AD MACHINE</div>
      <div style="font-size:10px;color:#555;margin-top:1px;">Save to swipe board</div>
    </div>
    <button id="adm-close" style="background:none;border:none;color:#555;cursor:pointer;font-size:16px;line-height:1;padding:2px;">✕</button>
  `
  panel.appendChild(header)

  const body = document.createElement('div')
  body.style.cssText = 'padding:12px 14px; display:flex; flex-direction:column; gap:10px;'

  if (!baseUrl) {
    body.innerHTML = `<div style="color:#888;font-size:12px;line-height:1.6;">
      No URL set. Click the extension icon → ⚙ Settings and enter your Railway URL.
    </div>`
  } else {
    // Preview
    const preview = document.createElement('div')
    preview.style.cssText = `background:#15151a;border:1px solid #1e1e24;border-radius:7px;overflow:hidden;`
    let previewHtml = ''
    if (adData.image_url) {
      previewHtml += `<img src="${adData.image_url}" style="width:100%;max-height:120px;object-fit:cover;display:block;" />`
    }
    previewHtml += `<div style="padding:8px 10px;">`
    if (adData.advertiser_name) previewHtml += `<div style="font-size:10px;font-weight:700;color:#e8c547;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:3px;">${esc(adData.advertiser_name)}</div>`
    if (adData.ad_copy) {
      const snippet = adData.ad_copy.slice(0, 90) + (adData.ad_copy.length > 90 ? '…' : '')
      previewHtml += `<div style="font-size:11px;color:#888;line-height:1.45;">${esc(snippet)}</div>`
    }
    previewHtml += `</div>`
    preview.innerHTML = previewHtml
    body.appendChild(preview)

    if (!boardsLoaded) {
      const msg = document.createElement('div')
      msg.style.cssText = 'color:#888;font-size:12px;'
      msg.textContent = 'Loading boards…'
      body.appendChild(msg)
      loadBoards().then(() => {
        removePanel()
        showPanel(anchorBtn, adData)
      })
    } else if (!boards.length) {
      const msg = document.createElement('div')
      msg.style.cssText = 'color:#888;font-size:12px;'
      msg.textContent = 'No boards found. Create one in your dashboard first.'
      body.appendChild(msg)
    } else {
      const boardLabel = document.createElement('label')
      boardLabel.style.cssText = 'font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;color:#555;'
      boardLabel.textContent = 'Save to board'
      body.appendChild(boardLabel)

      const select = document.createElement('select')
      select.style.cssText = `width:100%;background:#15151a;border:1px solid #1e1e24;border-radius:6px;color:#e8e8e8;font-size:12px;padding:7px 10px;outline:none;font-family:inherit;cursor:pointer;`
      boards.forEach(b => {
        const opt = document.createElement('option')
        opt.value = b.id
        opt.textContent = `${b.name} (${b.item_count})`
        select.appendChild(opt)
      })
      body.appendChild(select)

      const notesLabel = document.createElement('label')
      notesLabel.style.cssText = 'font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;color:#555;'
      notesLabel.textContent = 'Notes (optional)'
      body.appendChild(notesLabel)

      const notes = document.createElement('textarea')
      notes.placeholder = 'Hook style, offer angle, what stands out…'
      notes.style.cssText = `width:100%;background:#15151a;border:1px solid #1e1e24;border-radius:6px;color:#e8e8e8;font-size:12px;padding:7px 10px;outline:none;font-family:inherit;resize:vertical;min-height:52px;box-sizing:border-box;`
      body.appendChild(notes)

      const saveBtn = document.createElement('button')
      saveBtn.textContent = 'Save to Board'
      saveBtn.style.cssText = `width:100%;background:#e8c547;color:#0d0d0f;border:none;border-radius:7px;padding:9px;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit;`
      saveBtn.onmouseenter = () => { saveBtn.style.background = '#f0d05a' }
      saveBtn.onmouseleave = () => { saveBtn.style.background = '#e8c547' }
      saveBtn.addEventListener('click', async () => {
        saveBtn.disabled = true
        saveBtn.textContent = '…'
        try {
          const res = await fetch(`${baseUrl}/api/swipe-items`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              board_id: select.value,
              advertiser_name: adData.advertiser_name || null,
              headline: adData.headline || null,
              ad_copy: adData.ad_copy || null,
              image_url: adData.image_url || null,
              video_url: adData.video_url || null,
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
          saveBtn.textContent = 'Error — check settings'
          saveBtn.style.background = '#e05c5c'
          saveBtn.style.color = '#fff'
          saveBtn.disabled = false
        }
      })
      body.appendChild(saveBtn)
    }
  }

  panel.appendChild(body)
  document.body.appendChild(panel)

  document.getElementById('adm-close')?.addEventListener('click', removePanel)
  setTimeout(() => {
    document.addEventListener('click', function outsideClick(e) {
      if (!panel.contains(e.target)) {
        removePanel()
        document.removeEventListener('click', outsideClick)
      }
    })
  }, 0)
}

// ── Card detection ─────────────────────────────────────────────────────────────

function injectButton(card) {
  if (card.getAttribute(MARKED_ATTR)) return
  card.setAttribute(MARKED_ATTR, '1')

  const btn = document.createElement('button')
  btn.className = BUTTON_CLASS
  btn.textContent = '⊕ Save to Board'
  btn.style.cssText = `
    position:absolute; top:10px; right:10px;
    background:#e8c547; color:#0d0d0f; border:none; border-radius:6px;
    padding:5px 10px; font-size:11px; font-weight:700; cursor:pointer;
    z-index:9999; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
    letter-spacing:0.03em; box-shadow:0 2px 6px rgba(0,0,0,0.4); white-space:nowrap;
  `
  btn.onmouseenter = () => { if (btn.textContent === '⊕ Save to Board') btn.style.background = '#f0d05a' }
  btn.onmouseleave = () => { if (btn.textContent === '⊕ Save to Board') btn.style.background = '#e8c547' }
  btn.addEventListener('click', e => {
    e.preventDefault()
    e.stopPropagation()
    showPanel(btn, extractAdData(card))
  })

  if (window.getComputedStyle(card).position === 'static') card.style.position = 'relative'
  card.appendChild(btn)
}

function findAndInjectCards() {
  document.querySelectorAll('*').forEach(el => {
    if (el.classList?.contains(BUTTON_CLASS)) return
    if ((el.children?.length ?? 0) > 2) return
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

let debounce = null
new MutationObserver(() => {
  clearTimeout(debounce)
  debounce = setTimeout(findAndInjectCards, 500)
}).observe(document.body, { childList: true, subtree: true })

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
