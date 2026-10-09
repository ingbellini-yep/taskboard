import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { TbRecord } from '../types'

interface Props {
  record: TbRecord
  onDone: () => void
  onCancel: () => void
}

const PRIORITIES = [
  { value: 1, label: 'Alta' },
  { value: 2, label: 'Normale' },
  { value: 3, label: 'Bassa' },
]

/** Modifica titolo e contenuti di un Task (T) o Memo (M) di progetto. */
export function EditRecordModal({ record: r, onDone, onCancel }: Props) {
  const titleRef = useRef<HTMLInputElement>(null)
  const isTask = r.rec_kind === 'T'

  const [title, setTitle] = useState(r.rec_title)
  const [body, setBody] = useState(r.rec_body ?? '')
  const [priority, setPriority] = useState(r.rec_priority ?? 2)
  const [due, setDue] = useState(r.rec_due_date ? r.rec_due_date.slice(0, 10) : '')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    titleRef.current?.focus()
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onCancel])

  async function handleSave() {
    if (!title.trim() || saving) return
    setSaving(true)
    const patch: Record<string, unknown> = {
      rec_title: title.trim(),
      rec_body: body.trim() || null,
      rec_priority: priority,
    }
    if (isTask) patch.rec_due_date = due || null
    await supabase.from('tb_records').update(patch).eq('rec_id', r.rec_id)
    setSaving(false)
    onDone()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 overflow-y-auto py-8 px-4"
      onClick={e => { if (e.target === e.currentTarget) onCancel() }}
    >
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <span className="font-semibold text-gray-900">✏️ Modifica {isTask ? 'Task' : 'Memo'}</span>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-600 text-lg leading-none">×</button>
        </div>

        <div className="px-5 py-5 flex flex-col gap-4 max-h-[70vh] overflow-y-auto">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500">Titolo</label>
            <input
              ref={titleRef}
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500">{isTask ? 'Note / contenuto' : 'Contenuto'}</label>
            <textarea
              value={body}
              onChange={e => setBody(e.target.value)}
              rows={6}
              placeholder="Dettagli, contesto, riferimenti…"
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex gap-3">
            <div className="flex flex-col gap-1 flex-1">
              <label className="text-xs text-gray-500">Priorità</label>
              <select
                value={priority}
                onChange={e => setPriority(Number(e.target.value))}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {PRIORITIES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </div>
            {isTask && (
              <div className="flex flex-col gap-1 flex-1">
                <label className="text-xs text-gray-500">Scadenza</label>
                <input
                  type="date"
                  value={due}
                  onChange={e => setDue(e.target.value)}
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-gray-100">
          <button onClick={onCancel} disabled={saving} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 font-medium disabled:opacity-50">
            Annulla
          </button>
          <button
            onClick={handleSave} disabled={!title.trim() || saving}
            className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white text-sm font-medium rounded disabled:opacity-50"
          >
            {saving ? 'Salvataggio…' : 'Salva modifiche'}
          </button>
        </div>
      </div>
    </div>
  )
}
