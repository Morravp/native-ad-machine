const mainScreen = document.getElementById('main-screen')
const settingsScreen = document.getElementById('settings-screen')
const noAdView = document.getElementById('no-ad-view')
const adFormView = document.getElementById('ad-form-view')
const boardSelect = document.getElementById('board-select')
const notesInput = document.getElementById('notes-input')
const saveBtn = document.getElementById('save-btn')
const statusMsg = document.getElementById('status-msg')
const adPreview = document.getElementById('ad-preview')
const baseUrlInput = document.getElementById('base-url-input')
const settingsStatus = document.getElementById('settings-status')

let pendingAd = null
let baseUrl = ''

// --- Settings ---
document.getElementById('open-settings').addEventListener('click', () => {
  chrome.storage.local.get('baseUrl', d => {
    baseUrlInput.value = d.baseUrl || ''
  })
  mainScreen.classList.add('hidden')
  settingsScreen.classList.add('visible')
})

document.getElementById('close-settings').addEventListener('click', () => {
  settingsScreen.classList.remove('visible')
  mainScreen.classList.remove('hidden')
})

document.getElementById('save-settings-btn').addEventListener('click', () => {
  const url = baseUrlInput.value.trim().replace(/\/$/, '')
  chrome.storage.local.set({ baseUrl: url }, () => {
    settingsStatus.className = 'status success'
    settingsStatus.textContent = 'Saved!'
    setTimeout(() => { settingsStatus.textContent = '' }, 2000)
    baseUrl = url
  })
})

// --- Init ---
chrome.storage.local.get(['baseUrl', 'pendingAd'], data => {
  baseUrl = data.baseUrl || ''
  pendingAd = data.pendingAd || null

  if (!baseUrl) {
    noAdView.style.display = 'block'
    noAdView.innerHTML = 'First, go to <strong style="color:#aaa">Settings ⚙</strong> and enter your Ad Machine URL.'
    return
  }

  if (pendingAd) {
    showAdForm(pendingAd)
  } else {
    noAdView.style.display = 'block'
  }

  loadBoards()
})

function showAdForm(ad) {
  noAdView.style.display = 'none'
  adFormView.style.display = 'block'

  let html = ''
  if (ad.advertiser_name) html += `<div class="ad-preview-name">${esc(ad.advertiser_name)}</div>`
  if (ad.headline) html += `<div class="ad-preview-headline">${esc(ad.headline)}</div>`
  if (ad.ad_copy) html += `<div class="ad-preview-copy">${esc(ad.ad_copy)}</div>`
  adPreview.innerHTML = html || '<div style="color:#555;font-size:12px;">Ad captured</div>'
}

async function loadBoards() {
  if (!baseUrl) return
  try {
    const res = await fetch(`${baseUrl}/api/swipe-boards`)
    const boards = await res.json()
    boardSelect.innerHTML = ''
    if (!boards.length) {
      boardSelect.innerHTML = '<option value="">No boards — create one in the app first</option>'
      return
    }
    boards.forEach(b => {
      const opt = document.createElement('option')
      opt.value = b.id
      opt.textContent = `${b.name} (${b.item_count} ads)`
      boardSelect.appendChild(opt)
    })
  } catch {
    boardSelect.innerHTML = '<option value="">Could not load boards</option>'
  }
}

// --- Save ---
saveBtn.addEventListener('click', async () => {
  if (!pendingAd) return
  const boardId = boardSelect.value
  if (!boardId) {
    showStatus('Pick a board first', 'error')
    return
  }

  saveBtn.disabled = true
  saveBtn.textContent = '…'

  try {
    const res = await fetch(`${baseUrl}/api/swipe-items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        board_id: boardId,
        advertiser_name: pendingAd.advertiser_name || null,
        headline: pendingAd.headline || null,
        ad_copy: pendingAd.ad_copy || null,
        image_url: pendingAd.image_url || null,
        source_url: pendingAd.source_url || null,
        notes: notesInput.value.trim() || null,
        tags: [],
      }),
    })

    if (!res.ok) throw new Error('Server error')

    chrome.storage.local.remove('pendingAd')
    pendingAd = null
    showStatus('Saved!', 'success')
    saveBtn.textContent = '✓ Saved'

    setTimeout(() => {
      adFormView.style.display = 'none'
      noAdView.style.display = 'block'
      saveBtn.disabled = false
      saveBtn.textContent = 'Save to Board'
      statusMsg.textContent = ''
      notesInput.value = ''
    }, 1500)

  } catch {
    showStatus('Failed to save. Check your URL in settings.', 'error')
    saveBtn.disabled = false
    saveBtn.textContent = 'Save to Board'
  }
})

function showStatus(msg, type) {
  statusMsg.className = `status ${type}`
  statusMsg.textContent = msg
}

function esc(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
