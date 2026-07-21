import { useEffect, useRef, useState } from 'react'
import { useProjects } from '../hooks/useProjects'
import type { TbPurchase, WorkspaceCode } from '../types'

interface Props {
  onSave: (p: Partial<TbPurchase>) => Promise<void>
  onCancel: () => void
}

const CATEGORIES: { code: WorkspaceCode; label: string }[] = [
  { code: 'LP',   label: 'LP — Libero Professionista' },
  { code: 'RB',   label: 'RB — Rebuilding' },
  { code: 'PNRR', label: 'PNRR' },
  { code: 'FAM',  label: 'FAM — Famiglia' },
  { code: 'PERS', label: 'PERS — Personale' },
]

export function NewPurchaseModal({ onSave, onCancel }: Props) {
  const { projects } = useProjects()
  const titleRef = useRef<HTMLInputElement>(null)

  const [title, setTitle] = useState('')
  const [cat, setCat] = useState<WorkspaceCode | ''>('')
  const [prjId, setPrjId] = useState('')
  const [est, setEst] = useState('')
  const [target, setTarget] = useState('')
  const [priority, setPriority] = useState(2)
  const [warranty, setWarranty] = useState('')
  const [deductible, setDeductible] = useState(false)
  const [url, setUrl] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    titleRef.current?.focus()
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onCancel])

  async function handleSave() {
    if (!title.trim() || saving) return
    setSaving(true)
    await onSave({
      pur_title:           title.trim(),
      pur_ws_code:         (cat || null) as WorkspaceCode | null,
      pur_prj_id:          prjId || null,
      pur_est_amount:      est ? parseFloat(est.replace(',', '.')) : null,
      pur_target_date:     target || null,
      pur_priority:        priority,
      pur_warranty_months: warranty ? parseInt(warranty, 10) : null,
      pur_deductible:      deductible,
      pur_url:             url.trim() || null,
      pur_notes:           notes.trim() || null,
    })
    setSaving(false)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 overflow-y-auto py-8 px-4"
      onClick={e => { if (e.target === e.currentTarget) onCancel() }}
    >
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <span className="font-semibold text-gray-900">🛒 Nuovo acquisto</span>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-600 text-lg leading-none">×</button>
        </div>

        <div className="px-5 py-5 flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500">Cosa devi acquistare</label>
            <input
              ref={titleRef}
              value={title}
              onChange={e => setTitle(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleSave() }}
              placeholder="Es. Stampante A3 per studio"
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex gap-3">
            <div className="flex flex-col gap-1 flex-1">
              <label className="text-xs text-gray-500">Categoria</label>
              <select
                value={cat}
                onChange={e => setCat(e.target.value as WorkspaceCode | '')}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">— Nessuna —</option>
                {CATEGORIES.map(c => <option key={c.code} value={c.code}>{c.label}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1 flex-1">
              <label className="text-xs text-gray-500">Priorità</label>
              <select
                value={priority}
                onChange={e => setPriority(Number(e.target.value))}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value={1}>Alta</option>
                <option value={2}>Normale</option>
                <option value={3}>Bassa</option>
              </select>
            </div>
          </div>

          <div className="flex gap-3">
            <div className="flex flex-col gap-1 flex-1">
              <label className="text-xs text-gray-500">Importo stimato (€)</label>
              <input
                type="text" inputMode="decimal"
                value={est} onChange={e => setEst(e.target.value)}
                placeholder="0,00"
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex flex-col gap-1 flex-1">
              <label className="text-xs text-gray-500">Data prevista</label>
              <input
                type="date" value={target} onChange={e => setTarget(e.target.value)}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500">Progetto (opzionale)</label>
            <select
              value={prjId} onChange={e => setPrjId(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">— Nessun progetto —</option>
              {projects.map(p => (
                <option key={p.prj_id} value={p.prj_id}>[{p.prj_ws_code}] {p.prj_code} — {p.prj_label}</option>
              ))}
            </select>
          </div>

          <div className="flex gap-3 items-end">
            <div className="flex flex-col gap-1 flex-1">
              <label className="text-xs text-gray-500">Garanzia (mesi)</label>
              <input
                type="number" min="0" value={warranty} onChange={e => setWarranty(e.target.value)}
                placeholder="es. 24"
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <label className="flex items-center gap-2 pb-2 flex-1 cursor-pointer">
              <input type="checkbox" checked={deductible} onChange={e => setDeductible(e.target.checked)} className="rounded border-gray-300" />
              <span className="text-sm text-gray-700">Deducibile / detraibile</span>
            </label>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500">Link prodotto (opzionale)</label>
            <input
              type="url" value={url} onChange={e => setUrl(e.target.value)}
              placeholder="https://…"
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500">Note</label>
            <textarea
              value={notes} onChange={e => setNotes(e.target.value)} rows={3}
              placeholder="Requisiti, specifiche, motivazione…"
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-gray-100">
          <button onClick={onCancel} disabled={saving} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 font-medium disabled:opacity-50">
            Annulla
          </button>
          <button
            onClick={handleSave} disabled={!title.trim() || saving}
            className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white text-sm font-medium rounded disabled:opacity-50"
          >
            {saving ? 'Salvataggio…' : 'Salva'}
          </button>
        </div>
      </div>
    </div>
  )
}
