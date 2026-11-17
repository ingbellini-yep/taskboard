import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { deleteProject } from '../hooks/useProjects'
import type { Project } from '../types'

interface Props {
  project: Project
  recordCount: number
  onDeleted: () => void
  onCancel: () => void
}

/** Elimina definitivamente un progetto con tutti i suoi record (RPC tb_delete_project). */
export function DeleteProjectModal({ project, recordCount, onDeleted, onCancel }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [confirmCode, setConfirmCode] = useState('')
  const [purchaseCount, setPurchaseCount] = useState<number | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    inputRef.current?.focus()
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onCancel])

  useEffect(() => {
    supabase
      .from('tb_purchases')
      .select('pur_id', { count: 'exact', head: true })
      .eq('pur_prj_id', project.prj_id)
      .then(({ count }) => setPurchaseCount(count ?? 0))
  }, [project.prj_id])

  const canDelete = confirmCode.trim().toUpperCase() === project.prj_code.toUpperCase() && !deleting

  async function handleDelete() {
    if (!canDelete) return
    setDeleting(true)
    setError(null)
    const { error: err } = await deleteProject(project.prj_id)
    if (err) { setError(err); setDeleting(false); return }
    onDeleted()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
      onClick={e => { if (e.target === e.currentTarget) onCancel() }}
    >
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <span className="font-semibold text-gray-900">🗑 Elimina progetto</span>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-600 text-lg leading-none">×</button>
        </div>

        <div className="px-5 py-5 flex flex-col gap-4">
          <div>
            <span className="font-mono text-xs text-gray-400">{project.prj_code} · </span>
            <span className="text-sm text-gray-800 font-medium">{project.prj_label}</span>
          </div>

          <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-xs text-red-800 flex flex-col gap-1.5">
            <p className="font-semibold">Operazione irreversibile. Verranno eliminati:</p>
            <ul className="list-disc pl-4 flex flex-col gap-0.5">
              <li>il progetto e la sua numerazione</li>
              <li><b>{recordCount}</b> record (task, memo, eventi) con sotto-task, aggiornamenti e allegati</li>
            </ul>
            {purchaseCount !== null && purchaseCount > 0 && (
              <p className="pt-1">
                <b>{purchaseCount}</b> {purchaseCount === 1 ? 'acquisto resterà' : 'acquisti resteranno'} in archivio, senza progetto.
              </p>
            )}
            <p className="pt-1 text-red-700">
              Se vuoi conservare i record, usa invece <b>Fondi progetti</b> per spostarli in un altro progetto.
            </p>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500">
              Per confermare digita il codice <span className="font-mono font-semibold text-gray-700">{project.prj_code}</span>
            </label>
            <input
              ref={inputRef}
              value={confirmCode}
              onChange={e => setConfirmCode(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleDelete() }}
              placeholder={project.prj_code}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono text-gray-900 focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>

          {error && (
            <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">⚠️ {error}</p>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-gray-100">
          <button
            onClick={onCancel}
            disabled={deleting}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 font-medium disabled:opacity-50"
          >
            Annulla
          </button>
          <button
            onClick={handleDelete}
            disabled={!canDelete}
            className="px-4 py-2 bg-red-700 hover:bg-red-800 text-white text-sm font-medium rounded disabled:opacity-50 flex items-center gap-1.5"
          >
            {deleting ? (
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              'Elimina definitivamente'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
