import {
  Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType,
  Table, TableRow, TableCell, WidthType, BorderStyle,
} from 'docx'
import type { Project, TbRecord, TbRecordItem } from '../types'
import {
  buildTree, treeToText, flattenChrono, kindTag, statusIt, fmtD, fmtDT, recordDate,
} from './recordTree'
import type { TreeNode } from './recordTree'

const KIND_COLOR: Record<string, string> = { T: '1565C0', M: '616161', EV: 'E65100' }

function p(text: string, opts: { bold?: boolean; size?: number; color?: string; indent?: number; italics?: boolean } = {}) {
  return new Paragraph({
    indent: opts.indent ? { left: opts.indent } : undefined,
    spacing: { after: 60 },
    children: [new TextRun({ text, bold: opts.bold, size: opts.size, color: opts.color, italics: opts.italics })],
  })
}

function nodeParagraphs(n: TreeNode, items: Map<string, TbRecordItem[]>): Paragraph[] {
  const r = n.record
  const indent = 480 * n.depth
  const out: Paragraph[] = []

  // Riga principale: [TASK] CODICE Titolo
  const head = new Paragraph({
    indent: { left: indent },
    spacing: { before: 120, after: 40 },
    children: [
      new TextRun({ text: `[${kindTag(r.rec_kind)}] `, bold: true, color: KIND_COLOR[r.rec_kind] ?? '000000', size: 20 }),
      ...(r.rec_code ? [new TextRun({ text: r.rec_code + '  ', color: '888888', size: 20 })] : []),
      new TextRun({ text: r.rec_title, bold: true, size: 22 }),
    ],
  })
  out.push(head)

  // Meta
  const meta: string[] = [`Stato: ${statusIt(r.rec_status)}`]
  if (r.rec_kind === 'EV' && r.rec_event_start) meta.push(`Data evento: ${fmtDT(r.rec_event_start)}`)
  if (r.rec_kind === 'T' && r.rec_due_date) meta.push(`Scadenza: ${fmtD(r.rec_due_date)}`)
  meta.push(`Creato: ${fmtD(r.rec_created_at)}`)
  if (r.rec_done_at) meta.push(`Chiuso: ${fmtD(r.rec_done_at)}`)
  if (r.rec_hours != null) meta.push(`Ore: ${r.rec_hours}`)
  if (r.rec_priority === 1) meta.push('Priorità alta')
  out.push(p(meta.join('  ·  '), { size: 18, color: '666666', indent: indent + 240 }))

  // Corpo
  if (r.rec_body) {
    for (const line of r.rec_body.split('\n')) {
      out.push(p(line, { size: 20, indent: indent + 240 }))
    }
  }

  // Sub-task e aggiornamenti
  const its = items.get(r.rec_id) ?? []
  for (const it of its) {
    const mark = it.item_kind === 'subtask' ? (it.item_done ? '☑ ' : '☐ ') : '• '
    const suffix = it.item_kind === 'update' ? `  (${fmtDT(it.item_created_at)})` : ''
    out.push(p(mark + it.item_text + suffix, { size: 19, indent: indent + 480, italics: it.item_kind === 'update' }))
  }

  for (const c of n.children) out.push(...nodeParagraphs(c, items))
  return out
}

export async function exportProjectDocx(
  project: Project,
  records: TbRecord[],
  items: TbRecordItem[],
): Promise<Blob> {
  const roots = buildTree(records)
  const itemsByRec = new Map<string, TbRecordItem[]>()
  for (const it of items) {
    if (!itemsByRec.has(it.item_parent_id)) itemsByRec.set(it.item_parent_id, [])
    itemsByRec.get(it.item_parent_id)!.push(it)
  }

  const aperti = records.filter(r => ['aperto', 'in_progress', 'sospeso'].includes(r.rec_status)).length
  const chiusi = records.filter(r => r.rec_status === 'chiuso').length
  const ore = records.reduce((s, r) => s + (r.rec_hours ?? 0), 0)

  // Tabella cronologia
  const chrono = flattenChrono(records)
  const border = { style: BorderStyle.SINGLE, size: 4, color: 'CCCCCC' }
  const cell = (t: string, bold = false) => new TableCell({
    borders: { top: border, bottom: border, left: border, right: border },
    children: [new Paragraph({ children: [new TextRun({ text: t, size: 18, bold })] })],
  })
  const chronoTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({ children: [cell('Data', true), cell('Tipo', true), cell('Codice', true), cell('Titolo', true), cell('Stato', true)] }),
      ...chrono.map(r => new TableRow({ children: [
        cell(fmtD(recordDate(r))), cell(kindTag(r.rec_kind)), cell(r.rec_code ?? ''), cell(r.rec_title), cell(statusIt(r.rec_status)),
      ] })),
    ],
  })

  const doc = new Document({
    creator: 'Taskboard',
    title: `Storia progetto ${project.prj_code}`,
    styles: { default: { document: { run: { font: 'Calibri', size: 22 } } } },
    sections: [{
      children: [
        new Paragraph({ text: project.prj_label, heading: HeadingLevel.TITLE, alignment: AlignmentType.LEFT }),
        p(`${project.prj_code}  ·  Categoria ${project.prj_ws_code}  ·  ${project.prj_client ? 'Cliente: ' + project.prj_client + '  ·  ' : ''}Stato: ${project.prj_status}`, { color: '666666' }),
        p(`Generato il ${fmtDT(new Date().toISOString())}  ·  ${records.length} record (${aperti} aperti, ${chiusi} chiusi)  ·  ${ore > 0 ? ore.toFixed(1) + ' ore' : 'ore n.d.'}`, { size: 18, color: '888888' }),

        new Paragraph({ text: 'Albero del progetto', heading: HeadingLevel.HEADING_1, spacing: { before: 300 } }),
        p('Ogni elemento è indentato sotto il record da cui dipende logicamente. Ordine cronologico all\'interno di ogni ramo.', { size: 18, color: '888888', italics: true }),
        ...roots.flatMap(n => nodeParagraphs(n, itemsByRec)),

        new Paragraph({ text: 'Cronologia', heading: HeadingLevel.HEADING_1, spacing: { before: 400 } }),
        chronoTable,

        new Paragraph({ text: 'Outline testuale', heading: HeadingLevel.HEADING_1, spacing: { before: 400 } }),
        ...treeToText(roots, `${project.prj_code} — ${project.prj_label}`, itemsByRec, false)
          .split('\n')
          .map(l => new Paragraph({ children: [new TextRun({ text: l, font: 'Consolas', size: 17 })], spacing: { after: 0 } })),
      ],
    }],
  })

  return Packer.toBlob(doc)
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 2000)
}
