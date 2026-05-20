import { useEffect, useRef, useState } from 'react'

interface Props {
  recCode: string | null
  recTitle: string
  onConfirm: (hours: number | null) => void
  onCancel: () => void
}

export function CloseTaskModal({ recCode, recTitle, onConfirm, onCancel }: Props) {
  const [hoursValue, setHoursValue] = useState('')
  const [saving, setSaving] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
    const onKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel() }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onCancel])

  async function handleConfirm() {
    setSaving(true)
    const parsed = hoursValue.trim() === '' ? null : parseFloat(hoursValue)
    const hours = parsed !== null && !isNaN(parsed) ? parsed : null
    await onConfirm(hours)
  }

  return (
    /* Overlay */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={e => { if (e.target === e.currentTarget) onCancel() }}
    >
      {/* Modal */}
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <span className="font-semibold text-gray-900">✓ Chiudi Task</span>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600 text-lg leading-none transition-colors"
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-5 flex flex-col gap-4">
          {recCode && (
            <p className="font-mono text-xs text-gray-400">{recCode}</p>
          )}
          <p className="text-gray-900 font-medium text-sm leading-snug">{recTitle}</p>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-gray-600">
              Ore lavorate <span className="text-gray-400 font-normal">(opzionale)</span>
            </label>
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                type="number"
                step="0.5"
                min="0"
                max="999"
                placeholder="0"
                value={hoursValue}
                onChange={e => setHoursValue(e.target.value)}
                className="w-24 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-blue-500 transition-colors"
              />
              <span className="text-sm text-gray-500">h &nbsp;·&nbsp; es. 1.5 = 1h 30min</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-gray-100">
          <button
            onClick={onCancel}
            disabled={saving}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 font-medium transition-colors disabled:opacity-50"
          >
            Annulla
          </button>
          <button
            onClick={handleConfirm}
            disabled={saving}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 flex items-center gap-1.5"
          >
            {saving ? (
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>Chiudi Task <span className="font-bold">✓</span></>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
