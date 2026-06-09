import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useProjects } from '../hooks/useProjects'
import type { Calendar } from '../lib/googleCalendar'
import {
  ensureSignedIn, resolveDefaultCalendarId, createGoogleEvent, setPreferredCalendarId,
} from '../lib/googleCalendar'

interface Props {
  isGoogleAuthenticated: boolean
  googleCalendars: Calendar[]
  defaultDate?: string   // YYYY-MM-DD
  onClose: () => void
}

export function NewEventModal({ defaultDate, onClose }: Props) {
  const { projects } = useProjects()
  const titleRef = useRef<HTMLInputElement>(null)

  const today = defaultDate ?? new Date().toISOString().slice(0, 10)
  const [title, setTitle] = useState('')
  const [date, setDate] = useState(today)
  const [timeStart, setTimeStart] = useState('09:00')
  const [timeEnd, setTimeEnd] = useState('10:00')
  const [allDay, setAllDay] = useState(false)
  const [body, setBody] = useState('')
  const [prjId, setPrjId] = useState('')
  const [syncGoogle, setSyncGoogle] = useState(true)   // ON di default
  const [saving, setSaving] = useState(false)
  const [warning, setWarning] = useState<string | null>(null)

  useEffect(() => {
    titleRef.current?.focus()
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  async function handleSave() {
    if (!title.trim() || saving) return
    setSaving(true)
    setWarning(null)

    const eventStart = allDay ? `${date}T00:00:00` : `${date}T${timeStart}:00`
    const eventEnd = allDay ? `${date}T23:59:00` : `${date}T${timeEnd}:00`
    const selectedPrj = projects.find(p => p.prj_id === prjId)

    const payload: Record<string, unknown> = {
      rec_title: title.trim(),
      rec_kind: 'EV',
      rec_status: 'aperto',
      rec_bucket: selectedPrj ? 'project' : 'inbox',
      rec_priority: 2,
      rec_event_start: eventStart,
      rec_event_end: allDay ? null : eventEnd,
      rec_body: body.trim() || null,
    }

    if (selectedPrj) {
      payload.rec_prj_id = selectedPrj.prj_id
      payload.rec_prj_code = selectedPrj.prj_code
      payload.rec_ws_id = selectedPrj.prj_ws_id
      payload.rec_ws_code = selectedPrj.prj_ws_code
    }

    const { data, error } = await supabase
      .from('tb_records')
      .insert(payload)
      .select('rec_id, rec_code')
      .single()

    if (error || !data) {
      setSaving(false)
      setWarning('Errore nel salvataggio dell\'evento.')
      return
    }

    // Sync Google Calendar (non bloccante): login al volo se necessario
    if (syncGoogle) {
      try {
        await ensureSignedIn()
        const calId = await resolveDefaultCalendarId()
        setPreferredCalendarId(calId)
        const googleId = await createGoogleEvent(calId, {
          summary: title.trim(),
          description: [data.rec_code ? `Taskboard: ${data.rec_code}` : null, body.trim() || null]
            .filter(Boolean).join('\n') || undefined,
          start: eventStart,
          end: eventEnd,
          allDay,
        })
        await supabase
          .from('tb_records')
          .update({ rec_google_event_id: googleId })
          .eq('rec_id', data.rec_id)
      } catch (e: unknown) {
        // Non bloccante: l'evento è già salvato su Supabase
        setSaving(false)
        setWarning(
          'Evento salvato, ma sync Google fallito: ' +
          (e instanceof Error ? e.message : 'errore sconosciuto')
        )
        // Chiude comunque dopo un attimo così l'utente vede l'avviso
        setTimeout(onClose, 2200)
        return
      }
    }

    setSaving(false)
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <span className="font-semibold text-gray-900">📅 Nuovo Evento</span>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg leading-none">×</button>
        </div>

        <div className="px-5 py-5 flex flex-col gap-4">
          {/* Titolo */}
          <input
            ref={titleRef}
            type="text"
            placeholder="Titolo evento…"
            value={title}
            onChange={e => setTitle(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleSave() }}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />

          {/* Data */}
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

          {/* Orari */}
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

          {/* Progetto opzionale */}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500">Progetto (opzionale)</label>
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

          {/* Note */}
          <textarea
            placeholder="Note (opzionale)…"
            value={body}
            onChange={e => setBody(e.target.value)}
            rows={2}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />

          {/* Toggle sync Google Calendar */}
          <label className="flex items-center gap-2.5 cursor-pointer select-none">
            <button
              type="button"
              role="switch"
              aria-checked={syncGoogle}
              onClick={() => setSyncGoogle(s => !s)}
              className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${
                syncGoogle ? 'bg-blue-600' : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  syncGoogle ? 'translate-x-4' : 'translate-x-0.5'
                }`}
              />
            </button>
            <span className="text-sm text-gray-700">📅 Aggiungi a Google Calendar</span>
          </label>

          {syncGoogle && (
            <p className="text-xs text-gray-400 -mt-2">
              Se non sei connesso, ti verrà chiesto l'accesso Google al salvataggio.
            </p>
          )}

          {warning && (
            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              ⚠️ {warning}
            </p>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-gray-100">
          <button
            onClick={onClose}
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
              syncGoogle ? 'Salva + Google 📅' : 'Salva evento'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
