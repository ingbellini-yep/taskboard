import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useWorkspaces } from '../hooks/useWorkspaces'
import type { WorkspaceCode } from '../types'

interface Props {
  onCreated: (prjId: string) => void
  onCancel: () => void
}

/** Crea un nuovo progetto: codice generato dal DB (tb_generate_project_code). */
export function NewProjectModal({ onCreated, onCancel }: Props) {
  const { workspaces } = useWorkspaces()
  const labelRef = useRef<HTMLInputElement>(null)

  const [wsCode, setWsCode] = useState<WorkspaceCode | ''>('')
  const [label, setLabel] = useState('')
  const [client, setClient] = useState('')
  const [priority, setPriority] = useState(2)
  const [due, setDue] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    labelRef.current?.focus()
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onCancel])

  const canSave = !!wsCode && label.trim().length > 0 && !saving

  async function handleSave() {
    if (!canSave) return
    setSaving(true)
    setError(null)
    const ws = workspaces.find(w => w.ws_code === wsCode)
    if (!ws) { setError('Categoria non valida'); setSaving(false); return }

    const { data: code, error: codeErr } = await supabase.rpc('tb_generate_project_code', { p_ws_code: wsCode })
    if (codeErr || !code) { setError(codeErr?.message ?? 'Impossibile generare il codice'); setSaving(false); return }

    const { data, error: insErr } = await supabase
      .from('tb_projects')
      .insert({
        prj_code: code,
        prj_ws_id: ws.ws_id,
        prj_ws_code: wsCode,
        prj_label: label.trim(),
        prj_client: client.trim() || null,
        prj_status: 'active',
        prj_priority: priority,
        prj_due_date: due || null,
        prj_notes: notes.trim() || null,
      })
      .select('prj_id')
      .single()

    setSaving(false)
    if (insErr || !data) { setError(insErr?.message ?? 'Errore nel salvataggio'); return }
    onCreated(data.prj_id as string)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 overflow-y-auto py-8 px-4"
      onClick={e => { if (e.target === e.currentTarget) onCancel() }}
    >
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <span className="font-semibold text-gray-900">📂 Nuovo progetto</span>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-600 text-lg leading-none">×</button>
        </div>

        <div className="px-5 py-5 flex flex-col gap-4">
          {/* Categoria */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-gray-500">Categoria</label>
            <div className="flex flex-wrap gap-2">
              {workspaces.map(w => {
                const active = wsCode === w.ws_code
                return (
                  <button
                    key={w.ws_id}
                    type="button"
                    onClick={() => setWsCode(w.ws_code)}
                    className="text-sm px-3 py-1.5 rounded-full border transition-all"
                    style={active
                      ? { backgroundColor: w.ws_color, color: 'white', borderColor: w.ws_color }
                      : { backgroundColor: 'white', color: '#4B5563', borderColor: '#E5E7EB' }}
                  >
                    {w.ws_icon} {w.ws_code} · {w.ws_label}
                  </button>
                )
              })}
            </div>
            {wsCode && <p className="text-xs text-gray-400">Il codice sarà generato automaticamente (es. {wsCode}-0xx)</p>}
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500">Nome del progetto</label>
            <input
              ref={labelRef}
              value={label}
              onChange={e => setLabel(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleSave() }}
              placeholder="Es. Depuratore Contrada Trinità – Naro (AG)"
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500">Cliente (opzionale)</label>
            <input
              value={client}
              onChange={e => setClient(e.target.value)}
              placeholder="Committente, ente, stazione appaltante…"
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex gap-3">
            <div className="flex flex-col gap-1 flex-1">
              <label className="text-xs text-gray-500">Priorità</label>
              <select
                value={priority}
                onChange={e => setPriority(Number(e.target.value))}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value={1}>Alta</option>
                <option value={2}>Normale</option>
                <option value={3}>Bassa</option>
              </select>
            </div>
            <div className="flex flex-col gap-1 flex-1">
              <label className="text-xs text-gray-500">Scadenza (opzionale)</label>
              <input
                type="date"
                value={due}
                onChange={e => setDue(e.target.value)}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500">Note (opzionale)</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={3}
              placeholder="Contesto, riferimenti, incarico…"
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {error && (
            <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">⚠️ {error}</p>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-gray-100">
          <button onClick={onCancel} disabled={saving} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 font-medium disabled:opacity-50">
            Annulla
          </button>
          <button
            onClick={handleSave}
            disabled={!canSave}
            className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white text-sm font-medium rounded disabled:opacity-50"
          >
            {saving ? 'Creazione…' : 'Crea progetto'}
          </button>
        </div>
      </div>
    </div>
  )
}
