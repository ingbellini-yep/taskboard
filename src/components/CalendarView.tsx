import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useGoogleCalendar } from '../hooks/useGoogleCalendar'
import { NewEventModal } from './NewEventModal'
import type { GoogleEvent } from '../lib/googleCalendar'

/* ─── Tipi ─────────────────────────────────────────────── */

interface TbEvent {
  id: string
  recCode: string | null
  title: string
  startIso: string
  endIso: string | null
  wsColor: string
  prjLabel: string | null
}

interface UnifiedEvent {
  id: string
  title: string
  startIso: string
  endIso: string | null
  isAllDay: boolean
  source: 'google' | 'taskboard'
  color: string
  subtitle: string | null
  recCode?: string | null
  location?: string
}

type ViewMode = 'lista' | 'griglia'

/* ─── Utilità data ──────────────────────────────────────── */

const IT_DAYS = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom']
const IT_MONTHS = [
  'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
  'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre',
]

function monthStart(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1)
}
function monthEnd(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 1)
}
function addMonths(d: Date, n: number) {
  return new Date(d.getFullYear(), d.getMonth() + n, 1)
}
function isoToDateKey(iso: string): string {
  return iso.slice(0, 10)
}
function formatTime(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
}
function isToday(dateKey: string): boolean {
  return dateKey === new Date().toISOString().slice(0, 10)
}
function isPast(dateKey: string): boolean {
  return dateKey < new Date().toISOString().slice(0, 10)
}
function formatDayHeader(dateKey: string): string {
  const d = new Date(dateKey + 'T00:00:00')
  const weekday = IT_DAYS[(d.getDay() + 6) % 7]
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const yyyy = d.getFullYear()
  return `${weekday} ${dd}/${mm}/${yyyy}`
}

/* ─── Fetch eventi Taskboard ────────────────────────────── */

async function fetchTbEvents(from: Date, to: Date): Promise<TbEvent[]> {
  const { data } = await supabase
    .from('tb_records')
    .select(`
      rec_id, rec_code, rec_title, rec_event_start, rec_event_end, rec_ws_code,
      tb_workspaces!rec_ws_id ( ws_color ),
      tb_projects!rec_prj_id ( prj_label )
    `)
    .eq('rec_kind', 'EV')
    .not('rec_status', 'in', '("chiuso","archiviato")')
    .gte('rec_event_start', from.toISOString())
    .lt('rec_event_start', to.toISOString())
    .order('rec_event_start')

  return (data ?? []).map((r: Record<string, unknown>) => ({
    id: r.rec_id as string,
    recCode: r.rec_code as string | null,
    title: r.rec_title as string,
    startIso: r.rec_event_start as string,
    endIso: r.rec_event_end as string | null,
    wsColor: (r.tb_workspaces as { ws_color?: string } | null)?.ws_color ?? '#718096',
    prjLabel: (r.tb_projects as { prj_label?: string } | null)?.prj_label ?? null,
  }))
}

/* ─── Componente principale ─────────────────────────────── */

