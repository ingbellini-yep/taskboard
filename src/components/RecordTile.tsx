import { useState } from 'react'
import type { TbRecord } from '../types'
import { kindLabel, dueDateLabel, isOverdue, formatDateTime } from '../utils/format'
import { closeRecord, deleteRecord, archiveRecord } from '../hooks/useRecords'
import { CloseTaskModal } from './CloseTaskModal'
import { DeleteMemoModal } from './DeleteMemoModal'
import { ReassignTaskModal } from './ReassignTaskModal'

interface Props {
  record: TbRecord
}

function kindBadgeClass(kind: string): string {
  if (kind === 'T') return 'bg-blue-600 text-white text-xs px-1.5 py-0.5 rounded font-medium'
  if (kind === 'M') return 'bg-gray-500 text-white text-xs px-1.5 py-0.5 rounded font-medium'
  return 'bg-orange-500 text-white text-xs px-1.5 py-0.5 rounded font-medium'
}

function priorityBadgeClass(r: TbRecord): string {
  if (r.rec_status === 'sospeso') return 'bg-yellow-50 text-yellow-700 border border-yellow-200 text-xs px-2 py-0.5 rounded-full'
  if (r.rec_priority === 1) return 'bg-red-50 text-red-700 border border-red-200 text-xs px-2 py-0.5 rounded-full'
  if (r.rec_priority === 3) return 'bg-gray-100 text-gray-500 border border-gray-200 text-xs px-2 py-0.5 rounded-full'
  return 'bg-blue-50 text-blue-700 border border-blue-200 text-xs px-2 py-0.5 rounded-full'
}

function priorityBadgeLabel(r: TbRecord): string {
  if (r.rec_status === 'sospeso') return 'sospeso'
  if (r.rec_priority === 1) return 'alta'
  if (r.rec_priority === 3) return 'bassa'
  return 'normale'
}

