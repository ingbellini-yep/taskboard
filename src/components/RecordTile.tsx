import { useState } from 'react'
import type { TbRecord } from '../types'
import {
  kindLabel, kindBadgeColor,
  priorityLabel, priorityBadgeColor,
  dueDateLabel, isOverdue, formatDateTime,
} from '../utils/format'
import { closeRecord, deleteRecord } from '../hooks/useRecords'
import { CloseTaskModal } from './CloseTaskModal'
import { DeleteMemoModal } from './DeleteMemoModal'

interface Props {
  record: TbRecord
}

export function RecordTile({ record: r }: Props) {
  const [showCloseModal, setShowCloseModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)

  async function handleConfirmClose(hours: number | null) {
    await closeRecord(r.rec_id, hours)
    setShowCloseModal(false)
  }

  async function handleConfirmDelete() {
    await deleteRecord(r.rec_id)
    setShowDeleteModal(false)
  }

  const overdue = isOverdue(r.rec_due_date)
  const wsColor = r.ws_color ?? '#718096'

  return (
    <>
    <div
      className="bg-white rounded-xl border border-gray-200 hover:border-gray-300 p-4 flex flex-col gap-3 relative shadow-sm hover:shadow-md transition-all duration-150"
      style={{ borderLeftColor: wsColor, borderLeftWidth: 3 }}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5 min-w-0">
          {r.rec_code && (
            <span className="font-mono text-xs text-gray-400 shrink-0">{r.rec_code}</span>
          )}
          {r.rec_flagged && <span className="text-yellow-500 text-sm">⭐</span>}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${kindBadgeColor(r.rec_kind)}`}>
            {kindLabel(r.rec_kind)}
          </span>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${priorityBadgeColor(r.rec_priority)}`}>
            {priorityLabel(r.rec_priority)}
          </span>
        </div>
      </div>

      {/* Title */}
      <p className="text-gray-900 font-semibold leading-snug text-sm">{r.rec_title}</p>

      {/* Project / sub-label */}
      {r.prj_label && (
        <p className="text-xs text-gray-500 truncate">
          {r.ws_icon && <span className="mr-1">{r.ws_icon}</span>}
          {r.prj_label}
          {r.rec_sub_label && <span className="text-gray-400"> — {r.rec_sub_label}</span>}
        </p>
      )}

      {/* Body preview */}
      {r.rec_body && (
        <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">{r.rec_body}</p>
      )}

      {/* Event times */}
      {r.rec_kind === 'EV' && r.rec_event_start && (
        <p className="text-xs text-orange-500">
          📅 {formatDateTime(r.rec_event_start)}
          {r.rec_event_end && <> → {formatDateTime(r.rec_event_end)}</>}
        </p>
      )}

      {/* Footer */}
      <div className="flex items-end justify-between mt-auto pt-1">
        <div className="flex flex-wrap gap-1">
          {/* Due date */}
          {r.rec_due_date && r.rec_kind !== 'EV' && (
            <span className={`text-xs font-medium ${overdue ? 'text-red-500' : 'text-gray-500'}`}>
              ⏰ {dueDateLabel(r.rec_due_date)}
            </span>
          )}
          {/* Tags */}
          {r.rec_tags?.map(tag => (
            <span key={tag} className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">
              #{tag}
            </span>
          ))}
        </div>

        {/* Close button — Task */}
        {r.rec_kind === 'T' && (
          <button
            onClick={() => setShowCloseModal(true)}
            className="ml-2 shrink-0 w-8 h-8 rounded-lg bg-gray-100 hover:bg-green-500 text-gray-500 hover:text-white flex items-center justify-center transition-colors"
            title="Chiudi task"
          >
            <span className="text-sm font-bold">✓</span>
          </button>
        )}

        {/* Delete button — Memo */}
        {r.rec_kind === 'M' && (
          <button
            onClick={() => setShowDeleteModal(true)}
            className="ml-2 shrink-0 w-8 h-8 rounded-lg bg-gray-100 hover:bg-red-500 text-gray-400 hover:text-white flex items-center justify-center transition-colors"
            title="Elimina memo"
          >
            <span className="text-sm">🗑</span>
          </button>
        )}
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
        onConfirm={handleConfirmDelete}
        onCancel={() => setShowDeleteModal(false)}
      />
    )}
  </>
  )
}
