import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { TbRecord } from '../types'
import { RecordDetailModal } from './RecordDetailModal'

const SEEN_KEY = 'tb_digest_seen'
const NOTIF_KEY = 'tb_digest_notify'

function todayKey() { return new Date().toISOString().slice(0, 10) }
function fmt(iso: string | null) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' })
}
function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
}

interface Digest { today: TbRecord[]; overdue: TbRecord[]; events: TbRecord[] }

/** Evento globale per riaprire la splash (es. dal pulsante "Oggi" nell'header). */
export const OPEN_EVENT = 'tb:open-digest'
export function openDailyDigest() { window.dispatchEvent(new Event(OPEN_EVENT)) }

async function fetchDigest(): Promise<Digest> {
  const today = todayKey()
  const dayStart = `${today}T00:00:00`
  const dayEnd = `${today}T23:59:59`
  const [{ data: tasks }, { data: evs }] = await Promise.all([
    supabase
      .from('tb_records')
      .select('*, tb_projects!rec_prj_id ( prj_label ), tb_workspaces!rec_ws_id ( ws_label, ws_color, ws_icon )')
      .eq('rec_kind', 'T')
      .in('rec_status', ['aperto', 'in_progress', 'sospeso'])
      .lte('rec_due_date', dayEnd)
      .order('rec_priority')
      .order('rec_due_date'),
    supabase
      .from('tb_records')
      .select('*, tb_projects!rec_prj_id ( prj_label ), tb_workspaces!rec_ws_id ( ws_label, ws_color, ws_icon )')
      .eq('rec_kind', 'EV')
      .in('rec_status', ['aperto', 'in_progress'])
      .gte('rec_event_start', dayStart)
      .lte('rec_event_start', dayEnd)
      .order('rec_event_start'),
  ])
  const norm = (rows: Record<string, unknown>[] | null) => (rows ?? []).map(r => ({
    ...r,
    prj_label: (r.tb_projects as { prj_label: string } | null)?.prj_label ?? null,
    ws_label: (r.tb_workspaces as { ws_label: string } | null)?.ws_label ?? null,
    ws_color: (r.tb_workspaces as { ws_color: string } | null)?.ws_color ?? null,
    ws_icon: (r.tb_workspaces as { ws_icon: string } | null)?.ws_icon ?? null,
  })) as TbRecord[]
  const all = norm(tasks)
  return {
    today: all.filter(t => (t.rec_due_date ?? '').slice(0, 10) === today),
    overdue: all.filter(t => (t.rec_due_date ?? '').slice(0, 10) < today),
    events: norm(evs),
  }
}

/**
 * Splash della giornata: alla prima apertura del giorno mostra i task in scadenza oggi
 * (più quelli scaduti e gli appuntamenti di oggi). Opzionale: notifica browser.
 */
