import { useState } from 'react'
import { useRecordItems } from '../hooks/useRecordItems'
import type { TbRecordItem } from '../types'

const PRIORITIES = [
  { value: 1, label: 'Alta',    color: '#C62828' },
  { value: 2, label: 'Normale', color: '#1565C0' },
  { value: 3, label: 'Bassa',   color: '#757575' },
]

function priColor(p: number | null): string {
  return PRIORITIES.find(x => x.value === p)?.color ?? '#9CA3AF'
}

function fmtDue(date: string | null): { label: string; color: string } | null {
  if (!date) return null
  const d = new Date(date)
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const diff = Math.round((d.getTime() - today.getTime()) / 86400000)
  const fmt = d.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' })
  const color = diff < 0 ? '#C62828' : diff === 0 ? '#E65100' : '#757575'
  const label = diff < 0 ? `Scad. ${fmt}` : diff === 0 ? 'Oggi' : diff === 1 ? 'Domani' : fmt
  return { label, color }
}

export function SubtaskSection({ parentId }: { parentId: string }) {
  const { items, doneCount, add, toggleDone, editText, remove } = useRecordItems(parentId, 'subtask')

  const [adding, setAdding] = useState(false)
  const [newText, setNewText] = useState('')
  const [newPri, setNewPri] = useState<number | null>(null)
  const [newDue, setNewDue] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editVal, setEditVal] = useState('')

  async function handleAdd() {
    if (!newText.trim()) return
    await add(newText.trim(), { priority: newPri, dueDate: newDue || null })
    setNewText(''); setNewPri(null); setNewDue(''); setAdding(false)
  }

  async function saveEdit(id: string) {
    if (editVal.trim()) await editText(id, editVal.trim())
    setEditingId(null)
  }

  const pct = items.length > 0 ? Math.round((doneCount / items.length) * 100) : 0

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-400 uppercase tracking-wide">Sub-task</span>
        {items.length > 0 && (
          <span className="text-xs font-medium text-gray-500">{doneCount}/{items.length}</span>
        )}
        <button
          onClick={() => setAdding(a => !a)}
          className="ml-auto text-xs text-blue-600 hover:text-blue-800 font-medium"
        >
          {adding ? 'Annulla' : '+ Aggiungi'}
        </button>
      </div>

      {/* Barra avanzamento */}
      {items.length > 0 && (
        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full bg-green-500 transition-all" style={{ width: `${pct}%` }} />
        </div>
      )}

      {/* Form aggiunta */}
      {adding && (
        <div className="border border-blue-200 bg-blue-50 rounded-lg p-2.5 flex flex-col gap-2">
          <input
            autoFocus
            value={newText}
            onChange={e => setNewText(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleAdd(); if (e.key === 'Escape') setAdding(false) }}
            placeholder="Titolo sub-task…"
            className="border border-gray-200 rounded px-2 py-1.5 text-sm bg-white focus:outline-none focus:border-blue-500"
          />
          <div className="flex flex-wrap gap-2 items-center">
            <select
              value={newPri ?? ''}
              onChange={e => setNewPri(e.target.value ? Number(e.target.value) : null)}
              className="border border-gray-200 rounded px-2 py-1 text-xs bg-white text-gray-700"
            >
              <option value="">Priorità —</option>
              {PRIORITIES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
            <input
              type="date"
              value={newDue}
              onChange={e => setNewDue(e.target.value)}
              className="border border-gray-200 rounded px-2 py-1 text-xs bg-white text-gray-700"
            />
            <button
              onClick={handleAdd}
              disabled={!newText.trim()}
              className="ml-auto text-xs bg-blue-700 text-white px-3 py-1 rounded hover:bg-blue-800 disabled:opacity-50 font-medium"
            >
              Aggiungi
            </button>
          </div>
        </div>
      )}

      {/* Lista sub-task */}
      <div className="flex flex-col gap-1">
        {items.map(it => (
          <SubtaskRow
            key={it.item_id}
            item={it}
            editing={editingId === it.item_id}
            editVal={editVal}
            onToggle={() => toggleDone(it)}
            onStartEdit={() => { setEditingId(it.item_id); setEditVal(it.item_text) }}
            onChangeEdit={setEditVal}
            onSaveEdit={() => saveEdit(it.item_id)}
            onCancelEdit={() => setEditingId(null)}
            onRemove={() => remove(it.item_id)}
          />
        ))}
      </div>
    </div>
  )
}

function SubtaskRow({
  item: it, editing, editVal,
  onToggle, onStartEdit, onChangeEdit, onSaveEdit, onCancelEdit, onRemove,
}: {
  item: TbRecordItem
  editing: boolean
  editVal: string
  onToggle: () => void
  onStartEdit: () => void
  onChangeEdit: (v: string) => void
  onSaveEdit: () => void
  onCancelEdit: () => void
  onRemove: () => void
}) {
  const due = fmtDue(it.item_due_date)

  return (
    <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-50 group">
      <button
        onClick={onToggle}
        className={`w-4 h-4 shrink-0 rounded border-2 flex items-center justify-center transition-colors ${
          it.item_done ? 'bg-green-500 border-green-500 text-white' : 'border-gray-300 hover:border-blue-500'
        }`}
      >
        {it.item_done && <span className="text-[10px] leading-none">✓</span>}
      </button>

      {editing ? (
        <input
          autoFocus
          value={editVal}
          onChange={e => onChangeEdit(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') onSaveEdit(); if (e.key === 'Escape') onCancelEdit() }}
          onBlur={onSaveEdit}
          className="flex-1 border border-blue-300 rounded px-2 py-0.5 text-sm bg-white focus:outline-none"
        />
      ) : (
        <span
          onClick={onStartEdit}
          className={`flex-1 text-sm cursor-text ${it.item_done ? 'line-through text-gray-400' : 'text-gray-800'}`}
        >
          {it.item_text}
        </span>
      )}

      {/* Priorità dot (toggle ciclico) */}
      {it.item_priority && !it.item_done && (
        <span
          className="w-2 h-2 rounded-full shrink-0"
          style={{ backgroundColor: priColor(it.item_priority) }}
          title={PRIORITIES.find(p => p.value === it.item_priority)?.label}
        />
      )}

      {/* Scadenza */}
      {due && !it.item_done && (
        <span className="text-xs font-medium shrink-0" style={{ color: due.color }}>⏰ {due.label}</span>
      )}

      <button
        onClick={onRemove}
        className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500 text-xs transition-opacity shrink-0"
        title="Elimina sub-task"
      >
        ✕
      </button>
    </div>
  )
}
