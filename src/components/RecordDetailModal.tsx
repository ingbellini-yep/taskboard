import { useEffect, useState } from 'react'
import type { TbRecord } from '../types'
import {
  kindLabel, formatDate, formatDateTime, dueDateLabel, isOverdue, statusLabel,
} from '../utils/format'
import { closeRecord, deleteRecord, archiveRecord } from '../hooks/useRecords'
import { CloseTaskModal } from './CloseTaskModal'
import { DeleteMemoModal } from './DeleteMemoModal'
import { ReassignTaskModal } from './ReassignTaskModal'
import { SubtaskSection } from './SubtaskSection'
import { UpdatesTimeline } from './UpdatesTimeline'

interface Props {
  record: TbRecord
  onClose: () => void
}

function kindBadgeClass(kind: string): string {
  if (kind === 'T') return 'bg-blue-600 text-white'
  if (kind === 'M') return 'bg-gray-500 text-white'
  return 'bg-orange-500 text-white'
}

function priorityBadgeClass(r: TbRecord): string {
  if (r.rec_status === 'sospeso') return 'bg-yellow-50 text-yellow-700 border border-yellow-200'
  if (r.rec_priority === 1) return 'bg-red-50 text-red-700 border border-red-200'
  if (r.rec_priority === 3) return 'bg-gray-100 text-gray-500 border border-gray-200'
  return 'bg-blue-50 text-blue-700 border border-blue-200'
}

function priorityLabel(r: TbRecord): string {
  if (r.rec_status === 'sospeso') return 'Sospeso'
  if (r.rec_priority === 1) return 'Alta'
  if (r.rec_priority === 3) return 'Bassa'
  return 'Normale'
}

function formatOre(h: number | null): string {
  if (h === null || h === undefined) return '—'
  return `${h % 1 === 0 ? h.toFixed(0) : h.toFixed(1)}h`
}

