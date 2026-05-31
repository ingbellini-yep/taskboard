import { useState } from 'react'
import { useRecordItems } from '../hooks/useRecordItems'
import type { TbRecordItem } from '../types'

function fmtTs(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' }) +
    ' · ' + d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
}

export function UpdatesTimeline({ parentId }: { parentId: string }) {
  const { items, add, editText, remove } = useRecordItems(parentId, 'update')

  const [newText, setNewText] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editVal, setEditVal] = useState('')

  async function handleAdd() {
    if (!newText.trim()) return
    await add(newText.trim())
    setNewText('')
  }

  async function saveEdit(id: string) {
    if (editVal.trim()) await editText(id, editVal.trim())
    setEditingId(null)
  }

  // Più recenti in cima per la lettura, ma items arriva asc → invertiamo per display
  const ordered = [...items].reverse()

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-400 uppercase tracking-wide">Aggiornamenti</span>
        {items.length > 0 && <span className="text-xs font-medium text-gray-500">{items.length}</span>}
      </div>

      {/* Box nuovo aggiornamento */}
      <div className="flex gap-2">
        <textarea
          value={newText}
          onChange={e => setNewText(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleAdd() }}
          placeholder="Aggiungi un aggiornamento… (Ctrl+Invio per salvare)"
          rows={2}
          className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-blue-500 resize-none"
        />
        <button
          onClick={handleAdd}
          disabled={!newText.trim()}
          className="shrink-0 self-end bg-blue-700 text-white text-xs px-3 py-2 rounded-lg hover:bg-blue-800 disabled:opacity-50 font-medium"
        >
          Aggiungi
        </button>
      </div>

      {/* Timeline */}
      {ordered.length > 0 && (
        <div className="flex flex-col gap-0 mt-1">
          {ordered.map((it, idx) => (
            <UpdateRow
              key={it.item_id}
              item={it}
              isLast={idx === ordered.length - 1}
              editing={editingId === it.item_id}
              editVal={editVal}
              onStartEdit={() => { setEditingId(it.item_id); setEditVal(it.item_text) }}
              onChangeEdit={setEditVal}
              onSaveEdit={() => saveEdit(it.item_id)}
              onCancelEdit={() => setEditingId(null)}
              onRemove={() => remove(it.item_id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function UpdateRow({
  item: it, isLast, editing, editVal,
  onStartEdit, onChangeEdit, onSaveEdit, onCancelEdit, onRemove,
}: {
  item: TbRecordItem
  isLast: boolean
  editing: boolean
  editVal: string
  onStartEdit: () => void
  onChangeEdit: (v: string) => void
  onSaveEdit: () => void
  onCancelEdit: () => void
  onRemove: () => void
}) {
  const edited = it.item_updated_at !== it.item_created_at

  return (
    <div className="flex gap-3 group">
      {/* Linea temporale */}
      <div className="flex flex-col items-center shrink-0">
        <div className="w-2 h-2 rounded-full bg-blue-400 mt-1.5" />
        {!isLast && <div className="w-px flex-1 bg-gray-200 my-1" />}
      </div>

      {/* Contenuto */}
      <div className="flex-1 pb-3 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">{fmtTs(it.item_created_at)}</span>
          {edited && <span className="text-xs text-gray-300 italic">(modificato)</span>}
          <div className="ml-auto flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            {!editing && (
              <button onClick={onStartEdit} className="text-xs text-gray-400 hover:text-blue-600" title="Modifica">✏️</button>
            )}
            <button onClick={onRemove} className="text-xs text-gray-400 hover:text-red-500" title="Elimina">✕</button>
          </div>
        </div>
        {editing ? (
          <textarea
            autoFocus
            value={editVal}
            onChange={e => onChangeEdit(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) onSaveEdit()
              if (e.key === 'Escape') onCancelEdit()
            }}
            onBlur={onSaveEdit}
            rows={2}
            className="w-full mt-1 border border-blue-300 rounded px-2 py-1 text-sm bg-white focus:outline-none resize-none"
          />
        ) : (
          <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap mt-0.5">{it.item_text}</p>
        )}
      </div>
    </div>
  )
}
