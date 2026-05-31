import { useMemo, useState } from 'react'
import { useClosedRecords } from '../hooks/useClosedRecords'
import { useWorkspaces } from '../hooks/useWorkspaces'
import { RecordDetailModal } from './RecordDetailModal'
import { kindLabel } from '../utils/format'
import type { TbRecord } from '../types'

type KindFilter = 'all' | 'T' | 'M' | 'EV'
type SortOption = 'data_chiusura' | 'progetto' | 'tipo'

function formatDate(iso: string | null): string {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function formatOre(h: number): string {
  return `${h % 1 === 0 ? h.toFixed(0) : h.toFixed(1)}h`
}

function kindBadgeClass(kind: string): string {
  if (kind === 'T') return 'bg-blue-600 text-white text-xs px-1.5 py-0.5 rounded font-medium'
  if (kind === 'M') return 'bg-gray-500 text-white text-xs px-1.5 py-0.5 rounded font-medium'
  return 'bg-orange-500 text-white text-xs px-1.5 py-0.5 rounded font-medium'
}

export function CompletatiView() {
  const { records, loading, error } = useClosedRecords()
  const { workspaces } = useWorkspaces()

  const [filterWs, setFilterWs]         = useState<string | null>(null)
  const [filterKind, setFilterKind]     = useState<KindFilter>('all')
  const [filterProject, setFilterProject] = useState<string>('')
  const [sort, setSort]                 = useState<SortOption>('data_chiusura')
  const [filterText, setFilterText]     = useState('')

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
    if (filterWs)      r = r.filter(x => x.rec_ws_code === filterWs)
    if (filterKind !== 'all') r = r.filter(x => x.rec_kind === filterKind)
    if (filterProject) r = r.filter(x => x.rec_prj_id === filterProject)
    if (filterText.trim()) {
      const q = filterText.trim().toLowerCase()
      r = r.filter(x =>
        x.rec_title.toLowerCase().includes(q) ||
        (x.rec_body ?? '').toLowerCase().includes(q) ||
        (x.rec_code ?? '').toLowerCase().includes(q)
      )
    }
    return [...r].sort((a, b) => {
      if (sort === 'progetto') return (a.rec_prj_code ?? '').localeCompare(b.rec_prj_code ?? '')
      if (sort === 'tipo')     return a.rec_kind.localeCompare(b.rec_kind)
      const da = a.rec_done_at ?? a.rec_updated_at
      const db_ = b.rec_done_at ?? b.rec_updated_at
      return new Date(db_).getTime() - new Date(da).getTime()
    })
  }, [records, filterWs, filterKind, filterProject, filterText, sort])

  if (loading) return <LoadingGrid />
  if (error)   return <ErrorState message={error} />

  return (
    <div className="flex flex-col gap-4">
      {/* ── Filter row 1: CAT + TIPO ── */}
      <div className="flex flex-wrap items-start gap-x-6 gap-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-gray-500 font-medium uppercase tracking-wide w-14 shrink-0">CAT</span>
          <button
            onClick={() => setFilterWs(null)}
            className={`text-xs px-3 py-1 rounded-full border transition-all ${
              !filterWs ? 'bg-gray-800 text-white border-gray-800' : 'border-gray-200 bg-white text-gray-500 hover:border-gray-400'
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

        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-gray-500 font-medium uppercase tracking-wide w-14 shrink-0">TIPO</span>
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
      </div>

      {/* ── Filter row 2 ── */}
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
        <input
          type="text"
          value={filterText}
          onChange={e => setFilterText(e.target.value)}
          placeholder="Cerca testo…"
          className="border border-gray-200 rounded px-2 py-1.5 text-sm text-gray-700 bg-white w-44"
        />
        <select
          value={sort}
          onChange={e => setSort(e.target.value as SortOption)}
          className="border border-gray-200 rounded px-2 py-1.5 text-sm text-gray-700 bg-white"
        >
          <option value="data_chiusura">↓ Data chiusura</option>
          <option value="progetto">Progetto A→Z</option>
          <option value="tipo">Tipo</option>
        </select>
        <span className="text-sm text-gray-500">{filtered.length} record</span>
      </div>

      {/* ── Grid ── */}
      {filtered.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {filtered.map(r => (
            <ClosedCard key={r.rec_id} record={r} />
          ))}
        </div>
      )}
    </div>
  )
}

function ClosedCard({ record: r }: { record: TbRecord }) {
  const [showDetail, setShowDetail] = useState(false)
  const wsColor = r.ws_color ?? '#718096'

  return (
    <>
      <div
        onClick={() => setShowDetail(true)}
        className="border border-gray-200 rounded-lg p-4 flex flex-col gap-2 shadow-sm cursor-pointer hover:shadow-md hover:border-gray-300 transition-all"
        style={{ backgroundColor: '#FAFAFA', borderLeftColor: wsColor, borderLeftWidth: 3 }}
      >
        {/* Codice + tipo */}
        <div className="flex items-center gap-2">
          {r.rec_code && (
            <span className="font-mono text-xs flex-1" style={{ color: '#9E9E9E' }}>{r.rec_code}</span>
          )}
          <span className={kindBadgeClass(r.rec_kind)}>{kindLabel(r.rec_kind)}</span>
        </div>

        {/* Titolo */}
        <div className="flex items-start gap-2 flex-wrap">
          <span className="font-semibold text-sm leading-snug flex-1 min-w-0" style={{ color: '#212121' }}>
            {r.rec_title}
          </span>
        </div>

        {/* Progetto */}
        {r.prj_label && (
          <p className="text-xs truncate" style={{ color: '#616161' }}>
            {r.ws_icon && <span className="mr-1">{r.ws_icon}</span>}
            {r.prj_label}
          </p>
        )}

        {/* Body preview */}
        {r.rec_body && (
          <p className="text-xs line-clamp-2 leading-relaxed" style={{ color: '#757575' }}>{r.rec_body}</p>
        )}

        {/* Footer */}
        <div className="flex flex-wrap items-center gap-2 mt-auto pt-2">
          <span className="bg-green-50 text-green-700 border border-green-200 text-xs px-2 py-0.5 rounded-full">
            ✓ chiuso
          </span>
          {r.rec_done_at && (
            <span className="text-xs" style={{ color: '#9E9E9E' }}>
              {formatDate(r.rec_done_at)}
            </span>
          )}
          {r.rec_hours != null && (
            <span className="bg-blue-50 text-blue-700 border border-blue-200 text-xs px-2 py-0.5 rounded-full">
              {formatOre(r.rec_hours)} lavorate
            </span>
          )}
        </div>
      </div>

      {showDetail && (
        <RecordDetailModal record={r} onClose={() => setShowDetail(false)} />
      )}
    </>
  )
}

function LoadingGrid() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="rounded-lg border border-gray-200 p-4 h-32 animate-pulse" style={{ backgroundColor: '#F0F0F0' }} />
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
