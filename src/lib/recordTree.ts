import type { TbRecord, TbRecordItem } from '../types'

export interface TreeNode {
  record: TbRecord
  children: TreeNode[]
  depth: number
}

/** Data "logica" di un record: evento → inizio, task → scadenza o creazione, memo → creazione. */
export function recordDate(r: TbRecord): string {
  if (r.rec_kind === 'EV' && r.rec_event_start) return r.rec_event_start
  return r.rec_created_at
}

/**
 * Costruisce l'albero dei record di un progetto.
 * Radici = record senza padre (o il cui padre non è nel set). Figli ordinati cronologicamente.
 */
export function buildTree(records: TbRecord[]): TreeNode[] {
  const byId = new Map(records.map(r => [r.rec_id, r]))
  const childrenOf = new Map<string | null, TbRecord[]>()

  for (const r of records) {
    const parent = r.rec_parent_id && byId.has(r.rec_parent_id) ? r.rec_parent_id : null
    if (!childrenOf.has(parent)) childrenOf.set(parent, [])
    childrenOf.get(parent)!.push(r)
  }
  const sortChrono = (a: TbRecord, b: TbRecord) => recordDate(a).localeCompare(recordDate(b))

  const build = (parent: string | null, depth: number): TreeNode[] =>
    (childrenOf.get(parent) ?? [])
      .sort(sortChrono)
      .map(record => ({ record, depth, children: build(record.rec_id, depth + 1) }))

  return build(null, 0)
}

/** Tutti i discendenti di un record (per evitare cicli nella scelta del padre). */
export function descendantIds(records: TbRecord[], rootId: string): Set<string> {
  const out = new Set<string>()
  const stack = [rootId]
  while (stack.length) {
    const cur = stack.pop()!
    for (const r of records) {
      if (r.rec_parent_id === cur && !out.has(r.rec_id)) {
        out.add(r.rec_id)
        stack.push(r.rec_id)
      }
    }
  }
  return out
}

export function kindTag(kind: string): string {
  return kind === 'T' ? 'TASK' : kind === 'M' ? 'MEMO' : 'EVENTO'
}

export function statusIt(s: string): string {
  const m: Record<string, string> = {
    aperto: 'aperto', in_progress: 'in corso', sospeso: 'sospeso',
    chiuso: 'chiuso', archiviato: 'archiviato',
  }
  return m[s] ?? s
}

export function fmtD(iso: string | null | undefined): string {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export function fmtDT(iso: string | null | undefined): string {
  if (!iso) return ''
  const d = new Date(iso)
  return fmtD(iso) + ' ' + d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
}

/** Riga sintetica di un record per outline testuale e Word. */
export function recordLine(r: TbRecord): string {
  const parts = [`[${kindTag(r.rec_kind)}]`]
  if (r.rec_code) parts.push(r.rec_code)
  parts.push(r.rec_title)
  const meta: string[] = [statusIt(r.rec_status)]
  if (r.rec_kind === 'EV' && r.rec_event_start) meta.push(fmtDT(r.rec_event_start))
  else if (r.rec_kind === 'T' && r.rec_due_date) meta.push('scad. ' + fmtD(r.rec_due_date))
  else meta.push(fmtD(r.rec_created_at))
  if (r.rec_done_at) meta.push('chiuso ' + fmtD(r.rec_done_at))
  if (r.rec_hours != null) meta.push(`${r.rec_hours}h`)
  return `${parts.join(' ')} — ${meta.join(' · ')}`
}

/**
 * Outline testuale ad albero (box-drawing), stampabile e copiabile.
 * items: aggiornamenti/sub-task per record (opzionali).
 */
export function treeToText(
  roots: TreeNode[],
  header: string,
  items?: Map<string, TbRecordItem[]>,
  includeBody = true,
): string {
  const lines: string[] = [header, '='.repeat(Math.min(header.length, 80)), '']

  const walk = (nodes: TreeNode[], prefix: string) => {
    nodes.forEach((n, i) => {
      const last = i === nodes.length - 1
      const branch = last ? '└─ ' : '├─ '
      const cont = last ? '   ' : '│  '
      lines.push(prefix + branch + recordLine(n.record))
      const inner = prefix + cont
      if (includeBody && n.record.rec_body) {
        for (const l of n.record.rec_body.split('\n')) lines.push(inner + '   ' + l)
      }
      const its = items?.get(n.record.rec_id) ?? []
      for (const it of its) {
        const mark = it.item_kind === 'subtask' ? (it.item_done ? '[x]' : '[ ]') : '•'
        lines.push(inner + '   ' + mark + ' ' + it.item_text + (it.item_kind === 'update' ? ` (${fmtDT(it.item_created_at)})` : ''))
      }
      walk(n.children, inner)
    })
  }
  walk(roots, '')
  return lines.join('\n')
}

/** Flatten cronologico (per la sezione "Cronologia" di Word). */
export function flattenChrono(records: TbRecord[]): TbRecord[] {
  return [...records].sort((a, b) => recordDate(a).localeCompare(recordDate(b)))
}
