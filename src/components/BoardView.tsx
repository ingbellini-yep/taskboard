import { useMemo, useState } from 'react'
import { useRecords } from '../hooks/useRecords'
import { useWorkspaces } from '../hooks/useWorkspaces'
import { RecordTile } from './RecordTile'
import { NewTaskModal } from './NewTaskModal'

type PriorityFilter = 'all' | 'urgente' | 'alta' | 'normale' | 'sospeso'
type SortOption = 'priorita' | 'scadenza' | 'recenti'

const PRIORITY_PILLS: { value: PriorityFilter; label: string }[] = [
  { value: 'all', label: 'Tutte' },
  { value: 'urgente', label: 'Urg.' },
  { value: 'alta', label: 'Alta' },
  { value: 'normale', label: 'Norm.' },
  { value: 'sospeso', label: 'Sosp.' },
]

export function BoardView() {
  const { records, loading, error } = useRecords()
  const { workspaces } = useWorkspaces()

  const [filterWs, setFilterWs] = useState<string | null>(null)
  const [filterPriority, setFilterPriority] = useState<PriorityFilter>('all')
  const [filterProject, setFilterProject] = useState<string>('')
  const [sort, setSort] = useState<SortOption>('priorita')
  const [showNewTask, setShowNewTask] = useState(false)

  const projects = useMemo(() => {
    const seen = new Map<string, string>()
    for (const r of records) {
      if (r.rec_prj_id && r.prj_label && !seen.has(r.rec_prj_id)) {
        seen.set(r.rec_prj_id, r.prj_label)
      }
    }
    return Array.from(seen.entries()).sort((a, b) => a[1].localeCompare(b[1]))
  }, [records])

  const filtered = useMemo(() => {
    let r = records
    if (filterWs) r = r.filter(x => x.rec_ws_code === filterWs)
    if (filterPriority !== 'all') {
      if (filterPriority === 'urgente') r = r.filter(x => x.rec_priority === 1 && (x.rec_status === 'aperto' || x.rec_status === 'in_progress'))
      else if (filterPriority === 'alta') r = r.filter(x => x.rec_priority === 1)
      else if (filterPriority === 'normale') r = r.filter(x => x.rec_priority === 2)
      else if (filterPriority === 'sospeso') r = r.filter(x => x.rec_status === 'sospeso')
    }
    if (filterProject) r = r.filter(x => x.rec_prj_id === filterProject)
    return r
  }, [records, filterWs, filterPriority, filterProject])

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      if (sort === 'priorita') {
        if (a.rec_priority !== b.rec_priority) return a.rec_priority - b.rec_priority
        if (!a.rec_due_date && !b.rec_due_date) return 0
        if (!a.rec_due_date) return 1
        if (!b.rec_due_date) return -1
        return new Date(a.rec_due_date).getTime() - new Date(b.rec_due_date).getTime()
      }
      if (sort === 'scadenza') {
        if (!a.rec_due_date && !b.rec_due_date) return 0
        if (!a.rec_due_date) return 1
        if (!b.rec_due_date) return -1
        return new Date(a.rec_due_date).getTime() - new Date(b.rec_due_date).getTime()
      }
      return new Date(b.rec_created_at).getTime() - new Date(a.rec_created_at).getTime()
    })
  }, [filtered, sort])

  const groups = useMemo(() => {
    return workspaces
      .map(ws => ({
        ws,
        records: sorted.filter(r => r.rec_ws_code === ws.ws_code),
      }))
      .filter(g => g.records.length > 0)
  }, [sorted, workspaces])

  if (error) return <ErrorState message={error} />

  return (
    <div className="flex flex-col gap-4">
      {/* Filter row 1: CAT + PRIORITÀ */}
      <div className="flex flex-wrap items-start gap-x-6 gap-y-3">
        {/* CAT pills */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-gray-500 font-medium uppercase tracking-wide w-14 shrink-0">CAT</span>
          <button
            onClick={() => setFilterWs(null)}
            className={`text-xs px-3 py-1 rounded-full border transition-all ${
              !filterWs
                ? 'bg-gray-800 text-white border-gray-800'
                : 'border-gray-200 bg-white text-gray-500 hover:border-gray-400'
            }`}
          >
            Tutte
          </button>
          {workspaces.map(ws => {
            const active = filterWs === ws.ws_code
            return (
              <button
                key={ws.ws_id}
                onClick={() => setFilterWs(active ? null : ws.ws_code)}
                className="text-xs px-3 py-1 rounded-full border transition-all"
                style={active
                  ? { backgroundColor: ws.ws_color, color: 'white', borderColor: ws.ws_color }
                  : { backgroundColor: 'white', color: '#6B7280', borderColor: '#E5E7EB' }
                }
              >
                {ws.ws_code}
              </button>
            )
          })}
        </div>

        {/* PRIORITÀ pills */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-gray-500 font-medium uppercase tracking-wide w-14 shrink-0">PRIORITÀ</span>
          {PRIORITY_PILLS.map(p => (
            <button
              key={p.value}
              onClick={() => setFilterPriority(p.value)}
              className={`text-xs px-3 py-1 rounded-full border transition-all ${
                filterPriority === p.value
                  ? 'bg-blue-700 text-white border-blue-700'
                  : 'border-gray-200 bg-white text-gray-500 hover:border-gray-400'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Filter row 2: project + sort + count + button */}
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={filterProject}
          onChange={e => setFilterProject(e.target.value)}
          className="border border-gray-200 rounded px-2 py-1.5 text-sm text-gray-700 bg-white"
        >
          <option value="">Tutti i progetti</option>
          {projects.map(([id, label]) => (
            <option key={id} value={id}>{label}</option>
          ))}
        </select>

        <select
          value={sort}
          onChange={e => setSort(e.target.value as SortOption)}
          className="border border-gray-200 rounded px-2 py-1.5 text-sm text-gray-700 bg-white"
        >
          <option value="priorita">Priorità</option>
          <option value="scadenza">Scadenza</option>
          <option value="recenti">Recenti</option>
        </select>

        <span className="text-sm text-gray-500">
          {loading ? '…' : `${filtered.length} task`}
        </span>

        <button
          onClick={() => setShowNewTask(true)}
          className="ml-auto bg-blue-700 text-white text-sm px-4 py-1.5 rounded font-medium hover:bg-blue-800 transition-colors"
        >
          + Nuovo Task
        </button>
      </div>

      {/* Board */}
      {loading ? (
        <LoadingGrid />
      ) : sorted.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="flex flex-col gap-8">
          {groups.map(({ ws, records: groupRecs }) => (
            <section key={ws.ws_id}>
              {/* Section header */}
              <div className="flex items-center gap-3 pb-2 mb-3 border-b border-gray-200">
                <span
                  className="font-mono text-xs px-2 py-0.5 rounded font-medium text-white"
                  style={{ backgroundColor: ws.ws_color }}
                >
                  [{ws.ws_code}]
                </span>
                <span className="font-semibold text-gray-800 text-sm">{ws.ws_label}</span>
                <span className="ml-auto text-gray-400 text-sm">{groupRecs.length}</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {groupRecs.map(r => (
                  <RecordTile key={r.rec_id} record={r} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {showNewTask && <NewTaskModal onClose={() => setShowNewTask(false)} />}
    </div>
  )
}

function LoadingGrid() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="bg-gray-100 rounded-lg border border-gray-200 p-4 h-36 animate-pulse" />
      ))}
    </div>
  )
}

function EmptyState() {
  return (
    <div className="text-center py-16 text-gray-400">
      <div className="text-4xl mb-3">✅</div>
      <p className="text-sm">Nessun record trovato</p>
    </div>
  )
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="text-center py-12 text-red-500">
      <div className="text-3xl mb-2">⚠️</div>
      <p className="text-sm">{message}</p>
    </div>
  )
}

