import { useState } from 'react'
import { useInboxRecords, assignToProject, moveToSmallTasks } from '../hooks/useRecords'
import { useProjects } from '../hooks/useProjects'
import type { TbRecord } from '../types'
import { kindLabel, kindBadgeColor, formatDate } from '../utils/format'

export function InboxTab() {
  const { records, loading } = useInboxRecords()
  const { projects } = useProjects()

  if (loading) return <LoadingState />
  if (records.length === 0) return <EmptyState />

  return (
    <div className="flex flex-col gap-3">
      {records.map(r => (
        <InboxCard key={r.rec_id} record={r} projects={projects} />
      ))}
    </div>
  )
}

function InboxCard({ record: r, projects }: {
  record: TbRecord
  projects: ReturnType<typeof useProjects>['projects']
}) {
  const [selectedPrjId, setSelectedPrjId] = useState('')
  const [busy, setBusy] = useState(false)

  async function handleAssign() {
    if (!selectedPrjId) return
    setBusy(true)
    const prj = projects.find(p => p.prj_id === selectedPrjId)
    if (prj) {
      await assignToProject(r.rec_id, prj.prj_id, prj.prj_code, prj.prj_ws_id, prj.prj_ws_code)
    }
    setBusy(false)
  }

  async function handleSmallTasks() {
    setBusy(true)
    await moveToSmallTasks(r.rec_id)
    setBusy(false)
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${kindBadgeColor(r.rec_kind)}`}>
          {kindLabel(r.rec_kind)}
        </span>
        <span className="text-xs text-gray-400">{formatDate(r.rec_created_at)}</span>
      </div>
      <p className="text-gray-900 text-sm font-semibold">{r.rec_title}</p>
      {r.rec_body && <p className="text-xs text-gray-500 line-clamp-2">{r.rec_body}</p>}

      <div className="flex flex-col sm:flex-row gap-2 pt-1">
        <select
          value={selectedPrjId}
          onChange={e => setSelectedPrjId(e.target.value)}
          disabled={busy}
          className="flex-1 bg-white text-gray-700 text-sm rounded-lg px-3 py-2 border border-gray-200 focus:outline-none focus:border-blue-500"
        >
          <option value="">Seleziona progetto…</option>
          {projects.map(p => (
            <option key={p.prj_id} value={p.prj_id}>
              {p.prj_code} — {p.prj_label}
            </option>
          ))}
        </select>
        <button
          onClick={handleAssign}
          disabled={!selectedPrjId || busy}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white text-sm font-medium rounded-lg transition-colors"
        >
          Assegna
        </button>
        <button
          onClick={handleSmallTasks}
          disabled={busy}
          className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 text-sm rounded-lg transition-colors"
          title="Sposta a Small Tasks"
        >
          ⚡ Small Tasks
        </button>
      </div>
    </div>
  )
}

function LoadingState() {
  return (
    <div className="flex justify-center py-12">
      <span className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )
}

function EmptyState() {
  return (
    <div className="text-center py-16 text-gray-400">
      <div className="text-4xl mb-3">📥</div>
      <p className="text-sm">Inbox vuota</p>
    </div>
  )
}
