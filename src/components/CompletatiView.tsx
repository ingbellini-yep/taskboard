import { useClosedRecords } from '../hooks/useClosedRecords'
import { kindLabel } from '../utils/format'

function kindBadgeClass(kind: string): string {
  if (kind === 'T') return 'bg-blue-600 text-white text-xs px-1.5 py-0.5 rounded font-medium'
  if (kind === 'M') return 'bg-gray-500 text-white text-xs px-1.5 py-0.5 rounded font-medium'
  return 'bg-orange-500 text-white text-xs px-1.5 py-0.5 rounded font-medium'
}

function formatDate(iso: string | null): string {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function formatOre(h: number): string {
  return `${h % 1 === 0 ? h.toFixed(0) : h.toFixed(1)}h`
}

export function CompletatiView() {
  const { records, loading, error } = useClosedRecords()

  if (loading) return <LoadingGrid />
  if (error) return <ErrorState message={error} />
  if (records.length === 0) return <EmptyState />

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
      {records.map(r => {
        const wsColor = r.ws_color ?? '#718096'
        return (
          <div
            key={r.rec_id}
            className="border border-gray-200 rounded-lg p-4 flex flex-col gap-2 shadow-sm"
            style={{ backgroundColor: '#FAFAFA', borderLeftColor: wsColor, borderLeftWidth: 3 }}
          >
            {/* Codice */}
            {r.rec_code && (
              <span className="font-mono text-xs" style={{ color: '#9E9E9E' }}>{r.rec_code}</span>
            )}

            {/* Titolo + badge tipo */}
            <div className="flex items-start gap-2 flex-wrap">
              <span className="font-semibold text-sm leading-snug flex-1 min-w-0" style={{ color: '#212121' }}>
                {r.rec_title}
              </span>
              <span className={`shrink-0 ${kindBadgeClass(r.rec_kind)}`}>{kindLabel(r.rec_kind)}</span>
            </div>

            {/* Progetto */}
            {r.prj_label && (
              <p className="text-xs truncate" style={{ color: '#616161' }}>
                {r.ws_icon && <span className="mr-1">{r.ws_icon}</span>}
                {r.prj_label}
              </p>
            )}

            {/* Footer: stato + data + ore */}
            <div className="flex flex-wrap items-center gap-2 mt-auto pt-2">
              <span className="bg-green-50 text-green-700 border border-green-200 text-xs px-2 py-0.5 rounded-full">
                ✓ chiuso
              </span>
              {r.rec_done_at && (
                <span className="text-xs" style={{ color: '#9E9E9E' }}>
                  Chiuso il {formatDate(r.rec_done_at)}
                </span>
              )}
              {r.rec_hours != null && (
                <span className="bg-blue-50 text-blue-700 border border-blue-200 text-xs px-2 py-0.5 rounded-full">
                  {formatOre(r.rec_hours)} lavorate
                </span>
              )}
            </div>
          </div>
        )
      })}
    </div>
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
      <p className="text-sm">Nessun record completato</p>
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