export function CalendarView() {
  const gc = useGoogleCalendar()
  const [viewMode, setViewMode] = useState<ViewMode>('lista')
  const [currentMonth, setCurrentMonth] = useState(() => monthStart(new Date()))
  const [tbEvents, setTbEvents] = useState<TbEvent[]>([])
  const [showNewEvent, setShowNewEvent] = useState(false)

  const tMin = monthStart(currentMonth)
  const tMax = monthEnd(currentMonth)

  // Carica eventi TB quando cambia mese
  const loadTb = useCallback(async () => {
    const evs = await fetchTbEvents(tMin, tMax)
    setTbEvents(evs)
  }, [currentMonth]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { loadTb() }, [loadTb])

  // Carica eventi Google quando cambia mese o calendari selezionati
  useEffect(() => {
    if (gc.isAuthenticated && gc.selectedCalendars.length > 0) {
      gc.loadEvents(tMin, tMax)
    }
  }, [gc.isAuthenticated, gc.selectedCalendars, currentMonth]) // eslint-disable-line react-hooks/exhaustive-deps

  // Costruisce lista unificata
  const allEvents: UnifiedEvent[] = [
    ...gc.events.map((e: GoogleEvent) => {
      const cal = gc.calendars.find(c => c.id === e.calendarId)
      return {
        id: `g-${e.id}`,
        title: e.summary || '(senza titolo)',
        startIso: e.start.dateTime || `${e.start.date}T00:00:00` || '',
        endIso: e.end?.dateTime || null,
        isAllDay: !e.start.dateTime,
        source: 'google' as const,
        color: cal?.backgroundColor || '#4285f4',
        subtitle: cal?.summary ?? null,
        location: e.location,
      }
    }),
    ...tbEvents.map(e => ({
      id: `tb-${e.id}`,
      title: e.title,
      startIso: e.startIso,
      endIso: e.endIso,
      isAllDay: false,
      source: 'taskboard' as const,
      color: e.wsColor,
      subtitle: e.prjLabel,
      recCode: e.recCode,
    })),
  ].sort((a, b) => a.startIso.localeCompare(b.startIso))

  // Raggruppa per giorno (YYYY-MM-DD)
  const byDay = new Map<string, UnifiedEvent[]>()
  for (const ev of allEvents) {
    const key = isoToDateKey(ev.startIso)
    if (!byDay.has(key)) byDay.set(key, [])
    byDay.get(key)!.push(ev)
  }
  const sortedDays = Array.from(byDay.keys()).sort()

  return (
    <div className="flex flex-col gap-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Navigazione mese */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentMonth(m => addMonths(m, -1))}
            className="w-8 h-8 flex items-center justify-center rounded border border-gray-200 hover:bg-gray-100 text-gray-600 text-sm transition-colors"
          >
            ‹
          </button>
          <span className="font-semibold text-gray-800 text-sm min-w-[130px] text-center">
            {IT_MONTHS[currentMonth.getMonth()]} {currentMonth.getFullYear()}
          </span>
          <button
            onClick={() => setCurrentMonth(m => addMonths(m, 1))}
            className="w-8 h-8 flex items-center justify-center rounded border border-gray-200 hover:bg-gray-100 text-gray-600 text-sm transition-colors"
          >
            ›
          </button>
          <button
            onClick={() => setCurrentMonth(monthStart(new Date()))}
            className="ml-1 px-3 py-1.5 text-xs border border-gray-200 rounded hover:bg-gray-100 text-gray-500 transition-colors"
          >
            Oggi
          </button>
        </div>

        <div className="flex items-center gap-2">
          {/* Toggle vista */}
          <div className="flex rounded-lg border border-gray-200 overflow-hidden">
            <button
              onClick={() => setViewMode('lista')}
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                viewMode === 'lista' ? 'bg-blue-700 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'
              }`}
            >
              📋 Lista
            </button>
            <button
              onClick={() => setViewMode('griglia')}
              className={`px-3 py-1.5 text-xs font-medium border-l border-gray-200 transition-colors ${
                viewMode === 'griglia' ? 'bg-blue-700 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'
              }`}
            >
              📅 Griglia
            </button>
          </div>

          {/* Nuovo evento */}
          <button
            onClick={() => setShowNewEvent(true)}
            className="px-3 py-1.5 bg-blue-700 hover:bg-blue-800 text-white text-xs font-medium rounded-lg transition-colors"
          >
            + Evento
          </button>
        </div>
      </div>

      {/* Filtro calendari Google */}
      {gc.isAuthenticated && gc.calendars.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-gray-400 uppercase tracking-wide">Calendari</span>
          {gc.calendars.map(cal => {
            const active = gc.selectedCalendars.includes(cal.id)
            return (
              <button
                key={cal.id}
                onClick={() => gc.toggleCalendar(cal.id)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                  active ? 'border-transparent text-white' : 'border-gray-200 text-gray-500 bg-white'
                }`}
                style={active ? { backgroundColor: cal.backgroundColor } : {}}
              >
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: active ? 'rgba(255,255,255,0.7)' : cal.backgroundColor }}
                />
                {cal.summary}
              </button>
            )
          })}
        </div>
      )}

      {/* Banner login Google */}
      {!gc.isAuthenticated && (
        <div className="flex items-center justify-between bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
          <div>
            <p className="text-sm font-medium text-blue-800">Connetti Google Calendar</p>
            <p className="text-xs text-blue-600 mt-0.5">Visualizza i tuoi eventi Google insieme a quelli Taskboard</p>
          </div>
          <button
            onClick={gc.login}
            disabled={gc.loading}
            className="shrink-0 ml-4 px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {gc.loading ? (
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Accedi con Google
              </>
            )}
          </button>
        </div>
      )}

      {/* Loading */}
      {gc.loading && (
        <div className="flex justify-center py-4">
          <span className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Vista Lista */}
      {viewMode === 'lista' && (
        <ListaView sortedDays={sortedDays} byDay={byDay} />
      )}

      {/* Vista Griglia */}
      {viewMode === 'griglia' && (
        <GrigliaView currentMonth={currentMonth} byDay={byDay} />
      )}

      {/* Modali */}
      {showNewEvent && (
        <NewEventModal
          isGoogleAuthenticated={gc.isAuthenticated}
          googleCalendars={gc.calendars}
          onClose={() => { setShowNewEvent(false); loadTb() }}
        />
      )}
    </div>
  )
}

