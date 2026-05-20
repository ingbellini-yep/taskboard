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
        <SummaryCard value={formatOre(summary.ore_totali)} label="Totale ore" icon="⏱️" />
        <SummaryCard value={String(summary.task_chiusi)} label="Task chiusi" icon="✓" />
        <SummaryCard value={String(summary.progetti_count)} label="Progetti" icon="📁" />
      </div>

      {workspaces.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="flex flex-col gap-6">
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
      {/* Workspace header */}
      <div
        className="flex items-center justify-between px-4 py-3 rounded-xl mb-3"
        style={{ backgroundColor: ws.ws_color }}
      >
        <span className="text-white font-bold text-sm flex items-center gap-2">
          {ws.ws_icon && <span>{ws.ws_icon}</span>}
          [{ws.ws_code}] {ws.ws_label}
        </span>
        <span className="text-white font-bold text-sm">{formatOre(ws.ore_totali)} totali</span>
      </div>

      {/* Progetti */}
      <div className="flex flex-col gap-2 pl-1">
        {ws.progetti.map(prj => (
          <ProgettoRow key={prj.prj_id} prj={prj} />
        ))}
      </div>
    </section>
  )
}

function ProgettoRow({ prj }: { prj: OreProgetto }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
      {/* Row header — clickable to expand */}
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors text-left"
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className="font-mono text-xs text-gray-400 shrink-0">{prj.prj_code}</span>
          <span className="text-sm font-medium text-gray-900 truncate">{prj.prj_label}</span>
          <span className="text-xs text-gray-400 shrink-0">{prj.task_count} task</span>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className="text-sm font-bold text-gray-800">{formatOre(prj.ore_totali)}</span>
          <span className="text-gray-400 text-xs">{expanded ? '▲' : '▼'}</span>
        </div>
      </button>

      {/* Task detail — expandable */}
      {expanded && (
        <div className="border-t border-gray-100 bg-gray-50">
          {prj.tasks.map(t => (
            <div
              key={t.rec_id}
              className="flex items-center justify-between px-5 py-2.5 border-b border-gray-100 last:border-0"
            >
              <div className="flex items-center gap-3 min-w-0">
                {t.rec_code && (
                  <span className="font-mono text-xs text-gray-400 shrink-0">{t.rec_code}</span>
                )}
                <span className="text-sm text-gray-700 truncate">{t.rec_title}</span>
              </div>
              <div className="flex items-center gap-3 shrink-0 ml-3">
                <span className="text-sm font-medium text-gray-800">{formatOre(t.rec_hours)}</span>
                {t.rec_done_at && (
                  <span className="text-xs text-gray-400">
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

function SummaryCard({ value, label, icon }: { value: string; label: string; icon: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm px-5 py-4 flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <span className="text-gray-400 text-sm">{icon}</span>
        <span className="text-2xl font-bold text-gray-900">{value}</span>
      </div>
      <span className="text-xs text-gray-500">{label}</span>
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
          <div key={i} className="bg-gray-100 rounded-xl border border-gray-200 h-20 animate-pulse" />
        ))}
      </div>
      <div className="bg-gray-100 rounded-xl h-12 animate-pulse" />
      <div className="bg-gray-100 rounded-xl h-24 animate-pulse" />
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
