import { useState } from 'react'
import type { TbRecord } from '../types'
import {
  kindLabel, kindBadgeColor,
  priorityLabel, priorityBadgeColor,
  dueDateLabel, isOverdue, formatDateTime,
} from '../utils/format'
import { closeRecord } from '../hooks/useRecords'

interface Props {
  record: TbRecord
}

export function RecordTile({ record: r }: Props) {
  const [closing, setClosing] = useState(false)

  async function handleClose() {
    setClosing(true)
    await closeRecord(r.rec_id)
    // realtime subscription will refresh the list
  }

  const overdue = isOverdue(r.rec_due_date)
  const wsColor = r.ws_color ?? '#718096'

  return (
    <div
      className="bg-gray-800 rounded-xl border border-gray-700 p-4 flex flex-col gap-3 relative hover:border-gray-500 transition-colors"
      style={{ borderLeftColor: wsColor, borderLeftWidth: 3 }}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5 min-w-0">
          {r.rec_code && (
            <span className="font-mono text-xs text-gray-400 shrink-0">{r.rec_code}</span>
          )}
          {r.rec_flagged && <span className="text-yellow-400 text-sm">⭐</span>}
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
      <p className="text-white font-medium leading-snug text-sm">{r.rec_title}</p>

      {/* Project / sub-label */}
      {r.prj_label && (
        <p className="text-xs text-gray-400 truncate">
          {r.ws_icon && <span className="mr-1">{r.ws_icon}</span>}
          {r.prj_label}
          {r.rec_sub_label && <span className="text-gray-500"> — {r.rec_sub_label}</span>}
        </p>
      )}

      {/* Body preview */}
      {r.rec_body && (
        <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">{r.rec_body}</p>
      )}

      {/* Event times */}
      {r.rec_kind === 'EV' && r.rec_event_start && (
        <p className="text-xs text-orange-400">
          📅 {formatDateTime(r.rec_event_start)}
          {r.rec_event_end && <> → {formatDateTime(r.rec_event_end)}</>}
        </p>
      )}

      {/* Footer */}
      <div className="flex items-end justify-between mt-auto pt-1">
        <div className="flex flex-wrap gap-1">
          {/* Due date */}
          {r.rec_due_date && r.rec_kind !== 'EV' && (
            <span className={`text-xs font-medium ${overdue ? 'text-red-400' : 'text-gray-400'}`}>
              ⏰ {dueDateLabel(r.rec_due_date)}
            </span>
          )}
          {/* Tags */}
          {r.rec_tags?.map(tag => (
            <span key={tag} className="text-xs bg-gray-700 text-gray-400 px-1.5 py-0.5 rounded">
              #{tag}
            </span>
          ))}
        </div>

        {/* Close button — only for Task */}
        {r.rec_kind === 'T' && (
          <button
            onClick={handleClose}
            disabled={closing}
            className="ml-2 shrink-0 w-8 h-8 rounded-lg bg-gray-700 hover:bg-green-600 text-white flex items-center justify-center transition-colors disabled:opacity-50"
            title="Chiudi task"
          >
            {closing ? (
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <span className="text-sm font-bold">✓</span>
            )}
          </button>
        )}
      </div>
    </div>
  )
}
