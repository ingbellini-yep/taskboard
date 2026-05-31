import { useMemo, useRef, useState } from 'react'
import type { TbRecord } from '../types'
import {
  useSmallTasks,
  categoryColor,
  categoryLabel,
  sortSmall,
} from '../hooks/useSmallTasks'
import type { SmallCategory, SmallSort, SmallStatus, SmallStatusFilter, SmallView } from '../hooks/useSmallTasks'

// ─── Costanti ────────────────────────────────────────────────────────────────

const CATEGORIES: { code: SmallCategory; label: string }[] = [
  { code: 'LP',   label: 'LP' },
  { code: 'RB',   label: 'RB' },
  { code: 'PNRR', label: 'PNRR' },
  { code: 'FAM',  label: 'FAM' },
  { code: 'PERS', label: 'PERS' },
  { code: null,   label: 'Nessuna' },
]

const PRIORITIES = [
  { value: 1, label: 'Alta',    color: '#C62828' },
  { value: 2, label: 'Normale', color: '#1565C0' },
  { value: 3, label: 'Bassa',   color: '#757575' },
]

// ─── Category badge ───────────────────────────────────────────────────────────

function CatBadge({ code }: { code: string | null }) {
  const color = categoryColor(code)
  return (
    <span
      className="text-xs px-2 py-0.5 rounded-full font-medium text-white shrink-0"
      style={{ backgroundColor: color }}
    >
      {categoryLabel(code)}
    </span>
  )
}

// ─── Priority badge ───────────────────────────────────────────────────────────

function PriBadge({ priority }: { priority: number }) {
  const p = PRIORITIES.find(x => x.value === priority) ?? PRIORITIES[1]
  return (
    <span className="text-xs font-medium" style={{ color: p.color }}>
      {p.label}
    </span>
  )
}

// ─── Due date label ───────────────────────────────────────────────────────────

function DueLabel({ date }: { date: string | null }) {
  if (!date) return null
  const d = new Date(date)
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const diff = Math.round((d.getTime() - today.getTime()) / 86400000)
  const fmt = d.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' })
  const color = diff < 0 ? '#C62828' : diff === 0 ? '#E65100' : '#616161'
  const label = diff < 0 ? `Scad. ${fmt}` : diff === 0 ? 'Oggi' : diff === 1 ? 'Domani' : fmt
  return <span className="text-xs font-medium" style={{ color }}>⏰ {label}</span>
}

// ─── Inline add form ──────────────────────────────────────────────────────────

interface AddFormProps {
  onAdd: (params: { title: string; priority: number; category: SmallCategory; dueDate: string | null }) => Promise<void>
}