export function DailyDigest() {
  const [digest, setDigest] = useState<Digest | null>(null)
  const [visible, setVisible] = useState(false)
  const [detail, setDetail] = useState<TbRecord | null>(null)
  const [notifOn, setNotifOn] = useState(() => {
    try { return localStorage.getItem(NOTIF_KEY) === '1' && Notification?.permission === 'granted' } catch { return false }
  })

  // Prima apertura del giorno: carica e mostra (solo se c'è qualcosa), eventuale notifica
  useEffect(() => {
    let seen: string | null = null
    try { seen = localStorage.getItem(SEEN_KEY) } catch { /* ignore */ }
    if (seen === todayKey()) return

    fetchDigest().then(d => {
      if (d.today.length + d.overdue.length + d.events.length === 0) {
        try { localStorage.setItem(SEEN_KEY, todayKey()) } catch { /* ignore */ }
        return
      }
      setDigest(d)
      setVisible(true)
      try {
        if (localStorage.getItem(NOTIF_KEY) === '1' && Notification.permission === 'granted') {
          const parts: string[] = []
          if (d.today.length) parts.push(`${d.today.length} in scadenza oggi`)
          if (d.overdue.length) parts.push(`${d.overdue.length} scadut${d.overdue.length === 1 ? 'o' : 'i'}`)
          if (d.events.length) parts.push(`${d.events.length} appuntament${d.events.length === 1 ? 'o' : 'i'}`)
          new Notification('Taskboard — oggi', { body: parts.join(' · '), icon: '/icon-192.png', tag: 'tb-digest-' + todayKey() })
        }
      } catch { /* ignore */ }
    })
  }, [])

  // Richiamo manuale durante la giornata (pulsante "Oggi" nell'header): mostra sempre, dati freschi
  useEffect(() => {
    const onOpen = () => { fetchDigest().then(d => { setDigest(d); setVisible(true) }) }
    window.addEventListener(OPEN_EVENT, onOpen)
    return () => window.removeEventListener(OPEN_EVENT, onOpen)
  }, [])

  function close() {
    try { localStorage.setItem(SEEN_KEY, todayKey()) } catch { /* ignore */ }
    setVisible(false)
  }

  async function toggleNotif() {
    if (notifOn) {
      try { localStorage.setItem(NOTIF_KEY, '0') } catch { /* ignore */ }
      setNotifOn(false)
      return
    }
    if (!('Notification' in window)) return
    const perm = await Notification.requestPermission()
    if (perm === 'granted') {
      try { localStorage.setItem(NOTIF_KEY, '1') } catch { /* ignore */ }
      setNotifOn(true)
      new Notification('Taskboard', { body: 'Notifiche attivate: riceverai il riepilogo alla prima apertura del giorno.', icon: '/icon-192.png' })
    }
  }

  if (!visible || !digest) return null

  const dateStr = new Date().toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })

  const Row = ({ r, right }: { r: TbRecord; right: string }) => (
    <button
      onClick={() => setDetail(r)}
      className="w-full text-left flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 border border-transparent hover:border-gray-200"
    >
      <span className="w-1.5 h-8 rounded-full shrink-0" style={{ backgroundColor: r.ws_color ?? '#9E9E9E' }} />
      <div className="flex-1 min-w-0">
        <div className="text-sm text-gray-900 truncate">
          {r.rec_priority === 1 && <span className="text-red-600 mr-1">●</span>}
          {r.rec_title}
        </div>
        <div className="text-xs text-gray-400 truncate">{r.rec_code ?? ''}{r.prj_label ? ` · ${r.prj_label}` : r.rec_bucket === 'small_tasks' ? ' · small task' : ''}</div>
      </div>
      <span className="text-xs font-medium shrink-0 text-gray-500">{right}</span>
    </button>
  )

  // Mentre la scheda dettaglio è aperta la splash si nasconde (altrimenti resterebbe sopra, z-55 > z-50)
  if (detail) {
    return <RecordDetailModal record={detail} onClose={() => setDetail(null)} />
  }

  return (
    <>
      <div className="fixed inset-0 z-[55] flex items-center justify-center bg-black/50 px-4" onClick={e => { if (e.target === e.currentTarget) close() }}>
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden max-h-[85vh] flex flex-col">
          <div className="px-5 py-4 text-white" style={{ background: 'linear-gradient(135deg,#1E1E2E,#2D3A5C)' }}>
            <div className="text-xs uppercase tracking-wide opacity-70">Buongiorno — {dateStr}</div>
            <div className="text-lg font-bold mt-0.5">
              {digest.today.length > 0
                ? `${digest.today.length} task scad${digest.today.length === 1 ? 'e' : 'ono'} oggi`
                : 'Nessun task in scadenza oggi'}
            </div>
            <div className="text-xs opacity-80 mt-0.5">
              {[
                digest.overdue.length ? `${digest.overdue.length} già scadut${digest.overdue.length === 1 ? 'o' : 'i'}` : null,
                digest.events.length ? `${digest.events.length} appuntament${digest.events.length === 1 ? 'o' : 'i'}` : null,
              ].filter(Boolean).join(' · ')}
            </div>
          </div>

          <div className="px-3 py-3 overflow-y-auto flex flex-col gap-3">
            {digest.today.length + digest.overdue.length + digest.events.length === 0 && (
              <div className="text-center py-8 text-gray-500 text-sm">
                <div className="text-3xl mb-2">🎉</div>
                Nessuna scadenza, nessun ritardo e nessun appuntamento per oggi.
              </div>
            )}
            {digest.today.length > 0 && (
              <section>
                <div className="px-3 text-[10px] uppercase tracking-wide text-orange-700 font-semibold mb-1">🎯 Scadono oggi</div>
                {digest.today.map(r => <Row key={r.rec_id} r={r} right="oggi" />)}
              </section>
            )}
            {digest.events.length > 0 && (
              <section>
                <div className="px-3 text-[10px] uppercase tracking-wide text-blue-700 font-semibold mb-1">📅 Appuntamenti di oggi</div>
                {digest.events.map(r => <Row key={r.rec_id} r={r} right={r.rec_event_start ? fmtTime(r.rec_event_start) : ''} />)}
              </section>
            )}
            {digest.overdue.length > 0 && (
              <section>
                <div className="px-3 text-[10px] uppercase tracking-wide text-red-700 font-semibold mb-1">⚠️ Scaduti</div>
                {digest.overdue.map(r => <Row key={r.rec_id} r={r} right={`scad. ${fmt(r.rec_due_date)}`} />)}
              </section>
            )}
          </div>

          <div className="px-5 py-3 border-t border-gray-100 bg-gray-50 flex items-center gap-3">
            <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer select-none">
              <input type="checkbox" checked={notifOn} onChange={toggleNotif} className="rounded border-gray-300" />
              🔔 Notifica browser al primo accesso del giorno
            </label>
            <button onClick={close} className="ml-auto px-4 py-1.5 bg-blue-700 hover:bg-blue-800 text-white text-sm font-medium rounded-lg">
              Inizia la giornata
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