export function RecordTile({ record: r }: Props) {
  const [showCloseModal, setShowCloseModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showReassignModal, setShowReassignModal] = useState(false)

  async function handleConfirmClose(hours: number | null) {
    await closeRecord(r.rec_id, hours)
    setShowCloseModal(false)
  }

  async function handleConfirmDelete() {
    await deleteRecord(r.rec_id)
    setShowDeleteModal(false)
  }

  async function handleArchive() {
    await archiveRecord(r.rec_id)
  }

  const overdue = isOverdue(r.rec_due_date)
  const wsColor = r.ws_color ?? '#718096'

  return (
    <>
      <div
        className="bg-white border border-gray-200 rounded-lg p-4 flex flex-col gap-2 shadow-sm hover:shadow-md hover:border-gray-300 transition-all duration-150"
        style={{ borderLeftColor: wsColor, borderLeftWidth: 3 }}
      >
        {/* Codice record */}
        {r.rec_code && (
          <span className="font-mono text-xs" style={{ color: '#9E9E9E' }}>{r.rec_code}</span>
        )}

        {/* Titolo + badge tipo inline */}
        <div className="flex items-start gap-2 flex-wrap">
          <span className="font-semibold text-sm leading-snug flex-1 min-w-0" style={{ color: '#212121' }}>
            {r.rec_flagged && <span className="text-yellow-500 mr-1">⭐</span>}
            {r.rec_title}
          </span>
          <span className={`shrink-0 ${kindBadgeClass(r.rec_kind)}`}>{kindLabel(r.rec_kind)}</span>
        </div>

        {/* Progetto */}
        {r.prj_label && (
          <p className="text-xs truncate" style={{ color: '#616161' }}>
            {r.ws_icon && <span className="mr-1">{r.ws_icon}</span>}
            {r.prj_label}
            {r.rec_sub_label && <span style={{ color: '#9E9E9E' }}> — {r.rec_sub_label}</span>}
          </p>
        )}

        {/* Badge priorità */}
        <div>
          <span className={priorityBadgeClass(r)}>{priorityBadgeLabel(r)}</span>
        </div>

        {/* Body preview */}
        {r.rec_body && (
          <p className="text-xs line-clamp-2 leading-relaxed" style={{ color: '#616161' }}>{r.rec_body}</p>
        )}

        {/* Event times */}
        {r.rec_kind === 'EV' && r.rec_event_start && (
          <p className="text-xs text-orange-500">
            📅 {formatDateTime(r.rec_event_start)}
            {r.rec_event_end && <> → {formatDateTime(r.rec_event_end)}</>}
          </p>
        )}

        {/* Footer: date + action button */}
        <div className="flex items-center justify-between mt-auto pt-1">
          <div className="flex flex-wrap gap-1">
            {r.rec_due_date && r.rec_kind !== 'EV' && (
              <span
                className="text-xs font-medium"
                style={{ color: overdue ? '#C62828' : '#616161' }}
              >
                ⏰ {dueDateLabel(r.rec_due_date)}
              </span>
            )}
            {r.rec_tags?.map(tag => (
              <span key={tag} className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">
                #{tag}
              </span>
            ))}
          </div>

          {/* Task: close + reassign + delete buttons */}
          {r.rec_kind === 'T' && (
            <div className="ml-2 flex gap-1 shrink-0">
              <button
                onClick={() => setShowCloseModal(true)}
                className="w-8 h-8 flex items-center justify-center rounded border border-gray-200 bg-gray-50 hover:bg-green-50 hover:border-green-300 hover:text-green-600 text-gray-400 text-sm transition-colors"
                title="Chiudi task"
              >
                ✓
              </button>
              <button
                onClick={() => setShowReassignModal(true)}
                className="w-8 h-8 flex items-center justify-center rounded border border-gray-200 bg-gray-50 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-600 text-gray-400 text-sm transition-colors"
                title="Riattribuisci task"
              >
                ✏️
              </button>
              <button
                onClick={() => setShowDeleteModal(true)}
                className="w-8 h-8 flex items-center justify-center rounded border border-gray-200 bg-gray-50 hover:bg-red-50 hover:border-red-300 hover:text-red-600 text-gray-400 text-sm transition-colors"
                title="Elimina task"
              >
                🗑
              </button>
            </div>
          )}

          {/* Memo: archive + delete buttons */}
          {r.rec_kind === 'M' && (
            <div className="ml-2 flex gap-1 shrink-0">
              <button
                onClick={handleArchive}
                className="w-8 h-8 flex items-center justify-center rounded border border-gray-200 bg-gray-50 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-600 text-gray-400 text-sm transition-colors"
                title="Archivia memo"
              >
                📁
              </button>
              <button
                onClick={() => setShowDeleteModal(true)}
                className="w-8 h-8 flex items-center justify-center rounded border border-gray-200 bg-gray-50 hover:bg-red-50 hover:border-red-300 hover:text-red-600 text-gray-400 text-sm transition-colors"
                title="Elimina memo"
              >
                🗑
              </button>
            </div>
          )}
          {/* EV: nessun bottone */}
        </div>
      </div>

      {showCloseModal && (
        <CloseTaskModal
          recCode={r.rec_code ?? null}
          recTitle={r.rec_title}
          onConfirm={handleConfirmClose}
          onCancel={() => setShowCloseModal(false)}
        />
      )}
      {showDeleteModal && (
        <DeleteMemoModal
          recTitle={r.rec_title}
          recordType={r.rec_kind === 'T' ? 'Task' : 'Memo'}
          onConfirm={handleConfirmDelete}
          onCancel={() => setShowDeleteModal(false)}
        />
      )}
      {showReassignModal && (
        <ReassignTaskModal
          recId={r.rec_id}
          recTitle={r.rec_title}
          recCode={r.rec_code ?? null}
          onDone={() => setShowReassignModal(false)}
          onCancel={() => setShowReassignModal(false)}
        />
      )}
    </>
  )
}