function AddForm({ onAdd }: AddFormProps) {
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [priority, setPriority] = useState(2)
  const [category, setCategory] = useState<SmallCategory>(null)
  const [due, setDue] = useState('')
  const [saving, setSaving] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  function expand() { setOpen(true); setTimeout(() => inputRef.current?.focus(), 50) }

  async function handleSave() {
    if (!title.trim() || saving) return
    setSaving(true)
    await onAdd({ title: title.trim(), priority, category, dueDate: due || null })
    setTitle(''); setPriority(2); setCategory(null); setDue(''); setOpen(false)
    setSaving(false)
  }

  if (!open) {
    return (
      <button
        onClick={expand}
        className="w-full text-left text-sm text-gray-400 hover:text-gray-600 py-2 px-3 border border-dashed border-gray-200 rounded-lg hover:border-gray-400 transition-colors"
      >
        + Aggiungi task…
      </button>
    )
  }

  return (
    <div className="border border-blue-200 rounded-lg p-3 bg-blue-50 flex flex-col gap-2">
      <input
        ref={inputRef}
        value={title}
        onChange={e => setTitle(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') setOpen(false) }}
        placeholder="Titolo task…"
        className="border border-gray-200 rounded px-2 py-1.5 text-sm text-gray-900 bg-white focus:outline-none focus:border-blue-500 w-full"
      />
      <div className="flex flex-wrap gap-2 items-center">
        <select
          value={priority}
          onChange={e => setPriority(Number(e.target.value))}
          className="border border-gray-200 rounded px-2 py-1 text-xs bg-white text-gray-700"
        >
          {PRIORITIES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
        </select>
        <select
          value={category ?? ''}
          onChange={e => setCategory((e.target.value || null) as SmallCategory)}
          className="border border-gray-200 rounded px-2 py-1 text-xs bg-white text-gray-700"
        >
          <option value="">Nessuna categoria</option>
          {CATEGORIES.filter(c => c.code).map(c => (
            <option key={c.code} value={c.code!}>{c.label}</option>
          ))}
        </select>
        <input
          type="date"
          value={due}
          onChange={e => setDue(e.target.value)}
          className="border border-gray-200 rounded px-2 py-1 text-xs bg-white text-gray-700"
        />
        <div className="ml-auto flex gap-1.5">
          <button onClick={() => setOpen(false)} className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1">Annulla</button>
          <button
            onClick={handleSave}
            disabled={!title.trim() || saving}
            className="text-xs bg-blue-700 text-white px-3 py-1 rounded hover:bg-blue-800 disabled:opacity-50 font-medium transition-colors"
          >
            {saving ? '…' : 'Salva'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Lista rapida ─────────────────────────────────────────────────────────────

function ListaView({ records, onToggle, onDelete, onAdd }: {
  records: TbRecord[]
  onToggle: (r: TbRecord) => void
  onDelete: (id: string) => void
  onAdd: AddFormProps['onAdd']
}) {
  const open = records.filter(r => r.rec_status !== 'chiuso')
  const done = records.filter(r => r.rec_status === 'chiuso')

  return (
    <div className="flex flex-col gap-2">
      <AddForm onAdd={onAdd} />
      {open.map(r => (
        <ListRow key={r.rec_id} record={r} onToggle={onToggle} onDelete={onDelete} />
      ))}
      {done.length > 0 && (
        <>
          <div className="text-xs text-gray-400 uppercase tracking-wide mt-3 mb-1">Completati ({done.length})</div>
          {done.map(r => (
            <ListRow key={r.rec_id} record={r} onToggle={onToggle} onDelete={onDelete} done />
          ))}
        </>
      )}
      {records.length === 0 && (
        <div className="text-center py-12 text-gray-400 text-sm">Nessun task. Aggiungine uno!</div>
      )}
    </div>
  )
}

function ListRow({ record: r, onToggle, onDelete, done = false }: {
  record: TbRecord
  onToggle: (r: TbRecord) => void
  onDelete: (id: string) => void
  done?: boolean
}) {
  return (
    <div className={`flex items-center gap-3 px-3 py-2.5 bg-white border rounded-lg group transition-all ${done ? 'border-gray-100 opacity-60' : 'border-gray-200 hover:border-gray-300'}`}>
      <button
        onClick={() => onToggle(r)}
        className={`w-5 h-5 shrink-0 rounded border-2 flex items-center justify-center transition-colors ${
          done ? 'bg-green-500 border-green-500 text-white' : 'border-gray-300 hover:border-blue-500'
        }`}
      >
        {done && <span className="text-xs leading-none">✓</span>}
      </button>
      <div className="flex-1 min-w-0">
        <span className={`text-sm ${done ? 'line-through text-gray-400' : 'text-gray-900'}`}>
          {r.rec_title}
        </span>
        {!done && (
          <div className="flex items-center gap-2 mt-0.5">
            <PriBadge priority={r.rec_priority} />
            <DueLabel date={r.rec_due_date} />
          </div>
        )}
      </div>
      <CatBadge code={r.rec_ws_code} />
      <button
        onClick={() => onDelete(r.rec_id)}
        className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500 text-xs transition-opacity shrink-0"
        title="Elimina"
      >
        ✕
      </button>
    </div>
  )
}

// ─── Kanban ───────────────────────────────────────────────────────────────────

const KANBAN_COLS: { status: SmallStatus; label: string; color: string }[] = [
  { status: 'aperto',      label: 'Da fare',  color: '#1565C0' },
  { status: 'in_progress', label: 'In corso', color: '#E65100' },
  { status: 'chiuso',      label: 'Fatto',    color: '#2E7D32' },
]

function KanbanView({ records, onMove, onDelete, onAdd }: {
  records: TbRecord[]
  onMove: (id: string, status: SmallStatus) => void
  onDelete: (id: string) => void
  onAdd: AddFormProps['onAdd']
}) {
  const [dragging, setDragging] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState<SmallStatus | null>(null)

  function handleDragStart(e: React.DragEvent, id: string) {
    setDragging(id)
    e.dataTransfer.effectAllowed = 'move'
  }

  function handleDrop(e: React.DragEvent, status: SmallStatus) {
    e.preventDefault()
    if (dragging) { onMove(dragging, status); setDragging(null) }
    setDragOver(null)
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {KANBAN_COLS.map(col => {
        const colRecords = records.filter(r => r.rec_status === col.status)
        const isOver = dragOver === col.status
        return (
          <div
            key={col.status}
            onDragOver={e => { e.preventDefault(); setDragOver(col.status) }}
            onDragLeave={() => setDragOver(null)}
            onDrop={e => handleDrop(e, col.status)}
            className={`rounded-xl border-2 flex flex-col gap-2 p-3 min-h-[200px] transition-colors ${
              isOver ? 'border-blue-400 bg-blue-50' : 'border-gray-200 bg-gray-50'
            }`}
          >
            {/* Column header */}
            <div className="flex items-center gap-2 pb-2">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: col.color }} />
              <span className="text-sm font-semibold text-gray-700">{col.label}</span>
              <span className="ml-auto text-xs text-gray-400 bg-white px-1.5 py-0.5 rounded-full border border-gray-200">
                {colRecords.length}
              </span>
            </div>

            {/* Add form */}
            <AddForm onAdd={params => onAdd({ ...params })} />

            {/* Cards */}
            {colRecords.map(r => (
              <KanbanCard
                key={r.rec_id}
                record={r}
                onMove={onMove}
                onDelete={onDelete}
                dragging={dragging === r.rec_id}
                onDragStart={handleDragStart}
              />
            ))}
          </div>
        )
      })}
    </div>
  )
}

function KanbanCard({ record: r, onMove, onDelete, dragging, onDragStart }: {
  record: TbRecord
  onMove: (id: string, status: SmallStatus) => void
  onDelete: (id: string) => void
  dragging: boolean
  onDragStart: (e: React.DragEvent, id: string) => void
}) {
  const otherCols = KANBAN_COLS.filter(c => c.status !== r.rec_status)
  return (
    <div
      draggable
      onDragStart={e => onDragStart(e, r.rec_id)}
      className={`bg-white rounded-lg border border-gray-200 p-3 flex flex-col gap-2 shadow-sm cursor-grab active:cursor-grabbing group transition-opacity ${
        dragging ? 'opacity-40' : 'hover:border-gray-300 hover:shadow-md'
      }`}
    >
      <div className="flex items-start gap-2">
        <span className="text-sm text-gray-900 flex-1 leading-snug">{r.rec_title}</span>
        <button
          onClick={() => onDelete(r.rec_id)}
          className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500 text-xs transition-opacity shrink-0"
        >
          ✕
        </button>
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <CatBadge code={r.rec_ws_code} />
        <PriBadge priority={r.rec_priority} />
        <DueLabel date={r.rec_due_date} />
      </div>
      {/* Move buttons */}
      <div className="flex gap-1 pt-1 border-t border-gray-100">
        {otherCols.map(col => (
          <button
            key={col.status}
            onClick={() => onMove(r.rec_id, col.status)}
            className="text-xs text-gray-400 hover:text-white px-2 py-0.5 rounded transition-colors hover:opacity-90"
            style={{ ':hover': { backgroundColor: col.color } } as React.CSSProperties}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = col.color)}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = '')}
            title={`Sposta in ${col.label}`}
          >
            → {col.label}
          </button>
        ))}
      </div>
    </div>
  )
}

