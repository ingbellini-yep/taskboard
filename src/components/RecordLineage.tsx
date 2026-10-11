import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { TbRecord } from '../types'
import { kindTag, statusIt } from '../lib/recordTree'

/** Mostra padre e figli di un record nella scheda dettaglio. */
export function RecordLineage({ record }: { record: TbRecord }) {
  const [parent, setParent] = useState<TbRecord | null>(null)
  const [children, setChildren] = useState<TbRecord[]>([])

  useEffect(() => {
    let alive = true
    const load = async () => {
      const [{ data: p }, { data: c }] = await Promise.all([
        record.rec_parent_id
          ? supabase.from('tb_records').select('rec_id, rec_code, rec_title, rec_kind, rec_status').eq('rec_id', record.rec_parent_id).maybeSingle()
          : Promise.resolve({ data: null }),
        supabase.from('tb_records').select('rec_id, rec_code, rec_title, rec_kind, rec_status, rec_created_at').eq('rec_parent_id', record.rec_id).order('rec_created_at'),
      ])
      if (!alive) return
      setParent((p as TbRecord | null) ?? null)
      setChildren((c ?? []) as TbRecord[])
    }
    load()
    return () => { alive = false }
  }, [record.rec_id, record.rec_parent_id])

  if (!parent && children.length === 0) return null

  const Row = ({ r }: { r: TbRecord }) => (
    <div className="flex items-center gap-2 text-sm">
      <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-200 text-gray-700 font-bold">{kindTag(r.rec_kind)}</span>
      {r.rec_code && <span className="font-mono text-xs text-gray-400">{r.rec_code}</span>}
      <span className="text-gray-800 truncate">{r.rec_title}</span>
      <span className="text-xs text-gray-400 ml-auto shrink-0">{statusIt(r.rec_status)}</span>
    </div>
  )

  return (
    <div className="flex flex-col gap-2 pt-1 border-t border-gray-100">
      <span className="text-xs text-gray-400 uppercase tracking-wide">Dipendenze</span>
      {parent && (
        <div className="bg-gray-50 border border-gray-100 rounded-lg px-3 py-2">
          <div className="text-[10px] text-gray-400 uppercase tracking-wide mb-1">↑ Dipende da</div>
          <Row r={parent} />
        </div>
      )}
      {children.length > 0 && (
        <div className="bg-gray-50 border border-gray-100 rounded-lg px-3 py-2 flex flex-col gap-1">
          <div className="text-[10px] text-gray-400 uppercase tracking-wide mb-0.5">↓ Figli ({children.length})</div>
          {children.map(c => <Row key={c.rec_id} r={c} />)}
        </div>
      )}
    </div>
  )
}
