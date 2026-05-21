import { useState } from 'react'
import { useOreReport } from '../hooks/useOreReport'
import type { OreProgetto, OreTask, OreWorkspace } from '../hooks/useOreReport'

type ViewMode = 'progetto' | 'task'

export function OreView() {
  const { workspaces, summary, loading, error } = useOreReport()
  const [mode, setMode] = useState<ViewMode>('progetto')

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

      {/* Toggle vista */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-500 uppercase tracking-wide font-medium mr-1">Raggruppa per</span>
        <button
          onClick={() => setMode('progetto')}
          className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
            mode === 'progetto'
              ? 'bg-blue-700 text-white border-blue-700'
              : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300 hover:text-gray-700'
          }`}
        >
          Progetto
        </button>
        <button
          onClick={() => setMode('task')}
          className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
            mode === 'task'
              ? 'bg-blue-700 text-white border-blue-700'
              : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300 hover:text-gray-700'
          }`}
        >
          Task
        </button>
      </div>

      {workspaces.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="flex flex-col gap-4">
          {mode === 'progetto' ? (
            workspaces.map(ws => (
              <WorkspaceSection key={ws.ws_code} ws={ws} />
            ))
          ) : (
            workspaces.map(ws => (
              <WorkspaceSectionTask key={ws.ws_code} ws={ws} />
            ))
          )}

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

/* ─────────────── Vista per PROGETTO ─────────────── */

function WorkspaceSection({ ws }: { ws: OreWorkspace }) {
  return (
    <section>
      <WsHeader ws={ws} />
      <div className="border-b border-gray-200 mb-1" />
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
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center justify-between px-4 py-2.5 text-left transition-colors"
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

      {expanded && (
        <div style={{ backgroundColor: '#FAFAFA' }}>
          {prj.tasks.map(t => (
            <TaskRow key={t.rec_id} task={t} showProject={false} />
          ))}
        </div>
      )}
    </div>
  )
}

/* ─────────────── Vista per TASK ─────────────── */

function WorkspaceSectionTask({ ws }: { ws: OreWorkspace }) {
  // Flatten all tasks in this workspace, sort by rec_done_at desc
  const allTasks = ws.progetti
    .flatMap(prj =>
      prj.tasks.map(t => ({ ...t, prj_code: prj.prj_code, prj_label: prj.prj_label }))
    )
    .sort((a, b) => {
      if (!a.rec_done_at && !b.rec_done_at) return 0
      if (!a.rec_done_at) return 1
      if (!b.rec_done_at) return -1
      return new Date(b.rec_done_at).getTime() - new Date(a.rec_done_at).getTime()
    })

  if (allTasks.length === 0) return null

  return (
    <section>
      <WsHeader ws={ws} />
      <div className="border-b border-gray-200 mb-1" />
      <div style={{ backgroundColor: '#FAFAFA' }}>
        {allTasks.map(t => (
          <TaskRowWithProject key={t.rec_id} task={t} />
        ))}
      </div>
    </section>
  )
}

function TaskRowWithProject({ task }: { task: OreTask & { prj_code: string; prj_label: string } }) {
  return (
    <div
      className="flex items-center justify-between py-2.5 border-b border-gray-100 last:border-0"
      style={{ paddingLeft: 16, paddingRight: 16 }}
    >
      <div className="flex items-center gap-3 min-w-0">
        {task.rec_code && (
          <span className="font-mono text-xs text-gray-400 shrink-0">{task.rec_code}</span>
        )}
        <div className="flex flex-col min-w-0">
          <span className="text-xs font-medium text-gray-700 truncate">{task.rec_title}</span>
          <span className="text-xs text-gray-400">{task.prj_code} — {task.prj_label}</span>
        </div>
      </div>
      <div className="flex items-center gap-3 shrink-0 ml-3">
        <span className="text-xs font-bold text-gray-800">{formatOre(task.rec_hours)}</span>
        {task.rec_done_at && (
          <span className="text-xs text-gray-400 w-10 text-right">
            {new Date(task.rec_done_at).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' })}
          </span>
        )}
      </div>
    </div>
  )
}

function TaskRow({ task }: { task: OreTask; showProject: boolean }) {
  return (
    <div
      className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0"
      style={{ paddingLeft: 32, paddingRight: 16 }}
    >
      <div className="flex items-center gap-3 min-w-0">
        {task.rec_code && (
          <span className="font-mono text-xs text-gray-400 shrink-0">{task.rec_code}</span>
        )}
        <span className="text-xs text-gray-600 truncate">{task.rec_title}</span>
      </div>
      <div className="flex items-center gap-3 shrink-0 ml-3">
        <span className="text-xs font-medium text-gray-700">{formatOre(task.rec_hours)}</span>
        {task.rec_done_at && (
          <span className="text-xs text-gray-400 w-10 text-right">
            {new Date(task.rec_done_at).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' })}
          </span>
        )}
      </div>
    </div>
  )
}

/* ─────────────── Componenti condivisi ─────────────── */

function WsHeader({ ws }: { ws: OreWorkspace }) {
  return (
    <div
      className="flex items-center justify-between px-4 py-3 rounded-r-lg"
      style={{ backgroundColor: '#F5F5F5', borderLeft: `4px solid ${ws.ws_color}` }}
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
