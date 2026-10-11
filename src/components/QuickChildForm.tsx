import { useState } from 'react'
import { supabase } from '../lib/supabase'
import type { TbRecord } from '../types'

export interface TreeProject { prj_id: string; prj_code: string; prj_ws_id: string; prj_ws_code: string }

/** Form inline per creare un task/memo che dipende da `parent` (stesso progetto). */
export function QuickChildForm({ parent, project, onDone, onCancel }: {
  parent: TbRecord
  project: TreeProject
  onDone: () => void
  onCancel: () => void
}) {
  const [kind, setKind] = useState<'T' | 'M'>('T')
  const [title, setTitle] = useState('')
  const [saving, setSaving] = useState(false)

  async function save() {
    if (!title.trim() || saving) return
    setSaving(true)
    const { data: code } = await supabase.rpc('tb_generate_record_code', { p_prj_id: project.prj_id, p_kind: kind })
    await supabase.from('tb_records').insert({
      rec_prj_id: project.prj_id, rec_prj_code: project.prj_code,
      rec_ws_id: project.prj_ws_id, rec_ws_code: project.prj_ws_code,
      rec_code: code, rec_kind: kind, rec_title: title.trim(),
      rec_status: 'aperto', rec_priority: 2, rec_bucket: 'project',
      rec_parent_id: parent.rec_id, rec_source: 'web',
    })
    setSaving(false)
    onDone()
  }

  return (
    <div className="border border-blue-200 bg-blue-50 rounded-lg p-2 flex flex-wrap gap-2 items-center">
      <span className="text-xs text-gray-500">Nuovo figlio di <b>{parent.rec_code ?? parent.rec_title}</b>:</span>
      <select value={kind} onChange={e => setKind(e.target.value as 'T' | 'M')} className="border border-gray-200 rounded px-2 py-1 text-xs bg-white">
        <option value="T">Task</option>
        <option value="M">Memo</option>
      </select>
      <input
        autoFocus value={title} onChange={e => setTitle(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') onCancel() }}
        placeholder="Titolo…"
        className="border border-gray-200 rounded px-2 py-1 text-xs bg-white flex-1 min-w-[180px]"
      />
      <button onClick={onCancel} className="text-xs text-gray-500 px-2">Annulla</button>
      <button onClick={save} disabled={!title.trim() || saving} className="text-xs bg-blue-700 text-white px-3 py-1 rounded disabled:opacity-50">Aggiungi</button>
    </div>
  )
}
