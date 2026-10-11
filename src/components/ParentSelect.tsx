import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { TbRecord } from '../types'
import { descendantIds, kindTag } from '../lib/recordTree'

interface Props {
  record: TbRecord
  value: string | null
  onChange: (parentId: string | null) => void
}

/** Select del record padre tra quelli dello stesso progetto (esclusi sé stesso e i discendenti). */
export function ParentSelect({ record, value, onChange }: Props) {
  const [candidates, setCandidates] = useState<TbRecord[]>([])

  useEffect(() => {
    if (!record.rec_prj_id) { setCandidates([]); return }
    supabase
      .from('tb_records')
      .select('rec_id, rec_code, rec_title, rec_kind, rec_status, rec_parent_id, rec_created_at')
      .eq('rec_prj_id', record.rec_prj_id)
      .order('rec_created_at', { ascending: true })
      .then(({ data }) => {
        const all = (data ?? []) as TbRecord[]
        const excluded = descendantIds(all, record.rec_id)
        excluded.add(record.rec_id)
        setCandidates(all.filter(r => !excluded.has(r.rec_id)))
      })
  }, [record.rec_prj_id, record.rec_id])

  if (!record.rec_prj_id) return null

  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs text-gray-500">Dipende da (record padre)</label>
      <select
        value={value ?? ''}
        onChange={e => onChange(e.target.value || null)}
        className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <option value="">— Nessuno (radice dell'albero) —</option>
        {candidates.map(c => (
          <option key={c.rec_id} value={c.rec_id}>
            [{kindTag(c.rec_kind)}] {c.rec_code ? c.rec_code + ' — ' : ''}{c.rec_title}
          </option>
        ))}
      </select>
    </div>
  )
}
