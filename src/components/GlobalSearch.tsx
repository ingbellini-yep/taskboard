import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { TbRecord, Project } from '../types'
import { kindTag, statusIt } from '../lib/recordTree'
import { RecordDetailModal } from './RecordDetailModal'

interface Props {
  onOpenProject: (prjId: string) => void
}

/** Ricerca globale di task/memo/eventi e progetti (titolo, note, codice). */
export function GlobalSearch({ onOpenProject }: Props) {
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const [records, setRecords] = useState<TbRecord[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [detail, setDetail] = useState<TbRecord | null>(null)
  const boxRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const term = q.trim()
    if (term.length < 2) { setRecords([]); setProjects([]); return }
    const h = setTimeout(async () => {
      const like = `%${term}%`
      const [{ data: recs }, { data: prjs }] = await Promise.all([
        supabase
          .from('tb_records')
          .select('*, tb_projects!rec_prj_id ( prj_label ), tb_workspaces!rec_ws_id ( ws_label, ws_color, ws_icon )')
          .or(`rec_title.ilike.${like},rec_body.ilike.${like},rec_code.ilike.${like}`)
          .order('rec_created_at', { ascending: false })
          .limit(12),
        supabase
          .from('tb_projects')
          .select('*')
          .or(`prj_label.ilike.${like},prj_code.ilike.${like},prj_client.ilike.${like}`)
          .limit(6),
      ])
      setRecords((recs ?? []).map((r: Record<string, unknown>) => ({
        ...r,
        prj_label: (r.tb_projects as { prj_label: string } | null)?.prj_label ?? null,
        ws_label: (r.tb_workspaces as { ws_label: string } | null)?.ws_label ?? null,
        ws_color: (r.tb_workspaces as { ws_color: string } | null)?.ws_color ?? null,
        ws_icon: (r.tb_workspaces as { ws_icon: string } | null)?.ws_icon ?? null,
      })) as TbRecord[])
      setProjects((prjs ?? []) as Project[])
    }, 250)
    return () => clearTimeout(h)
  }, [q])

  useEffect(() => {
    const onDoc = (e: MouseEvent) => { if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  const hasResults = records.length > 0 || projects.length > 0

  return (
    <div ref={boxRef} className="relative w-full max-w-md">
      <input
        value={q}
        onChange={e => { setQ(e.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)}
        placeholder="🔍 Cerca task, memo, eventi, progetti…"
        className="w-full rounded-lg px-3 py-1.5 text-sm bg-white/10 text-white placeholder-gray-400 border border-white/10 focus:outline-none focus:bg-white focus:text-gray-900 focus:placeholder-gray-400 transition-colors"
      />
      {open && q.trim().length >= 2 && (
        <div className="absolute z-40 mt-1 w-full bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden max-h-[70vh] overflow-y-auto">
          {!hasResults && <div className="px-4 py-3 text-sm text-gray-400">Nessun risultato</div>}
          {projects.length > 0 && (
            <div>
              <div className="px-3 py-1.5 text-[10px] uppercase tracking-wide text-gray-400 bg-gray-50">Progetti</div>
              {projects.map(p => (
                <button
                  key={p.prj_id}
                  onClick={() => { onOpenProject(p.prj_id); setOpen(false); setQ('') }}
                  className="w-full text-left px-3 py-2 hover:bg-blue-50 flex items-center gap-2"
                >
                  <span className="text-xs font-mono text-gray-400">{p.prj_code}</span>
                  <span className="text-sm text-gray-900 truncate">{p.prj_label}</span>
                  <span className="text-xs text-gray-400 ml-auto">{p.prj_ws_code}</span>
                </button>
              ))}
            </div>
          )}
          {records.length > 0 && (
            <div>
              <div className="px-3 py-1.5 text-[10px] uppercase tracking-wide text-gray-400 bg-gray-50">Record</div>
              {records.map(r => (
                <button
                  key={r.rec_id}
                  onClick={() => { setDetail(r); setOpen(false) }}
                  className="w-full text-left px-3 py-2 hover:bg-blue-50 flex items-center gap-2"
                >
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-200 text-gray-700 font-bold shrink-0">{kindTag(r.rec_kind)}</span>
                  {r.rec_code && <span className="text-xs font-mono text-gray-400 shrink-0">{r.rec_code}</span>}
                  <span className="text-sm text-gray-900 truncate">{r.rec_title}</span>
                  <span className="text-xs text-gray-400 ml-auto shrink-0">{r.prj_label ?? (r.rec_bucket === 'small_tasks' ? 'small task' : 'inbox')} · {statusIt(r.rec_status)}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
      {detail && <RecordDetailModal record={detail} onClose={() => setDetail(null)} />}
    </div>
  )
}