/* ─── Vista Lista ───────────────────────────────────────── */

function ListaView({ sortedDays, byDay }: { sortedDays: string[]; byDay: Map<string, UnifiedEvent[]> }) {
  if (sortedDays.length === 0) {
    return (
      <div className="text-center py-16 text-gray-400">
        <div className="text-4xl mb-3">📅</div>
        <p className="text-sm">Nessun evento in questo mese</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {sortedDays.map(dateKey => {
        const events = byDay.get(dateKey)!
        const today = isToday(dateKey)
        const past = isPast(dateKey)
        return (
          <div key={dateKey}>
            {/* Header giorno */}
            <div className="flex items-center gap-2 mb-2">
              <div
                className={`w-2 h-2 rounded-full ${today ? 'bg-blue-600' : past ? 'bg-gray-300' : 'bg-gray-400'}`}
              />
              <span
                className={`text-xs font-semibold uppercase tracking-wide ${
                  today ? 'text-blue-600' : past ? 'text-gray-400' : 'text-gray-600'
                }`}
              >
                {today ? `Oggi — ${formatDayHeader(dateKey)}` : formatDayHeader(dateKey)}
              </span>
            </div>

            {/* Eventi del giorno */}
            <div className="flex flex-col gap-1.5 ml-4">
              {events.map(ev => (
                <EventRow key={ev.id} ev={ev} />
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function EventRow({ ev }: { ev: UnifiedEvent }) {
  return (
    <div
      className="flex items-start gap-3 bg-white border border-gray-100 rounded-lg px-3 py-2.5 shadow-sm"
      style={{ borderLeftColor: ev.color, borderLeftWidth: 3 }}
    >
      {/* Orario */}
      <div className="w-24 shrink-0 text-xs text-gray-500 pt-0.5">
        {ev.isAllDay ? (
          <span className="text-gray-400 italic">Tutto il giorno</span>
        ) : (
          <>
            {formatTime(ev.startIso)}
            {ev.endIso && <span className="text-gray-400"> → {formatTime(ev.endIso)}</span>}
          </>
        )}
      </div>

      {/* Titolo + info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          {ev.source === 'taskboard' && (
            <span
              className="text-xs px-1.5 py-0.5 rounded font-medium text-white shrink-0"
              style={{ backgroundColor: ev.color }}
            >
              TB
            </span>
          )}
          <span className="text-sm font-medium text-gray-800 truncate">{ev.title}</span>
        </div>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          {ev.subtitle && (
            <span className="text-xs text-gray-400">{ev.subtitle}</span>
          )}
          {ev.recCode && (
            <span className="text-xs font-mono text-gray-400">{ev.recCode}</span>
          )}
          {ev.location && (
            <span className="text-xs text-gray-400">📍 {ev.location}</span>
          )}
        </div>
      </div>
    </div>
  )
}

/* ─── Vista Griglia ─────────────────────────────────────── */

function GrigliaView({ currentMonth, byDay }: { currentMonth: Date; byDay: Map<string, UnifiedEvent[]> }) {
  const [expandedDay, setExpandedDay] = useState<string | null>(null)
  const year = currentMonth.getFullYear()
  const month = currentMonth.getMonth()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  // Offset: primo giorno del mese (0=Lun, 6=Dom)
  const firstDayOfWeek = (new Date(year, month, 1).getDay() + 6) % 7
  const totalCells = Math.ceil((firstDayOfWeek + daysInMonth) / 7) * 7

  const cells: (number | null)[] = Array.from({ length: totalCells }, (_, i) => {
    const day = i - firstDayOfWeek + 1
    return day >= 1 && day <= daysInMonth ? day : null
  })

  const todayKey = new Date().toISOString().slice(0, 10)

  return (
    <div className="flex flex-col gap-0">
      {/* Intestazioni giorni */}
      <div className="grid grid-cols-7 border border-gray-200 rounded-t-lg overflow-hidden">
        {IT_DAYS.map(d => (
          <div
            key={d}
            className="text-center text-xs font-semibold text-gray-500 py-2 border-r border-gray-200 last:border-r-0 bg-gray-50"
          >
            {d}
          </div>
        ))}
      </div>

      {/* Celle */}
      <div className="grid grid-cols-7 border-l border-b border-gray-200 rounded-b-lg overflow-hidden">
        {cells.map((day, idx) => {
          if (day === null) {
            return <div key={idx} className="border-r border-t border-gray-100 bg-gray-50 min-h-[80px]" />
          }

          const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
          const dayEvents = byDay.get(dateKey) ?? []
          const isT = dateKey === todayKey
          const isPastDay = dateKey < todayKey
          const isExpanded = expandedDay === dateKey
          const MAX_PILLS = 2
          const extra = dayEvents.length - MAX_PILLS

          return (
            <div
              key={idx}
              className={`border-r border-t border-gray-200 min-h-[80px] p-1.5 cursor-pointer transition-colors ${
                isT ? 'bg-blue-50' : isPastDay ? 'bg-white' : 'bg-white hover:bg-gray-50'
              }`}
              onClick={() => setExpandedDay(isExpanded ? null : dateKey)}
            >
              {/* Numero giorno */}
              <div className={`text-xs font-semibold mb-1 w-6 h-6 flex items-center justify-center rounded-full ${
                isT ? 'bg-blue-600 text-white' : isPastDay ? 'text-gray-400' : 'text-gray-700'
              }`}>
                {day}
              </div>

              {/* Pills eventi */}
              {dayEvents.slice(0, MAX_PILLS).map(ev => (
                <div
                  key={ev.id}
                  className="text-white text-xs rounded px-1 py-0.5 mb-0.5 truncate"
                  style={{ backgroundColor: ev.color }}
                  title={ev.title}
                >
                  {!ev.isAllDay && <span className="opacity-80 mr-1">{formatTime(ev.startIso)}</span>}
                  {ev.title}
                </div>
              ))}
              {extra > 0 && (
                <div className="text-xs text-gray-400 pl-1">+{extra} altri</div>
              )}
            </div>
          )
        })}
      </div>

      {/* Dettaglio giorno espanso */}
      {expandedDay && byDay.has(expandedDay) && (
        <div className="mt-4 bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="font-semibold text-gray-800 text-sm">{formatDayHeader(expandedDay)}</span>
            <button
              onClick={() => setExpandedDay(null)}
              className="text-gray-400 hover:text-gray-600 text-sm"
            >
              ×
            </button>
          </div>
          <div className="flex flex-col gap-1.5">
            {byDay.get(expandedDay)!.map(ev => (
              <EventRow key={ev.id} ev={ev} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
