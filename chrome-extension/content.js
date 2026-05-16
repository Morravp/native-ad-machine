// Injected into facebook.com/ads/library/*
// Adds "Save to Board" buttons on ad cards

const BUTTON_CLASS = 'adm-save-btn'

function extractAdData(card) {
  const ad = {}

  // Advertiser name — usually in a link or heading near top of card
  const nameEl =
    card.querySelector('[data-testid="ad_library_preview_pagename"]') ||
    card.querySelector('h3') ||
    card.querySelector('strong')
  if (nameEl) ad.advertiser_name = nameEl.textContent.trim()

  // Primary text (ad copy) — Facebook wraps it in a div with dir="auto"
  const copyEls = card.querySelectorAll('div[dir="auto"]')
  const copies = []
  copyEls.forEach(el => {
    const text = el.textContent.trim()
    if (text.length > 20 && !copies.includes(text)) copies.push(text)
  })
  if (copies.length > 0) ad.ad_copy = copies[0]
  if (copies.length > 1) ad.headline = copies[1]

  // Image
  const img = card.querySelector('img[src*="fbcdn"], img[src*="cdninstagram"]')
  if (img) ad.image_url = img.src

  // Source URL — current page URL with any ad_id param
  ad.source_url = window.location.href

  return ad
}

function injectButton(card) {
  if (card.querySelector(`.${BUTTON_CLASS}`)) return

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
  `

  btn.addEventListener('mouseenter', () => { btn.style.background = '#f0d05a' })
  btn.addEventListener('mouseleave', () => { btn.style.background = '#e8c547' })

  btn.addEventListener('click', e => {
    e.preventDefault()
    e.stopPropagation()

    const adData = extractAdData(card)
    chrome.storage.local.set({ pendingAd: adData }, () => {
      btn.textContent = '✓ Ready — open extension'
      btn.style.background = '#4caf7d'
      btn.style.color = '#fff'
      setTimeout(() => {
        btn.textContent = '⊕ Save to Board'
        btn.style.background = '#e8c547'
        btn.style.color = '#0d0d0f'
      }, 3000)
    })
  })

  // Make card relative so button can be positioned
  const style = window.getComputedStyle(card)
  if (style.position === 'static') card.style.position = 'relative'

  card.appendChild(btn)
}

function findAndInjectCards() {
  // FB Ads Library renders ad cards in various containers; try multiple selectors
  const selectors = [
    '[data-testid="ad_library_preview"]',
    '[class*="xh8yej3"]', // FB internal class patterns (may change)
    'div[role="article"]',
  ]

  for (const sel of selectors) {
    const cards = document.querySelectorAll(sel)
    if (cards.length > 0) {
      cards.forEach(injectButton)
      return
    }
  }

  // Fallback: look for any large card-like divs containing ad copy
  document.querySelectorAll('div[dir="auto"]').forEach(el => {
    const text = el.textContent.trim()
    if (text.length > 50) {
      // Walk up to find a card-like ancestor
      let ancestor = el.parentElement
      for (let i = 0; i < 5 && ancestor; i++) {
        const r = ancestor.getBoundingClientRect()
        if (r.width > 200 && r.height > 100) {
          injectButton(ancestor)
          break
        }
        ancestor = ancestor.parentElement
      }
    }
  })
}

// Run on load and re-run as FB dynamically loads more ads
findAndInjectCards()

const observer = new MutationObserver(() => {
  findAndInjectCards()
})
observer.observe(document.body, { childList: true, subtree: true })