// ─── Per categoria ────────────────────────────────────────────────────────────

function CategoriaView({ records, onToggle, onDelete, onAdd }: {
  records: TbRecord[]
  onToggle: (r: TbRecord) => void
  onDelete: (id: string) => void
  onAdd: AddFormProps['onAdd']
}) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})

  const groups = useMemo(() => {
    const catOrder = ['LP', 'RB', 'PNRR', 'FAM', 'PERS', null]
    return catOrder.map(code => ({
      code,
      label: categoryLabel(code),
      color: categoryColor(code),
      records: records.filter(r => r.rec_ws_code === code),
    })).filter(g => g.records.length > 0)
  }, [records])

  return (
    <div className="flex flex-col gap-3">
      {groups.map(g => {
        const key = g.code ?? '__none__'
        const open = records.filter(r => r.rec_ws_code === g.code && r.rec_status !== 'chiuso').length
        const isOpen = !collapsed[key]
        return (
          <div key={key} className="border border-gray-200 rounded-xl overflow-hidden">
            <button
              onClick={() => setCollapsed(c => ({ ...c, [key]: !c[key] }))}
              className="w-full flex items-center gap-3 px-4 py-3 bg-white hover:bg-gray-50 transition-colors"
            >
              <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: g.color }} />
              <span className="font-semibold text-sm text-gray-800">{g.label}</span>
              <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                {open} aperti · {g.records.length} tot
              </span>
              <span className="ml-auto text-gray-400 text-xs">{isOpen ? '▲' : '▼'}</span>
            </button>
            {isOpen && (
              <div className="border-t border-gray-100 px-4 py-3 bg-gray-50 flex flex-col gap-2">
                <AddForm onAdd={params => onAdd({ ...params, category: g.code as SmallCategory })} />
                {g.records.map(r => (
                  <ListRow key={r.rec_id} record={r} onToggle={onToggle} onDelete={onDelete} done={r.rec_status === 'chiuso'} />
                ))}
              </div>
            )}
          </div>
        )
      })}
      {groups.length === 0 && (
        <div className="text-center py-12 text-gray-400 text-sm">Nessun task.</div>
      )}
    </div>
  )
}

