import { useMemo, useState } from 'react'
import { useRecords } from '../hooks/useRecords'
import { useWorkspaces } from '../hooks/useWorkspaces'
import { RecordTile } from './RecordTile'
import { WorkspaceHeader } from './WorkspaceHeader'
import type { GroupBy, RecordKind, RecordStatus, TbRecord } from '../types'
import { isOverdue } from '../utils/format'

const GROUP_OPTIONS: { value: GroupBy; label: string }[] = [
  { value: 'workspace', label: 'Categoria' },
  { value: 'priority', label: 'Urgenza' },
  { value: 'due_date', label: 'Scadenza' },
  { value: 'project', label: 'Progetto' },
]

const KIND_OPTIONS: { value: RecordKind | 'ALL'; label: string }[] = [
  { value: 'ALL', label: 'Tutti' },
  { value: 'T', label: 'Task' },
  { value: 'M', label: 'Memo' },
  { value: 'EV', label: 'Event' },
]

const STATUS_OPTIONS: { value: RecordStatus | 'ALL'; label: string }[] = [
  { value: 'ALL', label: 'Tutti' },
  { value: 'aperto', label: 'Aperto' },
  { value: 'in_progress', label: 'In corso' },
  { value: 'sospeso', label: 'Sospeso' },
]

export function BoardView() {
  const { records, loading, error } = useRecords()
  const { workspaces } = useWorkspaces()

  const [groupBy, setGroupBy] = useState<GroupBy>('workspace')
  const [filterWs, setFilterWs] = useState<string | null>(null)
  const [filterKind, setFilterKind] = useState<RecordKind | 'ALL'>('ALL')
  const [filterStatus, setFilterStatus] = useState<RecordStatus | 'ALL'>('ALL')
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    let r = records
    if (filterWs) r = r.filter(x => x.rec_ws_code === filterWs)
    if (filterKind !== 'ALL') r = r.filter(x => x.rec_kind === filterKind)
    if (filterStatus !== 'ALL') r = r.filter(x => x.rec_status === filterStatus)
    if (search.trim()) {
      const q = search.toLowerCase()
      r = r.filter(x =>
        x.rec_title.toLowerCase().includes(q) ||
        (x.rec_body ?? '').toLowerCase().includes(q) ||
        (x.rec_code ?? '').toLowerCase().includes(q) ||
        (x.prj_label ?? '').toLowerCase().includes(q)
      )
    }
    return r
  }, [records, filterWs, filterKind, filterStatus, search])

  const groups = useMemo(() => buildGroups(filtered, groupBy, workspaces), [filtered, groupBy, workspaces])

  if (error) return <ErrorState message={error} />

  return (
    <div className="flex flex-col gap-4">
      {/* Search bar */}
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
        <input
          type="search"
          placeholder="Cerca per titolo, note, codice, progetto…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full bg-white text-gray-900 placeholder-gray-400 rounded-xl border border-gray-200 pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 transition-colors"
          style={{ borderColor: '#E2E8F0' }}
        />
      </div>

      {/* Workspace pills */}
      <div className="flex flex-wrap gap-2">
        {workspaces.map(ws => (
          <WorkspaceHeader
            key={ws.ws_id}
            workspace={ws}
            records={records}
            filterWs={filterWs}
            onFilterClick={setFilterWs}
          />
        ))}
      </div>

      {/* Filter + group bar */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Kind filter */}
        <div className="flex rounded-lg overflow-hidden border border-gray-200 text-xs bg-white">
          {KIND_OPTIONS.map(o => (
            <button
              key={o.value}
              onClick={() => setFilterKind(o.value)}
              className={`px-3 py-1.5 font-medium transition-colors ${
                filterKind === o.value
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>

        {/* Status filter */}
        <div className="flex rounded-lg overflow-hidden border border-gray-200 text-xs bg-white">
          {STATUS_OPTIONS.map(o => (
            <button
              key={o.value}
              onClick={() => setFilterStatus(o.value)}
              className={`px-3 py-1.5 font-medium transition-colors ${
                filterStatus === o.value
                  ? 'bg-purple-600 text-white'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>

        {/* Group by */}
        <div className="ml-auto flex items-center gap-2 text-xs text-gray-500">
          <span>Raggruppa:</span>
          <div className="flex rounded-lg overflow-hidden border border-gray-200 bg-gray-50">
            {GROUP_OPTIONS.map(o => (
              <button
                key={o.value}
                onClick={() => setGroupBy(o.value)}
                className={`px-3 py-1.5 font-medium transition-all ${
                  groupBy === o.value
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Results count */}
      <p className="text-xs text-gray-500">
        {loading ? 'Caricamento…' : `${filtered.length} record`}
        {filtered.length !== records.length && ` di ${records.length}`}
      </p>

      {/* Groups */}
      {loading ? (
        <LoadingGrid />
      ) : filtered.length === 0 ? (
        <EmptyState hasSearch={search.length > 0} />
      ) : (
        <div className="flex flex-col gap-8">
          {groups.map(group => (
            <section key={group.key}>
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 pb-2 border-b border-gray-200 flex items-center gap-2">
                {group.icon && <span>{group.icon}</span>}
                {group.label}
                <span className="bg-gray-200 text-gray-600 rounded-full px-2 py-0.5 normal-case tracking-normal font-medium">
                  {group.records.length}
                </span>
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {group.records.map(r => (
                  <RecordTile key={r.rec_id} record={r} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Group builder ────────────────────────────────────────────────────────────

interface Group {
  key: string
  label: string
  icon?: string
  records: TbRecord[]
}

function buildGroups(records: TbRecord[], groupBy: GroupBy, workspaces: ReturnType<typeof useWorkspaces>['workspaces']): Group[] {
  if (groupBy === 'workspace') {
    return workspaces
      .map(ws => ({
        key: ws.ws_code,
        label: ws.ws_label,
        icon: ws.ws_icon,
        records: records.filter(r => r.rec_ws_code === ws.ws_code),
      }))
      .filter(g => g.records.length > 0)
  }

  if (groupBy === 'priority') {
    return [
      { key: '1', label: 'Priorità alta', icon: '🔴', records: records.filter(r => r.rec_priority === 1) },
      { key: '2', label: 'Priorità normale', icon: '🟡', records: records.filter(r => r.rec_priority === 2) },
      { key: '3', label: 'Priorità bassa', icon: '🟢', records: records.filter(r => r.rec_priority === 3) },
    ].filter(g => g.records.length > 0)
  }

  if (groupBy === 'due_date') {
    const overdue = records.filter(r => r.rec_due_date && isOverdue(r.rec_due_date))
    const today = records.filter(r => {
      if (!r.rec_due_date) return false
      const d = new Date(r.rec_due_date)
      const t = new Date(); t.setHours(0, 0, 0, 0)
      const diff = Math.ceil((d.getTime() - t.getTime()) / 86400000)
      return !isOverdue(r.rec_due_date) && diff <= 1
    })
    const week = records.filter(r => {
      if (!r.rec_due_date) return false
      const d = new Date(r.rec_due_date)
      const t = new Date(); t.setHours(0, 0, 0, 0)
      const diff = Math.ceil((d.getTime() - t.getTime()) / 86400000)
      return diff > 1 && diff <= 7
    })
    const later = records.filter(r => {
      if (!r.rec_due_date) return false
      const d = new Date(r.rec_due_date)
      const t = new Date(); t.setHours(0, 0, 0, 0)
      return !isOverdue(r.rec_due_date) && Math.ceil((d.getTime() - t.getTime()) / 86400000) > 7
    })
    const noDate = records.filter(r => !r.rec_due_date)
    return [
      { key: 'overdue', label: 'Scaduti', icon: '🔴', records: overdue },
      { key: 'today', label: 'Oggi / Domani', icon: '⏰', records: today },
      { key: 'week', label: 'Questa settimana', icon: '📅', records: week },
      { key: 'later', label: 'Più avanti', icon: '🗓️', records: later },
      { key: 'no_date', label: 'Senza scadenza', icon: '⬜', records: noDate },
    ].filter(g => g.records.length > 0)
  }

  // project
  const projectMap = new Map<string, Group>()
  for (const r of records) {
    const key = r.rec_prj_code ?? '__no_project__'
    if (!projectMap.has(key)) {
      projectMap.set(key, {
        key,
        label: r.prj_label ?? 'Senza progetto',
        icon: r.ws_icon ?? undefined,
        records: [],
      })
    }
    projectMap.get(key)!.records.push(r)
  }
  return Array.from(projectMap.values())
}

function LoadingGrid() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="bg-gray-100 rounded-xl border border-gray-200 p-4 h-36 animate-pulse" />
      ))}
    </div>
  )
}

function EmptyState({ hasSearch }: { hasSearch: boolean }) {
  return (
    <div className="text-center py-16 text-gray-400">
      <div className="text-4xl mb-3">{hasSearch ? '🔍' : '✅'}</div>
      <p className="text-sm">
        {hasSearch ? 'Nessun record trovato' : 'Nessun record aperto'}
      </p>
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
