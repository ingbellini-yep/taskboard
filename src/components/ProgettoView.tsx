import { useEffect, useMemo, useState } from 'react'
import { useProjects } from '../hooks/useProjects'
import { useWorkspaces } from '../hooks/useWorkspaces'
import { useProjectRecords } from '../hooks/useProjectRecords'
import { RecordDetailModal } from './RecordDetailModal'
import { ProjectTree } from './ProjectTree'
import { NewProjectModal } from './NewProjectModal'
import { kindLabel, dueDateLabel, isOverdue } from '../utils/format'
import { buildTree, treeToText } from '../lib/recordTree'
import { exportProjectDocx, downloadBlob } from '../lib/exportProjectDocx'
import { supabase } from '../lib/supabase'
import type { TbRecord, TbRecordItem } from '../types'

// ─── helpers ─────────────────────────────────────────────────────────────────

function formatDate(iso: string | null): string {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function kindBadgeClass(kind: string): string {
  if (kind === 'T') return 'bg-blue-600 text-white'
  if (kind === 'M') return 'bg-gray-500 text-white'
  return 'bg-orange-500 text-white'
}

function statusBadge(r: TbRecord): { label: string; cls: string } {
  switch (r.rec_status) {
    case 'aperto':      return { label: 'aperto',      cls: 'bg-blue-50 text-blue-700 border-blue-200' }
    case 'in_progress': return { label: 'in corso',    cls: 'bg-orange-50 text-orange-700 border-orange-200' }
    case 'sospeso':     return { label: 'sospeso',     cls: 'bg-yellow-50 text-yellow-700 border-yellow-200' }
    case 'chiuso':      return { label: 'chiuso',      cls: 'bg-green-50 text-green-700 border-green-200' }
    case 'archiviato':  return { label: 'archiviato',  cls: 'bg-gray-100 text-gray-500 border-gray-200' }
    default:            return { label: r.rec_status,  cls: 'bg-gray-100 text-gray-500 border-gray-200' }
  }
}

// Ordine dei gruppi di status
const STATUS_ORDER = ['aperto', 'in_progress', 'sospeso', 'chiuso', 'archiviato']
const STATUS_LABELS: Record<string, string> = {
  aperto:      '🔵 Aperti',
  in_progress: '🟠 In corso',
  sospeso:     '⏸ Sospesi',
  chiuso:      '✅ Chiusi',
  archiviato:  '📁 Archiviati',
}

// ─── Record card compatta ─────────────────────────────────────────────────────

function RecordRow({ record: r }: { record: TbRecord }) {
  const [showDetail, setShowDetail] = useState(false)
  const wsColor = r.ws_color ?? '#718096'
  const sb = statusBadge(r)
  const overdue = isOverdue(r.rec_due_date)

  return (
    <>
      <div
        onClick={() => setShowDetail(true)}
        className="bg-white border border-gray-200 rounded-lg px-4 py-3 flex items-start gap-3 cursor-pointer hover:border-gray-300 hover:shadow-sm transition-all group"
        style={{ borderLeftColor: wsColor, borderLeftWidth: 3 }}
      >
        {/* Tipo badge */}
        <span className={`text-xs px-1.5 py-0.5 rounded font-medium shrink-0 mt-0.5 ${kindBadgeClass(r.rec_kind)}`}>
          {kindLabel(r.rec_kind)}
        </span>

        {/* Contenuto */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-2 flex-wrap">
            <span className="font-medium text-sm text-gray-900 leading-snug flex-1">
              {r.rec_flagged && <span className="text-yellow-500 mr-1">⭐</span>}
              {r.rec_title}
            </span>
            {r.rec_code && (
              <span className="font-mono text-xs text-gray-400 shrink-0">{r.rec_code}</span>
            )}
          </div>
          {r.rec_body && (
            <p className="text-xs text-gray-500 line-clamp-1 mt-0.5">{r.rec_body}</p>
          )}
          <div className="flex flex-wrap items-center gap-2 mt-1.5">
            <span className={`text-xs px-2 py-0.5 rounded-full border ${sb.cls}`}>{sb.label}</span>
            {r.rec_priority === 1 && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200">alta</span>
            )}
            {r.rec_due_date && r.rec_kind !== 'EV' && (
              <span className="text-xs font-medium" style={{ color: overdue ? '#C62828' : '#757575' }}>
                ⏰ {dueDateLabel(r.rec_due_date)}
              </span>
            )}
            {r.rec_kind === 'EV' && r.rec_event_start && (
              <span className="text-xs text-orange-600">
                📅 {formatDate(r.rec_event_start)}
              </span>
            )}
            {r.rec_done_at && r.rec_status === 'chiuso' && (
              <span className="text-xs text-gray-400">Chiuso {formatDate(r.rec_done_at)}</span>
            )}
            {r.rec_hours != null && (
              <span className="text-xs bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full">
                {r.rec_hours}h
              </span>
            )}
          </div>
        </div>

        <span className="text-gray-300 group-hover:text-gray-400 text-xs mt-1 shrink-0">›</span>
      </div>

      {showDetail && (
        <RecordDetailModal record={r} onClose={() => setShowDetail(false)} />
      )}
    </>
  )
}

// ─── Status group ─────────────────────────────────────────────────────────────

function StatusGroup({ status, records }: { status: string; records: TbRecord[] }) {
  const [collapsed, setCollapsed] = useState(status === 'archiviato')

  if (records.length === 0) return null

  return (
    <section>
      <button
        onClick={() => setCollapsed(c => !c)}
        className="w-full flex items-center gap-2 py-2 mb-2 border-b border-gray-200 text-left hover:text-gray-900 transition-colors"
      >
        <span className="font-semibold text-sm text-gray-800">
          {STATUS_LABELS[status] ?? status}
        </span>
        <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{records.length}</span>
        <span className="ml-auto text-xs text-gray-400">{collapsed ? '▼' : '▲'}</span>
      </button>
      {!collapsed && (
        <div className="flex flex-col gap-2">
          {records.map(r => <RecordRow key={r.rec_id} record={r} />)}
        </div>
      )}
    </section>
  )
}

// ─── ProgettoView principale ──────────────────────────────────────────────────

type KindFilter = 'all' | 'T' | 'M' | 'EV'
type ViewMode = 'elenco' | 'albero' | 'testo'

export function ProgettoView({ initialPrjId }: { initialPrjId?: string | null } = {}) {
  const { projects, loading: projLoading, refetch: refetchProjects } = useProjects()
  const { workspaces } = useWorkspaces()
  const [selectedPrjId, setSelectedPrjId] = useState<string | null>(initialPrjId ?? null)
  const [showNewProject, setShowNewProject] = useState(false)
  const [filterKind, setFilterKind] = useState<KindFilter>('all')
  const [filterText, setFilterText] = useState('')
  const [view, setView] = useState<ViewMode>('elenco')
  const [items, setItems] = useState<TbRecordItem[]>([])
  const [exporting, setExporting] = useState(false)

  useEffect(() => { if (initialPrjId) setSelectedPrjId(initialPrjId) }, [initialPrjId])

  const { records, loading, refetch } = useProjectRecords(selectedPrjId)

  // Sub-task e aggiornamenti di tutti i record del progetto (per albero, testo e Word)
  useEffect(() => {
    if (records.length === 0) { setItems([]); return }
    const ids = records.map(r => r.rec_id)
    supabase
      .from('tb_record_items')
      .select('*')
      .in('item_parent_id', ids)
      .order('item_created_at')
      .then(({ data }) => setItems((data ?? []) as TbRecordItem[]))
  }, [records])

  const itemsByRec = useMemo(() => {
    const m = new Map<string, TbRecordItem[]>()
    for (const it of items) {
      if (!m.has(it.item_parent_id)) m.set(it.item_parent_id, [])
      m.get(it.item_parent_id)!.push(it)
    }
    return m
  }, [items])

  // Progetto selezionato (info)
  const selectedProject = useMemo(
    () => projects.find(p => p.prj_id === selectedPrjId) ?? null,
    [projects, selectedPrjId]
  )

  // Workspace del progetto
  const selectedWs = useMemo(
    () => workspaces.find(w => w.ws_code === selectedProject?.prj_ws_code) ?? null,
    [workspaces, selectedProject]
  )

  // Filtra e raggruppa
  const filtered = useMemo(() => {
    let r = records
    if (filterKind !== 'all') r = r.filter(x => x.rec_kind === filterKind)
    if (filterText.trim()) {
      const q = filterText.trim().toLowerCase()
      r = r.filter(x =>
        x.rec_title.toLowerCase().includes(q) ||
        (x.rec_body ?? '').toLowerCase().includes(q) ||
        (x.rec_code ?? '').toLowerCase().includes(q)
      )
    }
    return r
  }, [records, filterKind, filterText])

  const groups = useMemo(() => {
    return STATUS_ORDER
      .map(status => ({
        status,
        records: filtered.filter(r => r.rec_status === status),
      }))
      .filter(g => g.records.length > 0)
  }, [filtered])

  // Albero (sui record filtrati) e outline testuale
  const treeRoots = useMemo(() => buildTree(filtered), [filtered])
  const treeText = useMemo(() => {
    if (!selectedProject) return ''
    return treeToText(treeRoots, `${selectedProject.prj_code} — ${selectedProject.prj_label}`, itemsByRec)
  }, [treeRoots, selectedProject, itemsByRec])

  async function handleExportDocx() {
    if (!selectedProject || exporting) return
    setExporting(true)
    try {
      const blob = await exportProjectDocx(selectedProject, records, items)
      downloadBlob(blob, `${selectedProject.prj_code}_storia_progetto.docx`)
    } finally {
      setExporting(false)
    }
  }

  // Statistiche
  const stats = useMemo(() => ({
    totali: filtered.length,
    aperti: filtered.filter(r => ['aperto', 'in_progress', 'sospeso'].includes(r.rec_status)).length,
    chiusi: filtered.filter(r => r.rec_status === 'chiuso').length,
    archiviati: filtered.filter(r => r.rec_status === 'archiviato').length,
    task: filtered.filter(r => r.rec_kind === 'T').length,
    memo: filtered.filter(r => r.rec_kind === 'M').length,
    eventi: filtered.filter(r => r.rec_kind === 'EV').length,
    oreRec: filtered.reduce((s, r) => s + (r.rec_hours ?? 0), 0),
  }), [filtered])

  // Progetti raggruppati per workspace (per il select)
  const projectsByWs = useMemo(() => {
    const map = new Map<string, { wsLabel: string; projects: typeof projects }>()
    for (const p of projects) {
      if (p.prj_code === 'SMALL') continue
      const wsCode = p.prj_ws_code ?? '—'
      const ws = workspaces.find(w => w.ws_code === wsCode)
      const wsLabel = ws?.ws_label ?? wsCode
      if (!map.has(wsCode)) map.set(wsCode, { wsLabel, projects: [] })
      map.get(wsCode)!.projects.push(p)
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]))
  }, [projects, workspaces])

  return (
    <div className="flex flex-col gap-5">
      {/* ── Selettore progetto ── */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <label className="text-sm font-semibold text-gray-700 shrink-0">📂 Progetto</label>
          <select
            value={selectedPrjId ?? ''}
            onChange={e => { setSelectedPrjId(e.target.value || null); setFilterText('') }}
            className="border border-gray-200 rounded px-3 py-2 text-sm text-gray-900 bg-white flex-1 max-w-md"
            disabled={projLoading}
          >
            <option value="">— Seleziona un progetto —</option>
            {projectsByWs.map(([wsCode, { wsLabel, projects: wsPrj }]) => (
              <optgroup key={wsCode} label={`[${wsCode}] ${wsLabel}`}>
                {wsPrj.map(p => (
                  <option key={p.prj_id} value={p.prj_id}>
                    {p.prj_code} — {p.prj_label}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
          <button
            onClick={() => setShowNewProject(true)}
            className="shrink-0 bg-blue-700 hover:bg-blue-800 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors print:hidden"
          >
            + Nuovo progetto
          </button>
        </div>

        {showNewProject && (
          <NewProjectModal
            onCreated={async prjId => {
              setShowNewProject(false)
              await refetchProjects()
              setSelectedPrjId(prjId)
              setFilterText('')
            }}
            onCancel={() => setShowNewProject(false)}
          />
        )}

        {/* Info progetto selezionato */}
        {selectedProject && (
          <div
            className="flex items-center gap-3 px-4 py-2.5 rounded-lg border"
            style={{
              borderTopColor: '#E0E0E0',
              borderRightColor: '#E0E0E0',
              borderBottomColor: '#E0E0E0',
              borderLeftColor: selectedWs?.ws_color ?? '#718096',
              borderLeftWidth: 4,
              backgroundColor: '#F8F9FA',
            }}
          >
            <span className="text-sm font-semibold text-gray-800">{selectedProject.prj_label}</span>
            <span className="text-xs font-mono text-gray-400">{selectedProject.prj_code}</span>
            {selectedWs && (
              <span
                className="text-xs px-2 py-0.5 rounded text-white font-medium"
                style={{ backgroundColor: selectedWs.ws_color }}
              >
                {selectedWs.ws_code}
              </span>
            )}
            <span className={`text-xs px-2 py-0.5 rounded-full border ml-auto ${
              selectedProject.prj_status === 'active'
                ? 'bg-green-50 text-green-700 border-green-200'
                : 'bg-gray-100 text-gray-500 border-gray-200'
            }`}>
              {selectedProject.prj_status}
            </span>
          </div>
        )}
      </div>

      {/* ── Solo se progetto selezionato ── */}
      {!selectedPrjId ? (
        <div className="text-center py-16 text-gray-400">
          <div className="text-5xl mb-3">📂</div>
          <p className="text-sm">Seleziona un progetto per visualizzarne tutti i record</p>
        </div>
      ) : loading ? (
        <LoadingState />
      ) : (
        <>
          {/* Statistiche progetto */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
            {[
              { label: 'Totali',     value: stats.totali },
              { label: 'Aperti',     value: stats.aperti },
              { label: 'Chiusi',     value: stats.chiusi },
              { label: 'Archiviati', value: stats.archiviati },
              { label: 'Task',       value: stats.task },
              { label: 'Memo',       value: stats.memo },
              { label: 'Ore',        value: stats.oreRec > 0 ? `${stats.oreRec.toFixed(1)}h` : '—' },
            ].map(s => (
              <div key={s.label} className="bg-white border border-gray-200 rounded-lg px-3 py-2.5 text-center">
                <div className="text-lg font-bold text-gray-900">{s.value}</div>
                <div className="text-xs text-gray-500 uppercase tracking-wide">{s.label}</div>
              </div>
            ))}
          </div>

          {/* Filtri */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500 font-medium uppercase tracking-wide">TIPO</span>
              {(['all', 'T', 'M', 'EV'] as KindFilter[]).map(k => (
                <button
                  key={k}
                  onClick={() => setFilterKind(k)}
                  className={`text-xs px-3 py-1 rounded-full border transition-all ${
                    filterKind === k
                      ? 'bg-blue-700 text-white border-blue-700'
                      : 'border-gray-200 bg-white text-gray-500 hover:border-gray-400'
                  }`}
                >
                  {k === 'all' ? 'Tutti' : kindLabel(k)}
                </button>
              ))}
            </div>
            <input
              type="text"
              value={filterText}
              onChange={e => setFilterText(e.target.value)}
              placeholder="Cerca nel progetto…"
              className="border border-gray-200 rounded px-2 py-1.5 text-sm text-gray-700 bg-white w-52"
            />
            <span className="text-sm text-gray-500 ml-auto">{filtered.length} record</span>
          </div>

          {/* Vista + azioni di stampa/esportazione */}
          <div className="flex flex-wrap items-center gap-2 print:hidden">
            <div className="flex rounded-lg border border-gray-200 overflow-hidden">
              {(['elenco', 'albero', 'testo'] as ViewMode[]).map(v => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                    view === v ? 'bg-gray-800 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  {v === 'elenco' ? '☰ Elenco' : v === 'albero' ? '🌳 Albero' : '📄 Testo'}
                </button>
              ))}
            </div>
            <div className="ml-auto flex items-center gap-2">
              {view !== 'elenco' && (
                <button
                  onClick={() => window.print()}
                  className="px-3 py-1.5 text-xs font-medium border border-gray-200 bg-white rounded-lg hover:bg-gray-50 text-gray-600"
                >
                  🖨 Stampa
                </button>
              )}
              {view === 'testo' && (
                <button
                  onClick={() => navigator.clipboard.writeText(treeText)}
                  className="px-3 py-1.5 text-xs font-medium border border-gray-200 bg-white rounded-lg hover:bg-gray-50 text-gray-600"
                >
                  📋 Copia
                </button>
              )}
              <button
                onClick={handleExportDocx}
                disabled={exporting}
                className="px-3 py-1.5 text-xs font-medium bg-blue-700 text-white rounded-lg hover:bg-blue-800 disabled:opacity-50"
              >
                {exporting ? 'Generazione…' : '⬇ Esporta Word'}
              </button>
            </div>
          </div>

          {/* Contenuto */}
          {view === 'elenco' && (
            groups.length === 0 ? (
              <div className="text-center py-12 text-gray-400 text-sm">Nessun record trovato.</div>
            ) : (
              <div className="flex flex-col gap-5">
                {groups.map(g => (
                  <StatusGroup key={g.status} status={g.status} records={g.records} />
                ))}
              </div>
            )
          )}

          {view === 'albero' && selectedProject && (
            <div className="print-area">
              <div className="hidden print:block mb-4">
                <h1 className="text-xl font-bold">{selectedProject.prj_label}</h1>
                <p className="text-sm text-gray-600">{selectedProject.prj_code} · {selectedProject.prj_ws_code} · stampato il {new Date().toLocaleDateString('it-IT')}</p>
              </div>
              <ProjectTree
                roots={treeRoots}
                items={itemsByRec}
                project={{ prj_id: selectedProject.prj_id, prj_code: selectedProject.prj_code, prj_ws_id: selectedProject.prj_ws_id, prj_ws_code: selectedProject.prj_ws_code }}
                onChanged={refetch}
              />
            </div>
          )}

          {view === 'testo' && (
            <div className="print-area">
              <pre className="tree-text bg-white border border-gray-200 rounded-xl p-4 text-xs leading-relaxed overflow-x-auto font-mono text-gray-800 whitespace-pre">
                {treeText}
              </pre>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function LoadingState() {
  return (
    <div className="flex flex-col gap-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="h-16 bg-gray-100 rounded-lg animate-pulse" />
      ))}
    </div>
  )
}
