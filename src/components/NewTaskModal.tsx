import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'

interface Props {
  onClose: () => void
}

export function NewTaskModal({ onClose }: Props) {
  const [title, setTitle] = useState('')
  const [saving, setSaving] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  async function handleSave() {
    if (!title.trim() || saving) return
    setSaving(true)
    await supabase.from('tb_records').insert({
      rec_title: title.trim(),
      rec_kind: 'T',
      rec_status: 'aperto',
      rec_bucket: 'inbox',
      rec_priority: 2,
    })
    setSaving(false)
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-xl w-full max-w-sm mx-4 p-6 flex flex-col gap-4"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">+ Nuovo Task</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>
        <input
          ref={inputRef}
          type="text"
          placeholder="Titolo del task…"
          value={title}
          onChange={e => setTitle(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleSave() }}
          className="border border-gray-200 rounded px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-blue-500"
        />
        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="border border-gray-200 bg-white text-gray-600 px-4 py-2 rounded text-sm hover:bg-gray-50"
          >
            Annulla
          </button>
          <button
            onClick={handleSave}
            disabled={!title.trim() || saving}
            className="bg-blue-700 text-white px-4 py-2 rounded text-sm font-medium hover:bg-blue-800 disabled:opacity-50 transition-colors"
          >
            {saving ? 'Salvataggio…' : 'Salva in Inbox'}
          </button>
        </div>
      </div>
    </div>
  )
}
