import { useEffect, useState } from 'react'
import { useProjects } from '../hooks/useProjects'
import { assignToProject } from '../hooks/useRecords'
import type { Project } from '../types'

interface Props {
  recId: string
  recTitle: string
  recCode: string | null
  onDone: () => void
  onCancel: () => void
}

export function ReassignTaskModal({ recId, recTitle, recCode, onDone, onCancel }: Props) {
  const { projects, loading } = useProjects()
  const [selectedPrj, setSelectedPrj] = useState<Project | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel() }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onCancel])

  async function handleConfirm() {
    if (!selectedPrj) return
    setSaving(true)
    await assignToProject(recId, selectedPrj.prj_id, selectedPrj.prj_code, selectedPrj.prj_ws_id, selectedPrj.prj_ws_code)
    setSaving(false)
    onDone()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={e => { if (e.target === e.currentTarget) onCancel() }}
    >
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <span className="font-semibold text-gray-900">✏️ Riattribuisci Task</span>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600 text-lg leading-none transition-colors"
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-5 flex flex-col gap-4">
          {/* Task reference */}
          <div>
            {recCode && (
              <span className="font-mono text-xs text-gray-400">{recCode} · </span>
            )}
            <span className="text-sm text-gray-700 font-medium line-clamp-2">{recTitle}</span>
          </div>

          {/* Project selector */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              Progetto destinazione
            </label>
            {loading ? (
              <div className="text-sm text-gray-400">Caricamento progetti…</div>
            ) : (
              <select
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={selectedPrj?.prj_id ?? ''}
                onChange={e => {
                  const prj = projects.find(p => p.prj_id === e.target.value) ?? null
                  setSelectedPrj(prj)
                }}
              >
                <option value="">— Seleziona progetto —</option>
                {projects.map(p => (
                  <option key={p.prj_id} value={p.prj_id}>
                    [{p.prj_ws_code}] {p.prj_code} — {p.prj_label}
                  </option>
                ))}
              </select>
            )}
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
            disabled={saving || !selectedPrj}
            className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white text-sm font-medium rounded transition-colors disabled:opacity-50 flex items-center gap-1.5"
          >
            {saving ? (
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              'Riattribuisci'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