// ─── SmallTasksView principale ────────────────────────────────────────────────

export function SmallTasksView() {
  const { records, loading, addTask, updateStatus, deleteTask } = useSmallTasks()

  const [view, setView] = useState<SmallView>('lista')
  const [filterCats, setFilterCats] = useState<Set<string>>(new Set())
  const [filterPriority, setFilterPriority] = useState<number | null>(null)
  const [filterStatus, setFilterStatus] = useState<SmallStatusFilter>('aperti')
  const [sort, setSort] = useState<SmallSort>('priorita')

  // Filtro applicato
  const filtered = useMemo(() => {
    let r = records
    if (filterCats.size > 0) {
      r = r.filter(x => filterCats.has(x.rec_ws_code ?? '__none__'))
    }
    if (filterPriority !== null) {
      r = r.filter(x => x.rec_priority === filterPriority)
    }
    if (filterStatus === 'aperti') {
      r = r.filter(x => x.rec_status !== 'chiuso' && x.rec_status !== 'archiviato')
    } else if (filterStatus === 'chiusi') {
      r = r.filter(x => x.rec_status === 'chiuso')
    }
    return sortSmall(r, sort)
  }, [records, filterCats, filterPriority, filterStatus, sort])

  // Per la lista: aperti sempre in cima, chiusi in fondo anche se filterStatus=tutti
  const filteredAll = useMemo(() => {
    let r = records
    if (filterCats.size > 0) r = r.filter(x => filterCats.has(x.rec_ws_code ?? '__none__'))
    if (filterPriority !== null) r = r.filter(x => x.rec_priority === filterPriority)
    return sortSmall(r, sort)
  }, [records, filterCats, filterPriority, sort])

  function toggleCat(code: string) {
    setFilterCats(prev => {
      const n = new Set(prev)
      n.has(code) ? n.delete(code) : n.add(code)
      return n
    })
  }

  async function handleToggle(r: TbRecord) {
    const next: SmallStatus = r.rec_status === 'chiuso' ? 'aperto' : 'chiuso'
    await updateStatus(r.rec_id, next)
  }

  async function handleMove(id: string, status: SmallStatus) {
    await updateStatus(id, status)
  }

  const openCount = records.filter(r => r.rec_status !== 'chiuso').length

  const viewRecords = view === 'lista' ? filteredAll : filtered

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div>
          <h2 className="text-lg font-bold text-gray-900">⚡ Small Tasks & To Do</h2>
          <p className="text-xs text-gray-500">{openCount} aperti · {records.length} totali</p>
        </div>
      </div>

      {/* View tabs */}
      <div className="flex border-b border-gray-200 gap-1">
        {(['lista', 'kanban', 'categoria'] as SmallView[]).map(v => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-all capitalize ${
              view === v ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {v === 'lista' ? '☰ Lista' : v === 'kanban' ? '▦ Kanban' : '◈ Categoria'}
          </button>
        ))}
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap gap-x-6 gap-y-2 items-start">
        {/* Categoria */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-gray-500 font-medium uppercase tracking-wide">Cat</span>
          {CATEGORIES.map(c => {
            const key = c.code ?? '__none__'
            const active = filterCats.has(key)
            const color = categoryColor(c.code)
            return (
              <button
                key={key}
                onClick={() => toggleCat(key)}
                className="text-xs px-2.5 py-1 rounded-full border transition-all"
                style={active
                  ? { backgroundColor: color, color: 'white', borderColor: color }
                  : { backgroundColor: 'white', color: '#6B7280', borderColor: '#E5E7EB' }
                }
              >
                {c.label}
              </button>
            )
          })}
        </div>

        {/* Priorità */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-gray-500 font-medium uppercase tracking-wide">Pri</span>
          <button
            onClick={() => setFilterPriority(null)}
            className={`text-xs px-2.5 py-1 rounded-full border transition-all ${
              filterPriority === null ? 'bg-gray-800 text-white border-gray-800' : 'border-gray-200 bg-white text-gray-500'
            }`}
          >
            Tutte
          </button>
          {PRIORITIES.map(p => (
            <button
              key={p.value}
              onClick={() => setFilterPriority(filterPriority === p.value ? null : p.value)}
              className="text-xs px-2.5 py-1 rounded-full border transition-all"
              style={filterPriority === p.value
                ? { backgroundColor: p.color, color: 'white', borderColor: p.color }
                : { backgroundColor: 'white', color: '#6B7280', borderColor: '#E5E7EB' }
              }
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Stato (solo lista) */}
        {view === 'lista' && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 font-medium uppercase tracking-wide">Stato</span>
            {(['aperti', 'tutti', 'chiusi'] as SmallStatusFilter[]).map(s => (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                className={`text-xs px-2.5 py-1 rounded-full border transition-all capitalize ${
                  filterStatus === s ? 'bg-blue-700 text-white border-blue-700' : 'border-gray-200 bg-white text-gray-500'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {/* Sort */}
        <div className="flex items-center gap-2 ml-auto">
          <select
            value={sort}
            onChange={e => setSort(e.target.value as SmallSort)}
            className="border border-gray-200 rounded px-2 py-1 text-xs text-gray-700 bg-white"
          >
            <option value="priorita">↑ Priorità</option>
            <option value="scadenza">↑ Scadenza</option>
            <option value="creazione">↓ Recenti</option>
          </select>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <LoadingState />
      ) : view === 'lista' ? (
        <ListaView
          records={filterStatus === 'aperti' ? viewRecords.filter(r => r.rec_status !== 'chiuso') : viewRecords}
          onToggle={handleToggle}
          onDelete={deleteTask}
          onAdd={addTask}
        />
      ) : view === 'kanban' ? (
        <KanbanView
          records={viewRecords}
          onMove={handleMove}
          onDelete={deleteTask}
          onAdd={addTask}
        />
      ) : (
        <CategoriaView
          records={viewRecords}
          onToggle={handleToggle}
          onDelete={deleteTask}
          onAdd={addTask}
        />
      )}
    </div>
  )
}

function LoadingState() {
  return (
    <div className="flex flex-col gap-2">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="h-10 bg-gray-100 rounded-lg animate-pulse" />
      ))}
    </div>
  )
}
