import { useState } from 'react'
import { useOreReport } from '../hooks/useOreReport'
import type { OreProgetto, OreWorkspace } from '../hooks/useOreReport'

export function OreView() {
  const { workspaces, summary, loading, error } = useOreReport()

  if (loading) return <LoadingState />
  if (error) return <ErrorState message={error} />

  return (
    <div className="flex flex-col gap-6">
      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        <SummaryCard value={formatOre(summary.ore_totali)} label="Totale ore" />
        <SummaryCard value={String(summary.task_chiusi)} label="Task chiusi" />
        <SummaryCard value={String(summary.progetti_count)} label="Progetti" />
      </div>

      {workspaces.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="flex flex-col gap-4">
          {workspaces.map(ws => (
            <WorkspaceSection key={ws.ws_code} ws={ws} />
          ))}

          {/* Totale generale */}
          <div className="flex items-center justify-between pt-4 border-t-2 border-gray-300">
            <span className="text-sm font-bold text-gray-700 uppercase tracking-wide">Totale generale</span>
            <span className="text-lg font-bold text-gray-900">{formatOre(summary.ore_totali)}</span>
          </div>
        </div>
      )}
    </div>
  )
}

function WorkspaceSection({ ws }: { ws: OreWorkspace }) {
  return (
    <section>
      {/* Workspace header: bg #F5F5F5, bordo-sx 4px ws_color */}
      <div
        className="flex items-center justify-between px-4 py-3 rounded-r-lg mb-0"
        style={{
          backgroundColor: '#F5F5F5',
          borderLeft: `4px solid ${ws.ws_color}`,
        }}
      >
        <div className="flex items-center gap-2">
          <span
            className="font-mono text-xs px-2 py-0.5 rounded font-bold text-white"
            style={{ backgroundColor: ws.ws_color }}
          >
            [{ws.ws_code}]
          </span>
          {ws.ws_icon && <span>{ws.ws_icon}</span>}
          <span className="font-bold text-gray-800 text-sm">{ws.ws_label}</span>
        </div>
        <span className="font-bold text-gray-700 text-sm">{formatOre(ws.ore_totali)}</span>
      </div>

      {/* Separatore */}
      <div className="border-b border-gray-200 mb-1" />

      {/* Progetti */}
      <div className="flex flex-col">
        {ws.progetti.map(prj => (
          <ProgettoRow key={prj.prj_id} prj={prj} wsColor={ws.ws_color} />
        ))}
      </div>
    </section>
  )
}

function ProgettoRow({ prj, wsColor }: { prj: OreProgetto; wsColor: string }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div>
      {/* Riga progetto */}
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center justify-between px-4 py-2.5 text-left transition-colors"
        style={{ cursor: 'pointer' }}
        onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#F9FAFB')}
        onMouseLeave={e => (e.currentTarget.style.backgroundColor = '')}
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className="font-mono text-xs text-gray-400 shrink-0 w-20">{prj.prj_code}</span>
          <span className="text-sm font-medium text-gray-800 truncate">{prj.prj_label}</span>
          <span className="text-xs text-gray-400 shrink-0">{prj.task_count} task</span>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className="text-sm font-bold text-gray-800">{formatOre(prj.ore_totali)}</span>
          <span
            className="text-xs w-5 h-5 flex items-center justify-center rounded border border-gray-200"
            style={{ color: wsColor }}
          >
            {expanded ? '▲' : '▼'}
          </span>
        </div>
      </button>

      {/* Task espansi */}
      {expanded && (
        <div style={{ backgroundColor: '#FAFAFA' }}>
          {prj.tasks.map(t => (
            <div
              key={t.rec_id}
              className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0"
              style={{ paddingLeft: 32, paddingRight: 16 }}
            >
              <div className="flex items-center gap-3 min-w-0">
                {t.rec_code && (
                  <span className="font-mono text-xs text-gray-400 shrink-0">{t.rec_code}</span>
                )}
                <span className="text-xs text-gray-600 truncate">{t.rec_title}</span>
              </div>
              <div className="flex items-center gap-3 shrink-0 ml-3">
                <span className="text-xs font-medium text-gray-700">{formatOre(t.rec_hours)}</span>
                {t.rec_done_at && (
                  <span className="text-xs text-gray-400 w-10 text-right">
                    {new Date(t.rec_done_at).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' })}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function SummaryCard({ value, label }: { value: string; label: string }) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm flex flex-col gap-1">
      <span className="text-2xl font-bold text-gray-900">{value}</span>
      <span className="text-xs text-gray-500 uppercase tracking-wide">{label}</span>
    </div>
  )
}

function formatOre(h: number): string {
  return `${h % 1 === 0 ? h.toFixed(0) : h.toFixed(1)}h`
}

function LoadingState() {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-3 gap-4">
        {[0, 1, 2].map(i => (
          <div key={i} className="bg-gray-100 rounded-lg border border-gray-200 h-20 animate-pulse" />
        ))}
      </div>
      <div className="bg-gray-100 rounded-lg h-12 animate-pulse" />
      <div className="bg-gray-100 rounded-lg h-24 animate-pulse" />
    </div>
  )
}

function EmptyState() {
  return (
    <div className="text-center py-16 text-gray-400">
      <div className="text-4xl mb-3">⏱️</div>
      <p className="text-sm">Nessun task chiuso con ore registrate</p>
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