export function RecordDetailModal({ record: r, onClose }: Props) {
  const [showCloseModal, setShowCloseModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showReassignModal, setShowReassignModal] = useState(false)

  const wsColor = r.ws_color ?? '#718096'
  const overdue = isOverdue(r.rec_due_date)

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  async function handleConfirmClose(hours: number | null) {
    await closeRecord(r.rec_id, hours)
    setShowCloseModal(false)
    onClose()
  }

  async function handleConfirmDelete() {
    await deleteRecord(r.rec_id)
    setShowDeleteModal(false)
    onClose()
  }

  async function handleArchive() {
    await archiveRecord(r.rec_id)
    onClose()
  }

  // Se sono aperti i sotto-modali, li mostra al posto della scheda
  if (showCloseModal) {
    return (
      <CloseTaskModal
        recCode={r.rec_code ?? null}
        recTitle={r.rec_title}
        onConfirm={handleConfirmClose}
        onCancel={() => setShowCloseModal(false)}
      />
    )
  }
  if (showDeleteModal) {
    return (
      <DeleteMemoModal
        recTitle={r.rec_title}
        recordType={r.rec_kind === 'T' ? 'Task' : 'Memo'}
        onConfirm={handleConfirmDelete}
        onCancel={() => setShowDeleteModal(false)}
      />
    )
  }
  if (showReassignModal) {
    return (
      <ReassignTaskModal
        recId={r.rec_id}
        recTitle={r.rec_title}
        recCode={r.rec_code ?? null}
        onDone={onClose}
        onCancel={() => setShowReassignModal(false)}
      />
    )
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 overflow-y-auto py-8 px-4"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-auto overflow-hidden">

        {/* Header colorato con accento ws_color */}
        <div
          className="px-5 py-4 flex items-start justify-between gap-3"
          style={{ borderLeft: `5px solid ${wsColor}` }}
        >
          <div className="flex flex-col gap-1 min-w-0">
            {/* Workspace + codice */}
            <div className="flex items-center gap-2 flex-wrap">
              {r.ws_label && (
                <span
                  className="text-xs font-bold px-2 py-0.5 rounded text-white"
                  style={{ backgroundColor: wsColor }}
                >
                  {r.ws_label}
                </span>
              )}
              {r.rec_code && (
                <span className="font-mono text-xs text-gray-400">{r.rec_code}</span>
              )}
              <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${kindBadgeClass(r.rec_kind)}`}>
                {kindLabel(r.rec_kind)}
              </span>
            </div>
            {/* Titolo */}
            <h2 className="font-bold text-gray-900 text-base leading-snug">
              {r.rec_flagged && <span className="text-yellow-500 mr-1">⭐</span>}
              {r.rec_title}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 text-gray-400 hover:text-gray-600 text-xl leading-none mt-0.5 transition-colors"
          >
            ×
          </button>
        </div>

        {/* Corpo */}
        <div className="px-5 py-4 flex flex-col gap-4 border-t border-gray-100">

          {/* Info principali */}
          <div className="grid grid-cols-2 gap-x-6 gap-y-2.5">
            {/* Stato */}
            <div className="flex flex-col gap-0.5">
              <span className="text-xs text-gray-400 uppercase tracking-wide">Stato</span>
              <span className="text-sm font-medium text-gray-700">{statusLabel(r.rec_status)}</span>
            </div>

            {/* Priorità */}
            <div className="flex flex-col gap-0.5">
              <span className="text-xs text-gray-400 uppercase tracking-wide">Priorità</span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium w-fit ${priorityBadgeClass(r)}`}>
                {priorityLabel(r)}
              </span>
            </div>

            {/* Progetto */}
            {r.prj_label && (
              <div className="col-span-2 flex flex-col gap-0.5">
                <span className="text-xs text-gray-400 uppercase tracking-wide">Progetto</span>
                <span className="text-sm text-gray-700">
                  {r.ws_icon && <span className="mr-1">{r.ws_icon}</span>}
                  {r.prj_label}
                  {r.rec_sub_label && <span className="text-gray-400"> — {r.rec_sub_label}</span>}
                </span>
              </div>
            )}

            {/* Scadenza */}
            {r.rec_due_date && r.rec_kind !== 'EV' && (
              <div className="flex flex-col gap-0.5">
                <span className="text-xs text-gray-400 uppercase tracking-wide">Scadenza</span>
                <span
                  className="text-sm font-medium"
                  style={{ color: overdue ? '#C62828' : '#374151' }}
                >
                  {overdue && '⚠️ '}{dueDateLabel(r.rec_due_date)}
                  <span className="text-gray-400 font-normal ml-1">({formatDate(r.rec_due_date)})</span>
                </span>
              </div>
            )}

            {/* Ore lavorate */}
            {r.rec_kind === 'T' && r.rec_hours !== null && r.rec_hours !== undefined && (
              <div className="flex flex-col gap-0.5">
                <span className="text-xs text-gray-400 uppercase tracking-wide">Ore lavorate</span>
                <span className="text-sm font-semibold text-gray-800">{formatOre(r.rec_hours)}</span>
              </div>
            )}

            {/* Data chiusura */}
            {r.rec_done_at && (
              <div className="flex flex-col gap-0.5">
                <span className="text-xs text-gray-400 uppercase tracking-wide">Chiuso il</span>
                <span className="text-sm text-gray-700">{formatDate(r.rec_done_at)}</span>
              </div>
            )}

            {/* Evento: date/ore */}
            {r.rec_kind === 'EV' && r.rec_event_start && (
              <div className="col-span-2 flex flex-col gap-0.5">
                <span className="text-xs text-gray-400 uppercase tracking-wide">Data evento</span>
                <span className="text-sm text-orange-600 font-medium">
                  📅 {formatDateTime(r.rec_event_start)}
                  {r.rec_event_end && <> → {formatDateTime(r.rec_event_end)}</>}
                </span>
              </div>
            )}
          </div>

          {/* Note / Body */}
          {r.rec_body && (
            <div className="flex flex-col gap-1.5">
              <span className="text-xs text-gray-400 uppercase tracking-wide">Note</span>
              <div className="bg-gray-50 rounded-lg px-4 py-3 border border-gray-100">
                <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{r.rec_body}</p>
              </div>
            </div>
          )}

          {/* Tag */}
          {r.rec_tags && r.rec_tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {r.rec_tags.map(tag => (
                <span key={tag} className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full border border-gray-200">
                  #{tag}
                </span>
              ))}
            </div>
          )}

          {/* Sync Google Calendar */}
          {r.rec_google_event_id && (
            <div className="flex items-center gap-2 text-xs text-green-700 bg-green-50 border border-green-100 rounded-lg px-3 py-2">
              <span>📅</span>
              <span>Sincronizzato con Google Calendar</span>
            </div>
          )}

          {/* Sub-task (solo Task) */}
          {r.rec_kind === 'T' && (
            <div className="pt-1 border-t border-gray-100">
              <SubtaskSection parentId={r.rec_id} />
            </div>
          )}

          {/* Aggiornamenti (solo Memo) */}
          {r.rec_kind === 'M' && (
            <div className="pt-1 border-t border-gray-100">
              <UpdatesTimeline parentId={r.rec_id} />
            </div>
          )}

          {/* Metadati */}
          <div className="flex items-center gap-4 pt-1 border-t border-gray-100">
            <span className="text-xs text-gray-400">
              Creato: {formatDate(r.rec_created_at)}
            </span>
            {r.rec_updated_at && r.rec_updated_at !== r.rec_created_at && (
              <span className="text-xs text-gray-400">
                Aggiornato: {formatDate(r.rec_updated_at)}
              </span>
            )}
          </div>
        </div>

        {/* Footer con azioni */}
        {(r.rec_kind === 'T' || r.rec_kind === 'M') && (
          <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-gray-100 bg-gray-50">
            {r.rec_kind === 'T' && (
              <>
                <button
                  onClick={() => setShowCloseModal(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-gray-200 bg-white rounded-lg hover:bg-green-50 hover:border-green-300 hover:text-green-700 text-gray-500 transition-colors"
                >
                  ✓ Chiudi task
                </button>
                <button
                  onClick={() => setShowReassignModal(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-gray-200 bg-white rounded-lg hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 text-gray-500 transition-colors"
                >
                  ✏️ Riattribuisci
                </button>
                <button
                  onClick={() => setShowDeleteModal(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-gray-200 bg-white rounded-lg hover:bg-red-50 hover:border-red-300 hover:text-red-700 text-gray-500 transition-colors"
                >
                  🗑 Elimina
                </button>
              </>
            )}
            {r.rec_kind === 'M' && (
              <>
                <button
                  onClick={handleArchive}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-gray-200 bg-white rounded-lg hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 text-gray-500 transition-colors"
                >
                  📁 Archivia
                </button>
                <button
                  onClick={() => setShowDeleteModal(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-gray-200 bg-white rounded-lg hover:bg-red-50 hover:border-red-300 hover:text-red-700 text-gray-500 transition-colors"
                >
                  🗑 Elimina
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
