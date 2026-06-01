import { useState } from 'react'
import type { TbRecord } from '../types'
import { updateRecordStatus, closeRecord } from '../hooks/useRecords'
import { kindLabel, dueDateLabel, isOverdue } from '../utils/format'
import { RecordDetailModal } from './RecordDetailModal'
import { CloseTaskModal } from './CloseTaskModal'

// Stati workflow gestiti dal drag (escluso 'fatto' che è un'azione di chiusura)
type WorkflowStatus = 'aperto' | 'in_progress' | 'sospeso'
type ColumnKey = WorkflowStatus | 'fatto'

const COLUMNS: { key: ColumnKey; label: string; color: string }[] = [
  { key: 'aperto',      label: 'Da fare',  color: '#1565C0' },
  { key: 'in_progress', label: 'In corso', color: '#E65100' },
  { key: 'sospeso',     label: 'Sospesi',  color: '#B8860B' },
  { key: 'fatto',       label: 'Fatto',    color: '#2E7D32' },
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
  const [dragOver, setDragOver] = useState<ColumnKey | null>(null)
  // Override ottimistico locale dello stato durante il drag
  const [localStatus, setLocalStatus] = useState<Record<string, WorkflowStatus>>({})
  // Task chiusi localmente (drop in "Fatto" → spariscono dalla board)
  const [closedIds, setClosedIds] = useState<Set<string>>(new Set())
  // Task in attesa di chiusura: mostra CloseTaskModal
  const [closing, setClosing] = useState<TbRecord | null>(null)

  function statusOf(r: TbRecord): WorkflowStatus {
    return (localStatus[r.rec_id] ?? r.rec_status) as WorkflowStatus
  }

  const visibleRecords = records.filter(r => !closedIds.has(r.rec_id))

  function handleDragStart(e: React.DragEvent, id: string) {
    setDragging(id)
    e.dataTransfer.effectAllowed = 'move'
  }

  async function handleDrop(e: React.DragEvent, col: ColumnKey) {
    e.preventDefault()
    setDragOver(null)
    const id = dragging
    setDragging(null)
    if (!id) return
    const rec = records.find(r => r.rec_id === id)
    if (!rec) return

    if (col === 'fatto') {
      // Apre il modale per registrare le ore prima di chiudere
      setClosing(rec)
      return
    }
    if (statusOf(rec) === col) return
    setLocalStatus(prev => ({ ...prev, [id]: col }))
    await updateRecordStatus(id, col)
  }

  async function moveTo(id: string, col: ColumnKey) {
    const rec = records.find(r => r.rec_id === id)
    if (!rec) return
    if (col === 'fatto') {
      setClosing(rec)
      return
    }
    setLocalStatus(prev => ({ ...prev, [id]: col }))
    await updateRecordStatus(id, col)
  }

  async function confirmClose(hours: number | null) {
    if (!closing) return
    const id = closing.rec_id
    setClosedIds(prev => new Set(prev).add(id))
    setClosing(null)
    await closeRecord(id, hours)
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {COLUMNS.map(col => {
          const colRecords = col.key === 'fatto'
            ? []  // "Fatto" è una zona di rilascio: i chiusi escono dalla board (vedi tab Completati)
            : visibleRecords.filter(r => statusOf(r) === col.key)
          const isOver = dragOver === col.key
          const isFatto = col.key === 'fatto'
          return (
            <div
              key={col.key}
              onDragOver={e => { e.preventDefault(); setDragOver(col.key) }}
              onDragLeave={() => setDragOver(null)}
              onDrop={e => handleDrop(e, col.key)}
              className={`rounded-xl border-2 flex flex-col gap-2 p-3 min-h-[300px] transition-colors ${
                isOver
                  ? (isFatto ? 'border-green-400 bg-green-50' : 'border-blue-400 bg-blue-50')
                  : (isFatto ? 'border-green-200 border-dashed bg-green-50/30' : 'border-gray-200 bg-gray-50')
              }`}
            >
              {/* Header colonna */}
              <div className="flex items-center gap-2 pb-2 sticky top-0">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: col.color }} />
                <span className="text-sm font-semibold text-gray-700">{col.label}</span>
                {!isFatto && (
                  <span className="ml-auto text-xs text-gray-400 bg-white px-1.5 py-0.5 rounded-full border border-gray-200">
                    {colRecords.length}
                  </span>
                )}
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

              {isFatto ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center text-green-600/70 text-xs gap-1 py-6">
                  <span className="text-2xl">✓</span>
                  <span>Trascina qui per chiudere<br/>(registra le ore)</span>
                </div>
              ) : colRecords.length === 0 ? (
                <div className="text-center py-8 text-gray-300 text-xs">Trascina qui</div>
              ) : null}
            </div>
          )
        })}
      </div>

      {closing && (
        <CloseTaskModal
          recCode={closing.rec_code ?? null}
          recTitle={closing.rec_title}
          onConfirm={confirmClose}
          onCancel={() => setClosing(null)}
        />
      )}
    </>
  )
}

function KanbanCard({ record: r, currentStatus, dragging, onDragStart, onMove }: {
  record: TbRecord
  currentStatus: WorkflowStatus
  dragging: boolean
  onDragStart: (e: React.DragEvent, id: string) => void
  onMove: (id: string, col: ColumnKey) => void
}) {
  const [showDetail, setShowDetail] = useState(false)
  const wsColor = r.ws_color ?? '#718096'
  const overdue = isOverdue(r.rec_due_date)
  const otherCols = COLUMNS.filter(c => c.key !== currentStatus)

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
              key={col.key}
              onClick={e => { e.stopPropagation(); onMove(r.rec_id, col.key) }}
              className="text-xs text-gray-400 px-2 py-0.5 rounded transition-colors hover:text-white"
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = col.color)}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = '')}
              title={col.key === 'fatto' ? 'Chiudi (registra ore)' : `Sposta in ${col.label}`}
            >
              {col.key === 'fatto' ? '✓ Fatto' : `→ ${col.label}`}
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
