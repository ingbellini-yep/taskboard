import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { TbRecord } from '../types'
import { kindTag, statusIt, descendantIds } from '../lib/recordTree'
import { QuickChildForm } from './QuickChildForm'

/**
 * Dipendenze di un record già esistente, modificabili dalla scheda dettaglio:
 * - ascendente: imposta / cambia / rimuovi il padre
 * - discendenti: collega un record esistente come figlio, crea un nuovo figlio, scollega
 */
export function RecordLineage({ record }: { record: TbRecord }) {
  const [all, setAll] = useState<TbRecord[]>([])
  const [parentId, setParentId] = useState<string | null>(record.rec_parent_id ?? null)
  const [pickParent, setPickParent] = useState(false)
  const [pickChild, setPickChild] = useState(false)
  const [newChild, setNewChild] = useState(false)

  const load = useCallback(async () => {
    if (!record.rec_prj_id) { setAll([]); return }
    const { data } = await supabase
      .from('tb_records')
      .select('rec_id, rec_code, rec_title, rec_kind, rec_status, rec_parent_id, rec_created_at, rec_prj_id')
      .eq('rec_prj_id', record.rec_prj_id)
      .order('rec_created_at')
    const list = (data ?? []) as TbRecord[]
    setAll(list)
    const me = list.find(x => x.rec_id === record.rec_id)
    if (me) setParentId(me.rec_parent_id ?? null)
  }, [record.rec_prj_id, record.rec_id])

  useEffect(() => { load() }, [load])

  const byId = useMemo(() => new Map(all.map(r => [r.rec_id, r])), [all])
  const parent = parentId ? byId.get(parentId) ?? null : null
  const children = useMemo(() => all.filter(r => r.rec_parent_id === record.rec_id), [all, record.rec_id])

  // Antenati (per non proporli come figli → eviterebbe cicli)
  const ancestors = useMemo(() => {
    const s = new Set<string>()
    let cur = parentId
    let guard = 0
    while (cur && guard++ < 100) { s.add(cur); cur = byId.get(cur)?.rec_parent_id ?? null }
    return s
  }, [parentId, byId])
  const descendants = useMemo(() => descendantIds(all, record.rec_id), [all, record.rec_id])

  const parentCandidates = all.filter(r => r.rec_id !== record.rec_id && !descendants.has(r.rec_id))
  const childCandidates = all.filter(r =>
    r.rec_id !== record.rec_id && !ancestors.has(r.rec_id) && r.rec_parent_id !== record.rec_id
  )

  async function setParent(id: string | null) {
    await supabase.from('tb_records').update({ rec_parent_id: id }).eq('rec_id', record.rec_id)
    setPickParent(false)
    load()
  }
  async function linkChild(id: string) {
    await supabase.from('tb_records').update({ rec_parent_id: record.rec_id }).eq('rec_id', id)
    setPickChild(false)
    load()
  }
  async function unlinkChild(id: string) {
    await supabase.from('tb_records').update({ rec_parent_id: null }).eq('rec_id', id)
    load()
  }

  if (!record.rec_prj_id) return null

  const Row = ({ r, action }: { r: TbRecord; action?: React.ReactNode }) => (
    <div className="flex items-center gap-2 text-sm group">
      <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-200 text-gray-700 font-bold shrink-0">{kindTag(r.rec_kind)}</span>
      {r.rec_code && <span className="font-mono text-xs text-gray-400 shrink-0">{r.rec_code}</span>}
      <span className="text-gray-800 truncate">{r.rec_title}</span>
      <span className="text-xs text-gray-400 ml-auto shrink-0">{statusIt(r.rec_status)}</span>
      {action}
    </div>
  )
  const Opt = ({ r }: { r: TbRecord }) => (
    <option value={r.rec_id}>[{kindTag(r.rec_kind)}] {r.rec_code ? r.rec_code + ' — ' : ''}{r.rec_title}</option>
  )
  const linkBtn = 'text-xs text-blue-600 hover:text-blue-800 font-medium'
  const selCls = 'border border-gray-200 rounded-lg px-2 py-1.5 text-xs text-gray-800 bg-white flex-1 min-w-0 focus:outline-none focus:ring-2 focus:ring-blue-500'

  return (
    <div className="flex flex-col gap-2 pt-1 border-t border-gray-100">
      <span className="text-xs text-gray-400 uppercase tracking-wide">Dipendenze</span>

      {/* ── Ascendente ── */}
      <div className="bg-gray-50 border border-gray-100 rounded-lg px-3 py-2 flex flex-col gap-1.5">
        <div className="flex items-center">
          <span className="text-[10px] text-gray-400 uppercase tracking-wide">↑ Dipende da</span>
          <div className="ml-auto flex gap-2">
            {!pickParent && <button onClick={() => setPickParent(true)} className={linkBtn}>{parent ? 'Cambia' : '+ Imposta padre'}</button>}
            {parent && !pickParent && <button onClick={() => setParent(null)} className="text-xs text-gray-400 hover:text-red-600">Rimuovi</button>}
          </div>
        </div>
        {parent && !pickParent && <Row r={parent} />}
        {!parent && !pickParent && <span className="text-xs text-gray-400 italic">Nessuno — è una radice dell'albero</span>}
        {pickParent && (
          <div className="flex gap-2 items-center">
            <select autoFocus defaultValue={parentId ?? ''} onChange={e => { if (e.target.value) setParent(e.target.value) }} className={selCls}>
              <option value="">— scegli il record padre —</option>
              {parentCandidates.map(r => <Opt key={r.rec_id} r={r} />)}
            </select>
            <button onClick={() => setPickParent(false)} className="text-xs text-gray-500">Annulla</button>
          </div>
        )}
      </div>

      {/* ── Discendenti ── */}
      <div className="bg-gray-50 border border-gray-100 rounded-lg px-3 py-2 flex flex-col gap-1.5">
        <div className="flex items-center">
          <span className="text-[10px] text-gray-400 uppercase tracking-wide">↓ Figli ({children.length})</span>
          <div className="ml-auto flex gap-3">
            {!pickChild && <button onClick={() => { setPickChild(true); setNewChild(false) }} className={linkBtn}>Collega esistente</button>}
            {!newChild && <button onClick={() => { setNewChild(true); setPickChild(false) }} className={linkBtn}>+ Nuovo figlio</button>}
          </div>
        </div>
        {children.map(c => (
          <Row key={c.rec_id} r={c} action={
            <button onClick={() => unlinkChild(c.rec_id)} className="text-xs text-gray-300 hover:text-red-600 opacity-0 group-hover:opacity-100" title="Scollega">✕</button>
          } />
        ))}
        {children.length === 0 && !pickChild && !newChild && <span className="text-xs text-gray-400 italic">Nessun record dipende da questo</span>}
        {pickChild && (
          <div className="flex gap-2 items-center">
            <select autoFocus defaultValue="" onChange={e => { if (e.target.value) linkChild(e.target.value) }} className={selCls}>
              <option value="">— scegli il record da collegare come figlio —</option>
              {childCandidates.map(r => <Opt key={r.rec_id} r={r} />)}
            </select>
            <button onClick={() => setPickChild(false)} className="text-xs text-gray-500">Annulla</button>
          </div>
        )}
        {newChild && record.rec_prj_id && record.rec_prj_code && record.rec_ws_id && record.rec_ws_code && (
          <QuickChildForm
            parent={record}
            project={{ prj_id: record.rec_prj_id, prj_code: record.rec_prj_code, prj_ws_id: record.rec_ws_id, prj_ws_code: record.rec_ws_code }}
            onDone={() => { setNewChild(false); load() }}
            onCancel={() => setNewChild(false)}
          />
        )}
      </div>
    </div>
  )
}
