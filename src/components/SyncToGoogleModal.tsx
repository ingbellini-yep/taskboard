import { useEffect, useState } from 'react'
import { createGoogleEvent } from '../lib/googleCalendar'
import { supabase } from '../lib/supabase'
import type { Calendar } from '../lib/googleCalendar'

interface Props {
  recId: string
  recTitle: string
  recCode: string | null
  eventStart: string
  eventEnd: string | null
  calendars: Calendar[]
  onDone: () => void
  onSkip: () => void
}

function formatPreviewDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' }) +
    ' ore ' + d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
}

export function SyncToGoogleModal({
  recId, recTitle, recCode, eventStart, eventEnd, calendars, onDone, onSkip
}: Props) {
  const [selectedCalId, setSelectedCalId] = useState<string>(() =>
    calendars.find(c => c.primary)?.id ?? calendars[0]?.id ?? ''
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape') onSkip() }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onSkip])

  async function handleAdd() {
    if (!selectedCalId) return
    setSaving(true)
    setError(null)
    try {
      const endIso = eventEnd || eventStart
      const googleId = await createGoogleEvent(selectedCalId, {
        summary: recTitle,
        description: recCode ? `Taskboard: ${recCode}` : undefined,
        start: eventStart,
        end: endIso,
      })
      // Salva google event id su Supabase
      await supabase
        .from('tb_records')
        .update({ rec_google_event_id: googleId })
        .eq('rec_id', recId)
      onDone()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Errore sync Google Calendar')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={e => { if (e.target === e.currentTarget) onSkip() }}
    >
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <span className="font-semibold text-gray-900">📅 Aggiungi a Google Calendar?</span>
          <button onClick={onSkip} className="text-gray-400 hover:text-gray-600 text-lg leading-none">×</button>
        </div>

        <div className="px-5 py-5 flex flex-col gap-4">
          <div>
            <p className="text-sm font-medium text-gray-800 leading-snug">{recTitle}</p>
            <p className="text-xs text-gray-400 mt-0.5">{formatPreviewDate(eventStart)}</p>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              Seleziona calendario
            </label>
            <div className="flex flex-col gap-1.5 max-h-40 overflow-y-auto">
              {calendars.map(cal => (
                <label
                  key={cal.id}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg border cursor-pointer transition-colors ${
                    selectedCalId === cal.id
                      ? 'border-blue-300 bg-blue-50'
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="cal"
                    value={cal.id}
                    checked={selectedCalId === cal.id}
                    onChange={() => setSelectedCalId(cal.id)}
                    className="sr-only"
                  />
                  <span
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ backgroundColor: cal.backgroundColor }}
                  />
                  <span className="text-sm text-gray-700">{cal.summary}</span>
                </label>
              ))}
            </div>
          </div>

          {error && (
            <p className="text-xs text-red-600">{error}</p>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-gray-100">
          <button
            onClick={onSkip}
            disabled={saving}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 font-medium transition-colors disabled:opacity-50"
          >
            Salta
          </button>
          <button
            onClick={handleAdd}
            disabled={saving || !selectedCalId}
            className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white text-sm font-medium rounded transition-colors disabled:opacity-50 flex items-center gap-1.5"
          >
            {saving ? (
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              'Aggiungi ✓'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
