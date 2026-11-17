import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { mergeProjects } from '../hooks/useProjects'
import type { Project, Workspace } from '../types'

interface Props {
  project: Project
  projects: Project[]
  workspaces: Workspace[]
  recordCount: number
  onMerged: (keptPrjId: string) => void
  onCancel: () => void
}

/**
 * Fonde due progetti (RPC tb_merge_projects): il progetto corrente e un secondo
 * progetto scelto dall'utente. Si sceglie quale dei due sopravvive; i record
 * dell'altro vengono spostati e rinumerati nel progetto mantenuto.
 */
export function MergeProjectsModal({ project, projects, workspaces, recordCount, onMerged, onCancel }: Props) {
  const [otherId, setOtherId] = useState('')
  const [keep, setKeep] = useState<'current' | 'other'>('current')
  const [otherCount, setOtherCount] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onCancel])

  const other = useMemo(() => projects.find(p => p.prj_id === otherId) ?? null, [projects, otherId])

  useEffect(() => {
    if (!otherId) { setOtherCount(null); return }
    setOtherCount(null)
    supabase
      .from('tb_records')
      .select('rec_id', { count: 'exact', head: true })
      .eq('rec_prj_id', otherId)
      .then(({ count }) => setOtherCount(count ?? 0))
  }, [otherId])

  // Candidati: tutti gli altri progetti, raggruppati per workspace
  const candidatesByWs = useMemo(() => {
    const map = new Map<string, { wsLabel: string; projects: Project[] }>()
    for (const p of projects) {
      if (p.prj_id === project.prj_id) continue
      const wsCode = p.prj_ws_code ?? '—'
      const wsLabel = workspaces.find(w => w.ws_code === wsCode)?.ws_label ?? wsCode
      if (!map.has(wsCode)) map.set(wsCode, { wsLabel, projects: [] })
      map.get(wsCode)!.projects.push(p)
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]))
  }, [projects, workspaces, project.prj_id])

  const kept   = keep === 'current' ? project : other
  const merged = keep === 'current' ? other : project
  const mergedCount = keep === 'current' ? otherCount : recordCount
  const crossWs = !!other && other.prj_ws_code !== project.prj_ws_code

  const canMerge = !!other && !saving

  async function handleMerge() {
    if (!canMerge || !kept || !merged) return
    setSaving(true)
    setError(null)
    const { error: err } = await mergeProjects(merged.prj_id, kept.prj_id)
    if (err) { setError(err); setSaving(false); return }
    onMerged(kept.prj_id)
  }

  function PrjOption({ p, label, count }: { p: Project; label: string; count: number | null }) {
    return (
      <div className="flex flex-col gap-0.5 min-w-0">
        <span className="text-xs text-gray-400 uppercase tracking-wide">{label}</span>
        <span className="text-sm text-gray-800 font-medium truncate">
          <span className="font-mono text-xs text-gray-400 mr-1.5">{p.prj_code}</span>{p.prj_label}
        </span>
        <span className="text-xs text-gray-500">{count === null ? '…' : `${count} record`}</span>
      </div>
    )
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 overflow-y-auto py-8 px-4"
      onClick={e => { if (e.target === e.currentTarget) onCancel() }}
    >
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <span className="font-semibold text-gray-900">⇄ Fondi progetti</span>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-600 text-lg leading-none">×</button>
        </div>

        <div className="px-5 py-5 flex flex-col gap-4">
          {/* Progetto corrente */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3">
            <PrjOption p={project} label="Progetto corrente" count={recordCount} />
          </div>

          {/* Secondo progetto */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Fondi con</label>
            <select
              value={otherId}
              onChange={e => setOtherId(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">— Seleziona il secondo progetto —</option>
              {candidatesByWs.map(([wsCode, { wsLabel, projects: wsPrj }]) => (
                <optgroup key={wsCode} label={`[${wsCode}] ${wsLabel}`}>
                  {wsPrj.map(p => (
                    <option key={p.prj_id} value={p.prj_id}>{p.prj_code} — {p.prj_label}</option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>

          {other && (
            <>
              {/* Quale mantenere */}
              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Progetto da mantenere</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {([
                    { key: 'current' as const, p: project, count: recordCount },
                    { key: 'other' as const,   p: other,   count: otherCount },
                  ]).map(opt => {
                    const active = keep === opt.key
                    return (
                      <button
                        key={opt.key}
                        type="button"
                        onClick={() => setKeep(opt.key)}
                        className={`text-left border rounded-lg px-3 py-2.5 transition-all ${
                          active ? 'border-blue-600 bg-blue-50 ring-1 ring-blue-600' : 'border-gray-200 bg-white hover:border-gray-400'
                        }`}
                      >
                        <PrjOption p={opt.p} label={active ? '✓ Mantieni' : 'Mantieni'} count={opt.count} />
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Riepilogo effetti */}
              {kept && merged && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-xs text-amber-900 flex flex-col gap-1.5">
                  <p className="font-semibold">Cosa succede:</p>
                  <ul className="list-disc pl-4 flex flex-col gap-0.5">
                    <li>
                      <b>{mergedCount ?? '…'}</b> record di <span className="font-mono">{merged.prj_code}</span> passano a{' '}
                      <span className="font-mono">{kept.prj_code}</span> e ricevono un nuovo codice nella sua numerazione
                      (il vecchio codice resta tracciato nel registro modifiche).
                    </li>
                    <li>Acquisti, note, tag e cliente di <span className="font-mono">{merged.prj_code}</span> vengono riportati su <span className="font-mono">{kept.prj_code}</span>.</li>
                    <li>Il progetto <span className="font-mono">{merged.prj_code}</span> viene eliminato.</li>
                    {crossWs && (
                      <li className="text-amber-800">
                        I progetti appartengono a categorie diverse: i record spostati passeranno alla categoria{' '}
                        <b>{kept.prj_ws_code}</b>.
                      </li>
                    )}
                  </ul>
                </div>
              )}
            </>
          )}

          {error && (
            <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">⚠️ {error}</p>
          )}
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
            onClick={handleMerge}
            disabled={!canMerge}
            className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white text-sm font-medium rounded disabled:opacity-50 flex items-center gap-1.5"
          >
            {saving ? (
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              kept ? `Fondi in ${kept.prj_code}` : 'Fondi'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
