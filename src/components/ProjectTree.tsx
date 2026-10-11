import { useState } from 'react'
import type { TbRecordItem } from '../types'
import type { TreeNode } from '../lib/recordTree'
import { statusIt, fmtD, fmtDT } from '../lib/recordTree'
import { RecordDetailModal } from './RecordDetailModal'
import { QuickChildForm } from './QuickChildForm'
import type { TreeProject } from './QuickChildForm'

const KIND: Record<string, { color: string; soft: string; icon: string; label: string }> = {
  T:  { color: '#1565C0', soft: '#E3F2FD', icon: '✅', label: 'Task' },
  M:  { color: '#6A1B9A', soft: '#F3E5F5', icon: '📝', label: 'Memo' },
  EV: { color: '#E65100', soft: '#FFF3E0', icon: '📅', label: 'Evento' },
}
const STATUS: Record<string, { dot: string; cls: string }> = {
  aperto:      { dot: '#1565C0', cls: 'bg-blue-50 text-blue-700 border-blue-200' },
  in_progress: { dot: '#E65100', cls: 'bg-orange-50 text-orange-700 border-orange-200' },
  sospeso:     { dot: '#B8860B', cls: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
  chiuso:      { dot: '#2E7D32', cls: 'bg-green-50 text-green-700 border-green-200' },
  archiviato:  { dot: '#9E9E9E', cls: 'bg-gray-100 text-gray-500 border-gray-200' },
}
const RAIL = 32   // larghezza colonna connettori (px)


interface Props {
  roots: TreeNode[]
  items: Map<string, TbRecordItem[]>
  project: TreeProject
  onChanged: () => void
}

/** Albero grafico del progetto con connettori colorati, card a rilievo e azioni inline. */
function flatten(nodes: TreeNode[], out: TreeNode[] = []): TreeNode[] {
  for (const n of nodes) { out.push(n); flatten(n.children, out) }
  return out
}

export function ProjectTree({ roots, items, project, onChanged }: Props) {
  // Il dettaglio aperto vive qui (non nel nodo): sopravvive ai rimontaggi quando l'albero si ristruttura
  const [detailId, setDetailId] = useState<string | null>(null)
  const detailRecord = detailId ? flatten(roots).find(n => n.record.rec_id === detailId)?.record ?? null : null

  if (roots.length === 0) {
    return <div className="text-center py-12 text-gray-400 text-sm">Nessun record in questo progetto.</div>
  }
  return (
    <div className="project-tree flex flex-col gap-1">
      {detailRecord && (
        <RecordDetailModal record={detailRecord} onClose={() => { setDetailId(null); onChanged() }} />
      )}
      <div className="flex items-center gap-4 text-xs text-gray-500 mb-2 print:hidden">
        <span className="font-medium uppercase tracking-wide text-gray-400">Legenda</span>
        {Object.entries(KIND).map(([k, v]) => (
          <span key={k} className="inline-flex items-center gap-1.5">
            <span className="w-5 h-5 rounded-full inline-flex items-center justify-center text-[11px]" style={{ backgroundColor: v.soft }}>{v.icon}</span>
            {v.label}
          </span>
        ))}
        <span className="ml-auto text-gray-400">Ogni ramo è in ordine cronologico · clicca un nodo per il dettaglio</span>
      </div>
      {roots.map((n, i) => (
        <TreeRow
          key={n.record.rec_id}
          node={n}
          isLast={i === roots.length - 1}
          rails={[]}
          parentColor={null}
          items={items}
          project={project}
          onChanged={onChanged}
          onOpen={setDetailId}
        />
      ))}
    </div>
  )
}

function TreeRow({ node: n, isLast, rails, parentColor, items, project, onChanged, onOpen }: {
  node: TreeNode
  isLast: boolean
  rails: (string | null)[]   // colore del rail per ogni livello antenato (null = nessuna linea)
  parentColor: string | null
  items: Map<string, TbRecordItem[]>
  project: TreeProject
  onChanged: () => void
  onOpen: (recId: string) => void
}) {
  const r = n.record
  const k = KIND[r.rec_kind] ?? KIND.T
  const st = STATUS[r.rec_status] ?? STATUS.aperto
  const [open, setOpen] = useState(true)
  const [adding, setAdding] = useState(false)
  const its = items.get(r.rec_id) ?? []
  const closed = r.rec_status === 'chiuso' || r.rec_status === 'archiviato'
  const isRoot = n.depth === 0
  const dateLabel = r.rec_kind === 'EV' && r.rec_event_start
    ? fmtDT(r.rec_event_start)
    : r.rec_kind === 'T' && r.rec_due_date ? 'scad. ' + fmtD(r.rec_due_date) : fmtD(r.rec_created_at)
  const subDone = its.filter(i => i.item_kind === 'subtask' && i.item_done).length
  const subTot = its.filter(i => i.item_kind === 'subtask').length
  const updates = its.filter(i => i.item_kind === 'update').length

  return (
    <>
      <div className="flex items-stretch">
        {/* Rails degli antenati */}
        {rails.map((color, i) => (
          <div key={i} className="shrink-0 relative" style={{ width: RAIL }}>
            {color && <div className="absolute top-0 bottom-0" style={{ left: RAIL / 2 - 1, width: 2, backgroundColor: color, opacity: 0.45 }} />}
          </div>
        ))}

        {/* Connettore a gomito del nodo */}
        {!isRoot && parentColor && (
          <div className="shrink-0 relative" style={{ width: RAIL }}>
            <svg className="absolute inset-0 w-full h-full overflow-visible" preserveAspectRatio="none">
              {/* linea verticale: fino al centro (ultimo) o fino in fondo */}
              <line x1={RAIL / 2} y1={0} x2={RAIL / 2} y2={isLast ? 26 : '100%'} stroke={parentColor} strokeWidth={2} strokeOpacity={0.45} />
              {/* gomito arrotondato verso la card */}
              <path d={`M ${RAIL / 2} 18 Q ${RAIL / 2} 26 ${RAIL / 2 + 8} 26 L ${RAIL} 26`} fill="none" stroke={parentColor} strokeWidth={2} strokeOpacity={0.8} />
              <circle cx={RAIL} cy={26} r={3} fill={parentColor} />
            </svg>
          </div>
        )}

        {/* Card */}
        <div className="flex-1 min-w-0 py-1">
          <div
            onClick={() => onOpen(r.rec_id)}
            className={`tree-node rounded-xl border cursor-pointer group transition-all hover:-translate-y-px hover:shadow-md ${
              isRoot ? 'shadow-sm bg-white' : 'bg-white/90'
            } ${closed ? 'opacity-75' : ''}`}
            style={{ borderColor: isRoot ? k.color + '55' : '#E5E7EB', borderLeft: `${isRoot ? 5 : 3}px solid ${k.color}` }}
          >
            <div className="flex items-start gap-3 px-3 py-2.5">
              {/* Icona tipo */}
              <div className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm" style={{ backgroundColor: k.soft, boxShadow: `inset 0 0 0 1.5px ${k.color}33` }}>
                {k.icon}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  {r.rec_code && <span className="font-mono text-[11px] text-gray-400 bg-gray-50 border border-gray-100 rounded px-1">{r.rec_code}</span>}
                  <span className={`${isRoot ? 'text-[15px] font-semibold' : 'text-sm font-medium'} ${closed ? 'text-gray-500 line-through decoration-gray-300' : 'text-gray-900'}`}>
                    {r.rec_title}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <span className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full border ${st.cls}`}>
                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: st.dot }} />
                    {statusIt(r.rec_status)}
                  </span>
                  <span className="text-[11px] text-gray-500 bg-gray-50 border border-gray-100 rounded px-1.5 py-0.5">📆 {dateLabel}</span>
                  {r.rec_hours != null && <span className="text-[11px] text-blue-700 bg-blue-50 border border-blue-100 rounded px-1.5 py-0.5">{r.rec_hours}h</span>}
                  {subTot > 0 && <span className="text-[11px] text-gray-600 bg-gray-50 border border-gray-100 rounded px-1.5 py-0.5">☑ {subDone}/{subTot}</span>}
                  {updates > 0 && <span className="text-[11px] text-gray-600 bg-gray-50 border border-gray-100 rounded px-1.5 py-0.5">💬 {updates}</span>}
                  {n.children.length > 0 && (
                    <button
                      onClick={e => { e.stopPropagation(); setOpen(o => !o) }}
                      className="text-[11px] font-medium rounded-full px-2 py-0.5 text-white print:hidden"
                      style={{ backgroundColor: k.color }}
                      title={open ? 'Comprimi ramo' : 'Espandi ramo'}
                    >
                      {open ? '▾' : '▸'} {n.children.length} {n.children.length === 1 ? 'figlio' : 'figli'}
                    </button>
                  )}
                </div>
                {r.rec_body && <p className="text-xs text-gray-500 mt-1.5 line-clamp-2 print:line-clamp-none whitespace-pre-wrap">{r.rec_body}</p>}
                {its.length > 0 && (
                  <ul className="mt-1.5 flex flex-col gap-0.5 border-l-2 pl-2" style={{ borderColor: k.color + '33' }}>
                    {its.map(it => (
                      <li key={it.item_id} className="text-[11px] text-gray-600">
                        {it.item_kind === 'subtask' ? (it.item_done ? '☑ ' : '☐ ') : '💬 '}
                        {it.item_text}
                        {it.item_kind === 'update' && <span className="text-gray-400"> · {fmtDT(it.item_created_at)}</span>}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <button
                onClick={e => { e.stopPropagation(); setAdding(a => !a) }}
                className="shrink-0 self-start opacity-0 group-hover:opacity-100 text-[11px] font-medium px-2 py-1 rounded-lg border transition-opacity print:hidden"
                style={{ color: k.color, borderColor: k.color + '66' }}
                title="Aggiungi un record che dipende da questo"
              >
                + figlio
              </button>
            </div>
          </div>

          {adding && (
            <div className="mt-1 print:hidden" style={{ marginLeft: RAIL }}>
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
          rails={[...rails, ...(isRoot ? [] : [isLast ? null : parentColor])]}
          parentColor={k.color}
          items={items}
          project={project}
          onChanged={onChanged}
          onOpen={onOpen}
        />
      ))}
    </>
  )
}
