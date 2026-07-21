import { useEffect, useState } from 'react'
import { useProjects } from '../hooks/useProjects'
import { assignToProject } from '../hooks/useRecords'

interface Props {
  recId: string
  recTitle: string
  onDone: () => void
  onCancel: () => void
}

/** Sposta uno small task su un progetto (diventa task di progetto con codice). */
export function ReassignSmallTaskModal({ recId, recTitle, onDone, onCancel }: Props) {
  const { projects } = useProjects()
  const [prjId, setPrjId] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onCancel])

  async function handleAssign() {
    const prj = projects.find(p => p.prj_id === prjId)
    if (!prj || saving) return
    setSaving(true)
    await assignToProject(recId, prj.prj_id, prj.prj_code, prj.prj_ws_id, prj.prj_ws_code)
    setSaving(false)
    onDone()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
      onClick={e => { if (e.target === e.currentTarget) onCancel() }}
    >
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <span className="font-semibold text-gray-900">📂 Assegna a progetto</span>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-600 text-lg leading-none">×</button>
        </div>

        <div className="px-5 py-5 flex flex-col gap-4">
          <p className="text-sm text-gray-700 leading-snug">{recTitle}</p>
          <p className="text-xs text-gray-500">
            Il task uscirà da Small Tasks e diventerà un task di progetto, con codice assegnato.
          </p>
          <select
            value={prjId}
            onChange={e => setPrjId(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Seleziona progetto…</option>
            {projects.map(p => (
              <option key={p.prj_id} value={p.prj_id}>
                [{p.prj_ws_code}] {p.prj_code} — {p.prj_label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-gray-100">
          <button
            onClick={onCancel}
            disabled={saving}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 font-medium disabled:opacity-50"
          >
            Annulla
          </button>
          <button
            onClick={handleAssign}
            disabled={!prjId || saving}
            className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white text-sm font-medium rounded disabled:opacity-50"
          >
            {saving ? 'Assegnazione…' : 'Assegna'}
          </button>
        </div>
      </div>
    </div>
  )
}
