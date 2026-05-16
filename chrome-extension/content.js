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
  /brandsearch/i,
  // FB UI aria-labels and button tooltips
  /vervolgkeuzemenu/i,
  /meer opties/i,
  /more options/i,
  /menu openen/i,
  /open menu/i,
  /vind ik leuk/i,
  /reageren/i,
  /delen/i,
  /opslaan/i,
  /add to/i,
  /spectre/i,
  /overzichtsdetails/i,
  /overview details/i,
  /^actief$/i,
  /^active$/i,
  /^inactief$/i,
  /^inactive$/i,
]

// Known CTA button texts across languages
const CTA_PATTERNS = [
  /^meer inform/i,
  /^learn more/i,
  /^shop now/i,
  /^nu winkelen/i,
  /^shoppen/i,
  /^koop nu/i,
  /^buy now/i,
  /^get quote/i,
  /^offerte/i,
  /^sign up/i,
  /^aanmelden/i,
  /^inschrijven/i,
  /^download/i,
  /^contact us/i,
  /^neem contact/i,
  /^book now/i,
  /^nu boeken/i,
  /^apply now/i,
  /^solliciteer/i,
  /^get offer/i,
  /^aanbieding/i,
  /^subscribe/i,
  /^abonneren/i,
  /^watch more/i,
  /^bekijk meer/i,
  /^send message/i,
  /^bericht sturen/i,
  /^order now/i,
  /^nu bestellen/i,
  /^get started/i,
  /^aan de slag/i,
]

function isCTA(text) {
  return CTA_PATTERNS.some(p => p.test(text.trim()))
}

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

  // ── Ad copy + headline: dump the full card text and parse it ──
  // Reason: FB Ads Library splits metadata and ad preview into different DOM
  // subtrees, so querySelector('[dir="auto"]') misses text in sibling sections.
  // Grabbing the whole card's innerText and splitting into paragraphs is simpler
  // and catches everything regardless of nesting.

  const fullText = card.innerText || card.textContent || ''
  const paragraphs = fullText
    .split(/\n+/)
    .map(s => s.trim())
    .filter(s => s.length >= 15 && isAdContent(s))

  // Deduplicate: remove any paragraph that's a substring of a longer one
  const unique = paragraphs.filter((t, _, arr) =>
    !arr.some(other => other !== t && other.includes(t) && other.length > t.length)
  )

  // Sort longest-first: primary copy is almost always the longest block
  unique.sort((a, b) => b.length - a.length)

  if (unique[0]) ad.ad_copy = unique[0].slice(0, 3000)

  // Headline: a shorter, distinct block (link preview title below the image)
  const headline = unique.find(t =>
    t !== ad.ad_copy && t.length >= 10 && t.length <= 150
  )
  if (headline) ad.headline = headline

  // ── CTA button text ──
  const buttons = [...card.querySelectorAll('a[role="button"], div[role="button"], button')]
  const ctaBtn = buttons.find(b => isCTA(b.innerText || b.textContent || ''))
  if (ctaBtn) ad.cta_text = (ctaBtn.innerText || ctaBtn.textContent || '').trim()

  // ── Destination URL ──
  // FB wraps outbound links as facebook.com/l.php?u=<encoded-url>
  // Also look for plain domain text in the link preview area (e.g. "PETCURA.NL")
  let destUrl = null

  // Try FB redirect links first
  card.querySelectorAll('a[href*="l.facebook.com"], a[href*="facebook.com/l.php"], a[href*="l.instagram.com"]').forEach(a => {
    if (destUrl) return
    try {
      const params = new URL(a.href).searchParams
      const u = params.get('u')
      if (u) destUrl = decodeURIComponent(u)
    } catch {}
  })

  // Fallback: look for a plain domain/URL in text nodes near the bottom of the card
  // FB shows it as "BRAND.COM" or "www.brand.com" above the CTA button
  if (!destUrl) {
    const domainPattern = /^(https?:\/\/)?([a-z0-9-]+\.)+[a-z]{2,}(\/\S*)?$/i
    const allText = (card.innerText || '').split('\n').map(s => s.trim())
    const domainLine = allText.find(t =>
      t.length > 3 && t.length < 80 && domainPattern.test(t) &&
      !t.includes('facebook') && !t.includes('instagram')
    )
    if (domainLine) destUrl = domainLine.startsWith('http') ? domainLine : `https://${domainLine}`
  }

  if (destUrl) ad.destination_url = destUrl

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
              destination_url: adData.destination_url || null,
              cta_text: adData.cta_text || null,
              source_url: adData.source_url || null,
              notes: notes.value.trim() || null,
              tags: [],
            }),
          })
          if (!res.ok) throw new Error()
          saveBtn.textContent = '✓ Saved!'
          saveBtn.style.background = '#4caf7d'
          // Update the bar text to show saved state
          const strong = anchorBtn.querySelector('strong')
          if (strong) strong.textContent = '✓ Saved'
          const svg = anchorBtn.querySelector('svg:first-child')
          if (svg) svg.style.stroke = '#4caf7d'
          setTimeout(() => {
            removePanel()
            if (strong) strong.textContent = 'Ad Machine'
            if (svg) svg.style.stroke = '#606770'
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

  // Bottom bar — same position and style as Brandsearch's "Quick save" bar
  const bar = document.createElement('div')
  bar.className = BUTTON_CLASS
  bar.style.cssText = `
    display: flex;
    align-items: center;
    gap: 7px;
    padding: 8px 12px;
    border-top: 1px solid rgba(0,0,0,0.12);
    background: #f0f2f5;
    cursor: pointer;
    font-size: 13px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
    color: #606770;
    user-select: none;
    transition: background 0.15s;
    box-sizing: border-box;
    width: 100%;
  `

  bar.innerHTML = `
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#606770" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0">
      <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
    </svg>
    <span style="flex:1;font-size:13px;">Quick save to <strong style="color:#e8a000;font-weight:700;">Ad Machine</strong></span>
    <svg id="adm-chevron" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#aaa" stroke-width="2.5" stroke-linecap="round" style="flex-shrink:0;transition:transform 0.2s;">
      <polyline points="6 9 12 15 18 9"/>
    </svg>
  `

  bar.addEventListener('mouseenter', () => { bar.style.background = '#e4e6ea' })
  bar.addEventListener('mouseleave', () => { bar.style.background = '#f0f2f5' })

  bar.addEventListener('click', e => {
    e.preventDefault()
    e.stopPropagation()
    showPanel(bar, extractAdData(card))
  })

  card.appendChild(bar)
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
