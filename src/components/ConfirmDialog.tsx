import { useEffect, useRef } from 'react'

interface ConfirmDialogProps {
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  onConfirm: () => void
  onCancel: () => void
}

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Delete',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (open) cancelRef.current?.focus()
  }, [open])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-6">
      <div className="w-full max-w-sm rounded-2xl bg-card p-5 shadow-lg">
        <h3 className="text-base font-bold text-ink">{title}</h3>
        <p className="mt-1 text-sm text-muted">{message}</p>
        <div className="mt-4 flex gap-2">
          <button
            ref={cancelRef}
            onClick={onCancel}
            className="flex-1 rounded-full border border-border bg-card2 py-2.5 text-sm font-semibold text-ink transition-colors hover:bg-border/50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 rounded-full border border-red/40 bg-red/15 py-2.5 text-sm font-bold text-red transition-colors hover:bg-red/25"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
