import { useMemo } from 'react'
import { useArchivedRecords } from '../hooks/useArchivedRecords'
import { restoreRecord } from '../hooks/useRecords'
import type { TbRecord } from '../types'

interface Group {
  key: string
  wsCode: string | null
  wsLabel: string | null
  wsColor: string | null
  wsIcon: string | null
  prjCode: string | null
  prjLabel: string | null
  records: TbRecord[]
}

function formatDate(iso: string | null): string {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export function ArchiviatiView() {
  const { records, loading, error } = useArchivedRecords()

  const groups = useMemo<Group[]>(() => {
    const map = new Map<string, Group>()

    for (const r of records) {
      const key = r.rec_prj_id ?? '__nessun_progetto__'
      if (!map.has(key)) {
        map.set(key, {
          key,
          wsCode: r.rec_ws_code,
          wsLabel: r.ws_label,
          wsColor: r.ws_color,
          wsIcon: r.ws_icon,
          prjCode: r.rec_prj_code,
          prjLabel: r.prj_label,
          records: [],
        })
      }
      map.get(key)!.records.push(r)
    }

    // Order: groups with project first (sorted by prj_code), then "Senza progetto"
    return Array.from(map.values()).sort((a, b) => {
      if (!a.prjCode && b.prjCode) return 1
      if (a.prjCode && !b.prjCode) return -1
      return (a.prjCode ?? '').localeCompare(b.prjCode ?? '')
    })
  }, [records])

  if (loading) return <LoadingGrid />
  if (error) return <ErrorState message={error} />
  if (records.length === 0) return <EmptyState />

  return (
    <div className="flex flex-col gap-8">
      {groups.map(group => (
        <section key={group.key}>
          {/* Intestazione gruppo */}
          <div
            className="flex items-center gap-3 pb-2 mb-3 border-b border-gray-200"
          >
            {group.wsCode && group.wsColor ? (
              <span
                className="font-mono text-xs px-2 py-0.5 rounded font-medium text-white"
                style={{ backgroundColor: group.wsColor }}
              >
                [{group.wsCode}]
              </span>
            ) : null}
            <span className="font-semibold text-gray-800 text-sm">
              {group.prjCode && <span className="text-gray-400 font-normal mr-1">{group.prjCode} —</span>}
              {group.prjLabel ?? 'Senza progetto'}
            </span>
            <span className="ml-auto text-gray-400 text-sm">{group.records.length}</span>
          </div>

          {/* Card griglia */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {group.records.map(r => (
              <ArchivedCard key={r.rec_id} record={r} />
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}

function ArchivedCard({ record: r }: { record: TbRecord }) {
  const wsColor = r.ws_color ?? '#718096'

  async function handleRestore() {
    await restoreRecord(r.rec_id)
  }

  return (
    <div
      className="border border-gray-200 rounded-lg p-4 flex flex-col gap-2 shadow-sm"
      style={{ backgroundColor: '#FAFAFA', borderLeftColor: wsColor, borderLeftWidth: 3 }}
    >
      {/* Codice */}
      {r.rec_code && (
        <span className="font-mono text-xs" style={{ color: '#9E9E9E' }}>{r.rec_code}</span>
      )}

      {/* Titolo */}
      <p className="font-semibold text-sm leading-snug" style={{ color: '#212121' }}>
        {r.rec_title}
      </p>

      {/* Body preview */}
      {r.rec_body && (
        <p className="text-xs line-clamp-2 leading-relaxed" style={{ color: '#616161' }}>{r.rec_body}</p>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between mt-auto pt-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="bg-gray-100 text-gray-500 border border-gray-200 text-xs px-2 py-0.5 rounded-full">
            📁 archiviato
          </span>
          {r.rec_updated_at && (
            <span className="text-xs" style={{ color: '#9E9E9E' }}>
              {formatDate(r.rec_updated_at)}
            </span>
          )}
        </div>
        <button
          onClick={handleRestore}
          className="ml-2 shrink-0 px-2 py-1 text-xs border border-gray-200 bg-white rounded hover:bg-blue-50 hover:border-blue-300 hover:text-blue-600 text-gray-400 transition-colors"
          title="Ripristina memo"
        >
          Ripristina
        </button>
      </div>
    </div>
  )
}

function LoadingGrid() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="rounded-lg border border-gray-200 p-4 h-28 animate-pulse" style={{ backgroundColor: '#F0F0F0' }} />
      ))}
    </div>
  )
}

function EmptyState() {
  return (
    <div className="text-center py-16 text-gray-400">
      <div className="text-4xl mb-3">📁</div>
      <p className="text-sm">Nessun memo archiviato</p>
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
