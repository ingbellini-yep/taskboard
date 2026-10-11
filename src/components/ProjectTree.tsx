import { useState } from 'react'
import type { TbRecord, TbRecordItem } from '../types'
import type { TreeNode } from '../lib/recordTree'
import { kindTag, statusIt, fmtD, fmtDT } from '../lib/recordTree'
import { RecordDetailModal } from './RecordDetailModal'
import { supabase } from '../lib/supabase'

const KIND_BG: Record<string, string> = { T: '#1565C0', M: '#616161', EV: '#E65100' }
const STATUS_CLS: Record<string, string> = {
  aperto: 'bg-blue-50 text-blue-700 border-blue-200',
  in_progress: 'bg-orange-50 text-orange-700 border-orange-200',
  sospeso: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  chiuso: 'bg-green-50 text-green-700 border-green-200',
  archiviato: 'bg-gray-100 text-gray-500 border-gray-200',
}

interface Props {
  roots: TreeNode[]
  items: Map<string, TbRecordItem[]>
  project: { prj_id: string; prj_code: string; prj_ws_id: string; prj_ws_code: string }
  onChanged: () => void
}

/** Albero grafico del progetto: nodi indentati con connettori, click → dettaglio, "+ figlio" inline. */
export function ProjectTree({ roots, items, project, onChanged }: Props) {
  if (roots.length === 0) {
    return <div className="text-center py-12 text-gray-400 text-sm">Nessun record in questo progetto.</div>
  }
  return (
    <div className="project-tree flex flex-col">
      {roots.map((n, i) => (
        <TreeRow key={n.record.rec_id} node={n} isLast={i === roots.length - 1} ancestorsLast={[]} items={items} project={project} onChanged={onChanged} />
      ))}
    </div>
  )
}

function TreeRow({ node: n, isLast, ancestorsLast, items, project, onChanged }: {
  node: TreeNode
  isLast: boolean
  ancestorsLast: boolean[]
  items: Map<string, TbRecordItem[]>
  project: Props['project']
  onChanged: () => void
}) {
  const r = n.record
  const [open, setOpen] = useState(true)
  const [showDetail, setShowDetail] = useState(false)
  const [adding, setAdding] = useState(false)
  const its = items.get(r.rec_id) ?? []
  const dateLabel = r.rec_kind === 'EV' && r.rec_event_start
    ? fmtDT(r.rec_event_start)
    : r.rec_kind === 'T' && r.rec_due_date ? 'scad. ' + fmtD(r.rec_due_date) : fmtD(r.rec_created_at)

  return (
    <>
      <div className="flex items-stretch">
        {/* Guide verticali degli antenati */}
        {ancestorsLast.map((last, i) => (
          <div key={i} className="w-6 shrink-0 relative">
            {!last && <div className="absolute left-3 top-0 bottom-0 border-l border-gray-300" />}
          </div>
        ))}
        {/* Connettore del nodo */}
        {n.depth > 0 && (
          <div className="w-6 shrink-0 relative">
            <div className={`absolute left-3 top-0 border-l border-gray-300 ${isLast ? 'h-5' : 'bottom-0'}`} />
            <div className="absolute left-3 top-5 w-3 border-t border-gray-300" />
          </div>
        )}

        {/* Card nodo */}
        <div className="flex-1 min-w-0 py-1">
          <div
            className="tree-node bg-white border border-gray-200 rounded-lg px-3 py-2 flex items-start gap-2 hover:border-gray-400 cursor-pointer group"
            style={{ borderLeftColor: KIND_BG[r.rec_kind], borderLeftWidth: 4 }}
            onClick={() => setShowDetail(true)}
          >
            {n.children.length > 0 && (
              <button
                onClick={e => { e.stopPropagation(); setOpen(o => !o) }}
                className="text-gray-400 hover:text-gray-700 text-xs w-4 shrink-0 mt-0.5 print:hidden"
                title={open ? 'Comprimi' : 'Espandi'}
              >
                {open ? '▾' : '▸'}
              </button>
            )}
            <span className="text-[10px] px-1.5 py-0.5 rounded font-bold text-white shrink-0 mt-0.5" style={{ backgroundColor: KIND_BG[r.rec_kind] }}>
              {kindTag(r.rec_kind)}
            </span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                {r.rec_code && <span className="font-mono text-xs text-gray-400">{r.rec_code}</span>}
                <span className={`text-sm font-medium ${r.rec_status === 'chiuso' || r.rec_status === 'archiviato' ? 'text-gray-500' : 'text-gray-900'}`}>
                  {r.rec_title}
                </span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${STATUS_CLS[r.rec_status] ?? ''}`}>{statusIt(r.rec_status)}</span>
                <span className="text-xs text-gray-400">{dateLabel}</span>
                {n.children.length > 0 && <span className="text-xs text-gray-400">· {n.children.length} {n.children.length === 1 ? 'figlio' : 'figli'}</span>}
              </div>
              {r.rec_body && <p className="text-xs text-gray-500 mt-0.5 line-clamp-2 print:line-clamp-none whitespace-pre-wrap">{r.rec_body}</p>}
              {its.length > 0 && (
                <ul className="mt-1 flex flex-col gap-0.5">
                  {its.map(it => (
                    <li key={it.item_id} className="text-xs text-gray-600">
                      {it.item_kind === 'subtask' ? (it.item_done ? '☑ ' : '☐ ') : '• '}
                      {it.item_text}
                      {it.item_kind === 'update' && <span className="text-gray-400"> ({fmtDT(it.item_created_at)})</span>}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <button
              onClick={e => { e.stopPropagation(); setAdding(a => !a) }}
              className="opacity-0 group-hover:opacity-100 text-xs text-blue-600 hover:text-blue-800 shrink-0 print:hidden"
              title="Aggiungi un record figlio"
            >
              + figlio
            </button>
          </div>

          {adding && (
            <div className="ml-6 mt-1 print:hidden">
              <QuickChildForm parent={r} project={project} onDone={() => { setAdding(false); onChanged() }} onCancel={() => setAdding(false)} />
            </div>
          )}
        </div>
      </div>

      {open && n.children.map((c, i) => (
        <TreeRow
          key={c.record.rec_id}
          node={c}
          isLast={i === n.children.length - 1}
          ancestorsLast={[...ancestorsLast, ...(n.depth > 0 ? [isLast] : [])]}
          items={items}
          project={project}
          onChanged={onChanged}
        />
      ))}

      {showDetail && <RecordDetailModal record={r} onClose={() => { setShowDetail(false); onChanged() }} />}
    </>
  )
}

function QuickChildForm({ parent, project, onDone, onCancel }: {
  parent: TbRecord
  project: Props['project']
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
      <span className="text-xs text-gray-500">Figlio di <b>{parent.rec_code ?? parent.rec_title}</b>:</span>
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
