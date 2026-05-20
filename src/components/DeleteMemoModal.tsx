import { useEffect, useState } from 'react'

interface Props {
  recTitle: string
  onConfirm: () => void
  onCancel: () => void
}

export function DeleteMemoModal({ recTitle, onConfirm, onCancel }: Props) {
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel() }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onCancel])

  async function handleConfirm() {
    setDeleting(true)
    await onConfirm()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={e => { if (e.target === e.currentTarget) onCancel() }}
    >
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <span className="font-semibold text-gray-900">🗑 Elimina Memo</span>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600 text-lg leading-none transition-colors"
          >
            ×
          </button>
        </div>

        <div className="px-5 py-5 flex flex-col gap-3">
          <p className="text-gray-700 text-sm leading-snug line-clamp-2">{recTitle}</p>
          <p className="text-xs text-red-600 font-medium">
            Operazione irreversibile. Il memo verrà eliminato definitivamente.
          </p>
        </div>

        <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-gray-100">
          <button
            onClick={onCancel}
            disabled={deleting}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 font-medium transition-colors disabled:opacity-50"
          >
            Annulla
          </button>
          <button
            onClick={handleConfirm}
            disabled={deleting}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 flex items-center gap-1.5"
          >
            {deleting ? (
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              'Elimina'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
