'use client'

interface Props {
  open: boolean
  title: string
  message?: string
  confirmLabel?: string
  onConfirm: () => void
  onCancel: () => void
  danger?: boolean
}

export default function ConfirmModal({ open, title, message, confirmLabel = 'Delete', onConfirm, onCancel, danger = true }: Props) {
  if (!open) return null

  return (
    <div className="modal-overlay open" onClick={onCancel}>
      <div className="modal" style={{ width: 420 }} onClick={e => e.stopPropagation()}>
        <div className="modal-title" style={{ fontSize: 16, marginBottom: 12 }}>{title}</div>
        {message && <p style={{ fontSize: 13.5, color: 'var(--text2)', lineHeight: 1.6, marginBottom: 0 }}>{message}</p>}
        <div className="modal-actions">
          <button className="btn" onClick={onCancel}>Cancel</button>
          <button
            className="btn"
            style={danger ? { background: 'rgba(224,90,78,0.12)', borderColor: 'rgba(224,90,78,0.35)', color: 'var(--red)' } : undefined}
            onClick={onConfirm}
            autoFocus
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
