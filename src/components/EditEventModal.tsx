import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useProjects } from '../hooks/useProjects'
import type { TbRecord } from '../types'

interface Props {
  record: TbRecord
  onDone: () => void
  onCancel: () => void
}

/** Estrae 'YYYY-MM-DD' e 'HH:MM' da un ISO datetime (locale). */
function splitIso(iso: string | null): { date: string; time: string } {
  if (!iso) {
    const now = new Date()
    return { date: now.toISOString().slice(0, 10), time: '09:00' }
  }
  // L'ISO salvato è senza timezone (es. 2026-06-09T09:00:00) → parse diretto
  const m = iso.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})/)
  if (m) return { date: m[1], time: m[2] }
  const d = new Date(iso)
  return {
    date: d.toISOString().slice(0, 10),
    time: d.toTimeString().slice(0, 5),
  }
}

export function EditEventModal({ record: r, onDone, onCancel }: Props) {
  const { projects } = useProjects()
  const titleRef = useRef<HTMLInputElement>(null)

  const start = splitIso(r.rec_event_start)
  const end = splitIso(r.rec_event_end)
  const wasAllDay = !r.rec_event_end && start.time === '00:00'

  const [title, setTitle] = useState(r.rec_title)
  const [date, setDate] = useState(start.date)
  const [timeStart, setTimeStart] = useState(start.time)
  const [timeEnd, setTimeEnd] = useState(r.rec_event_end ? end.time : '10:00')
  const [allDay, setAllDay] = useState(wasAllDay)
  const [body, setBody] = useState(r.rec_body ?? '')
  const [prjId, setPrjId] = useState(r.rec_prj_id ?? '')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    titleRef.current?.focus()
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onCancel])

  async function handleSave() {
    if (!title.trim() || saving) return
    setSaving(true)

    const eventStart = allDay ? `${date}T00:00:00` : `${date}T${timeStart}:00`
    const eventEnd = allDay ? null : `${date}T${timeEnd}:00`
    const selectedPrj = projects.find(p => p.prj_id === prjId)

    const payload: Record<string, unknown> = {
      rec_title: title.trim(),
      rec_event_start: eventStart,
      rec_event_end: eventEnd,
      rec_body: body.trim() || null,
    }

    if (selectedPrj) {
      payload.rec_bucket = 'project'
      payload.rec_prj_id = selectedPrj.prj_id
      payload.rec_prj_code = selectedPrj.prj_code
      payload.rec_ws_id = selectedPrj.prj_ws_id
      payload.rec_ws_code = selectedPrj.prj_ws_code
    } else {
      // Nessun progetto → torna in inbox, slega il progetto
      payload.rec_bucket = 'inbox'
      payload.rec_prj_id = null
      payload.rec_prj_code = null
      payload.rec_ws_id = null
      payload.rec_ws_code = null
    }

    await supabase.from('tb_records').update(payload).eq('rec_id', r.rec_id)
    setSaving(false)
    onDone()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={e => { if (e.target === e.currentTarget) onCancel() }}
    >
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <span className="font-semibold text-gray-900">✏️ Modifica Evento</span>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-600 text-lg leading-none">×</button>
        </div>

        <div className="px-5 py-5 flex flex-col gap-4 max-h-[70vh] overflow-y-auto">
          <input
            ref={titleRef}
            type="text"
            placeholder="Titolo evento…"
            value={title}
            onChange={e => setTitle(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />

          <div className="flex items-center gap-3">
            <div className="flex flex-col gap-1 flex-1">
              <label className="text-xs text-gray-500">Data</label>
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <label className="flex items-center gap-2 mt-4 shrink-0">
              <input
                type="checkbox"
                checked={allDay}
                onChange={e => setAllDay(e.target.checked)}
                className="rounded border-gray-300"
              />
              <span className="text-xs text-gray-600">Tutto il giorno</span>
            </label>
          </div>

          {!allDay && (
            <div className="flex items-center gap-3">
              <div className="flex flex-col gap-1 flex-1">
                <label className="text-xs text-gray-500">Inizio</label>
                <input
                  type="time"
                  value={timeStart}
                  onChange={e => setTimeStart(e.target.value)}
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex flex-col gap-1 flex-1">
                <label className="text-xs text-gray-500">Fine</label>
                <input
                  type="time"
                  value={timeEnd}
                  onChange={e => setTimeEnd(e.target.value)}
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          )}

          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500">Progetto</label>
            <select
              value={prjId}
              onChange={e => setPrjId(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">— Nessun progetto (Inbox) —</option>
              {projects.map(p => (
                <option key={p.prj_id} value={p.prj_id}>
                  [{p.prj_ws_code}] {p.prj_code} — {p.prj_label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500">Note / stato di fatto</label>
            <textarea
              placeholder="Es. presenti, stato dei luoghi, esito…"
              value={body}
              onChange={e => setBody(e.target.value)}
              rows={4}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-gray-100">
          <button
            onClick={onCancel}
            disabled={saving}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 font-medium transition-colors disabled:opacity-50"
          >
            Annulla
          </button>
          <button
            onClick={handleSave}
            disabled={!title.trim() || saving}
            className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white text-sm font-medium rounded transition-colors disabled:opacity-50 flex items-center gap-1.5"
          >
            {saving ? (
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              'Salva modifiche'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
