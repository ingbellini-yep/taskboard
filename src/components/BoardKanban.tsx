import { useState } from 'react'
import type { TbRecord } from '../types'
import { updateRecordStatus } from '../hooks/useRecords'
import { kindLabel, dueDateLabel, isOverdue } from '../utils/format'
import { RecordDetailModal } from './RecordDetailModal'

type KanbanStatus = 'aperto' | 'in_progress' | 'sospeso'

const COLUMNS: { status: KanbanStatus; label: string; color: string }[] = [
  { status: 'aperto',      label: 'Da fare',  color: '#1565C0' },
  { status: 'in_progress', label: 'In corso', color: '#E65100' },
  { status: 'sospeso',     label: 'Sospesi',  color: '#B8860B' },
]

function kindBadgeClass(kind: string): string {
  if (kind === 'T') return 'bg-blue-600 text-white'
  if (kind === 'M') return 'bg-gray-500 text-white'
  return 'bg-orange-500 text-white'
}

interface Props {
  records: TbRecord[]
}

export function BoardKanban({ records }: Props) {
  const [dragging, setDragging] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState<KanbanStatus | null>(null)
  // Override ottimistico locale dello stato durante il drag
  const [localStatus, setLocalStatus] = useState<Record<string, KanbanStatus>>({})

  function statusOf(r: TbRecord): KanbanStatus {
    return (localStatus[r.rec_id] ?? r.rec_status) as KanbanStatus
  }

  function handleDragStart(e: React.DragEvent, id: string) {
    setDragging(id)
    e.dataTransfer.effectAllowed = 'move'
  }

  async function handleDrop(e: React.DragEvent, status: KanbanStatus) {
    e.preventDefault()
    setDragOver(null)
    const id = dragging
    setDragging(null)
    if (!id) return
    const rec = records.find(r => r.rec_id === id)
    if (!rec || statusOf(rec) === status) return
    setLocalStatus(prev => ({ ...prev, [id]: status }))
    await updateRecordStatus(id, status)
  }

  async function moveTo(id: string, status: KanbanStatus) {
    setLocalStatus(prev => ({ ...prev, [id]: status }))
    await updateRecordStatus(id, status)
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {COLUMNS.map(col => {
        const colRecords = records.filter(r => statusOf(r) === col.status)
        const isOver = dragOver === col.status
        return (
          <div
            key={col.status}
            onDragOver={e => { e.preventDefault(); setDragOver(col.status) }}
            onDragLeave={() => setDragOver(null)}
            onDrop={e => handleDrop(e, col.status)}
            className={`rounded-xl border-2 flex flex-col gap-2 p-3 min-h-[300px] transition-colors ${
              isOver ? 'border-blue-400 bg-blue-50' : 'border-gray-200 bg-gray-50'
            }`}
          >
            {/* Header colonna */}
            <div className="flex items-center gap-2 pb-2 sticky top-0">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: col.color }} />
              <span className="text-sm font-semibold text-gray-700">{col.label}</span>
              <span className="ml-auto text-xs text-gray-400 bg-white px-1.5 py-0.5 rounded-full border border-gray-200">
                {colRecords.length}
              </span>
            </div>

            {/* Card */}
            {colRecords.map(r => (
              <KanbanCard
                key={r.rec_id}
                record={r}
                currentStatus={statusOf(r)}
                dragging={dragging === r.rec_id}
                onDragStart={handleDragStart}
                onMove={moveTo}
              />
            ))}

            {colRecords.length === 0 && (
              <div className="text-center py-8 text-gray-300 text-xs">Trascina qui</div>
            )}
          </div>
        )
      })}
    </div>
  )
}

function KanbanCard({ record: r, currentStatus, dragging, onDragStart, onMove }: {
  record: TbRecord
  currentStatus: KanbanStatus
  dragging: boolean
  onDragStart: (e: React.DragEvent, id: string) => void
  onMove: (id: string, status: KanbanStatus) => void
}) {
  const [showDetail, setShowDetail] = useState(false)
  const wsColor = r.ws_color ?? '#718096'
  const overdue = isOverdue(r.rec_due_date)
  const otherCols = COLUMNS.filter(c => c.status !== currentStatus)

  return (
    <>
      <div
        draggable
        onDragStart={e => onDragStart(e, r.rec_id)}
        onClick={() => setShowDetail(true)}
        className={`bg-white rounded-lg border border-gray-200 p-3 flex flex-col gap-2 shadow-sm cursor-pointer group transition-all ${
          dragging ? 'opacity-40' : 'hover:border-gray-300 hover:shadow-md'
        }`}
        style={{ borderLeftColor: wsColor, borderLeftWidth: 3 }}
      >
        {/* Codice + tipo */}
        <div className="flex items-center gap-2">
          {r.rec_code && (
            <span className="font-mono text-xs flex-1" style={{ color: '#9E9E9E' }}>{r.rec_code}</span>
          )}
          <span className={`text-xs px-1.5 py-0.5 rounded font-medium shrink-0 ${kindBadgeClass(r.rec_kind)}`}>
            {kindLabel(r.rec_kind)}
          </span>
        </div>

        {/* Titolo */}
        <span className="font-semibold text-sm leading-snug text-gray-900">
          {r.rec_flagged && <span className="text-yellow-500 mr-1">⭐</span>}
          {r.rec_title}
        </span>

        {/* Progetto */}
        {r.prj_label && (
          <p className="text-xs truncate" style={{ color: '#616161' }}>
            {r.ws_icon && <span className="mr-1">{r.ws_icon}</span>}
            {r.prj_label}
          </p>
        )}

        {/* Footer: priorità + scadenza */}
        <div className="flex flex-wrap items-center gap-2">
          {r.rec_priority === 1 && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200">alta</span>
          )}
          {r.rec_priority === 3 && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 border border-gray-200">bassa</span>
          )}
          {r.rec_due_date && r.rec_kind !== 'EV' && (
            <span className="text-xs font-medium" style={{ color: overdue ? '#C62828' : '#757575' }}>
              ⏰ {dueDateLabel(r.rec_due_date)}
            </span>
          )}
        </div>

        {/* Move buttons (per touch / no-drag) */}
        <div className="flex gap-1 pt-1 border-t border-gray-100 opacity-0 group-hover:opacity-100 transition-opacity">
          {otherCols.map(col => (
            <button
              key={col.status}
              onClick={e => { e.stopPropagation(); onMove(r.rec_id, col.status) }}
              className="text-xs text-gray-400 px-2 py-0.5 rounded transition-colors hover:text-white"
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = col.color)}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = '')}
              title={`Sposta in ${col.label}`}
            >
              → {col.label}
            </button>
          ))}
        </div>
      </div>

      {showDetail && (
        <RecordDetailModal record={r} onClose={() => setShowDetail(false)} />
      )}
    </>
  )
}
