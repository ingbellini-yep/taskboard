import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { TbRecordItem, RecordItemKind } from '../types'

/**
 * Gestisce sub-task (kind='subtask') o aggiornamenti (kind='update')
 * di un record padre. Realtime + CRUD.
 */
export function useRecordItems(parentId: string, kind: RecordItemKind) {
  const [items, setItems] = useState<TbRecordItem[]>([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('tb_record_items')
      .select('*')
      .eq('item_parent_id', parentId)
      .eq('item_kind', kind)
      .order('item_sort', { ascending: true })
      .order('item_created_at', { ascending: true })
    setItems((data ?? []) as TbRecordItem[])
    setLoading(false)
  }, [parentId, kind])

  useEffect(() => { fetch() }, [fetch])

  useEffect(() => {
    const channel = supabase
      .channel(`tb_record_items_${parentId}_${kind}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tb_record_items', filter: `item_parent_id=eq.${parentId}` },
        fetch
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [fetch, parentId, kind])

  async function add(text: string, opts?: { priority?: number | null; dueDate?: string | null }) {
    const sort = items.length > 0 ? Math.max(...items.map(i => i.item_sort)) + 1 : 0
    await supabase.from('tb_record_items').insert({
      item_parent_id: parentId,
      item_kind:      kind,
      item_text:      text,
      item_priority:  opts?.priority ?? null,
      item_due_date:  opts?.dueDate ?? null,
      item_sort:      sort,
    })
  }

  async function toggleDone(item: TbRecordItem) {
    const done = !item.item_done
    await supabase
      .from('tb_record_items')
      .update({ item_done: done, item_done_at: done ? new Date().toISOString() : null })
      .eq('item_id', item.item_id)
  }

  async function editText(itemId: string, text: string) {
    await supabase.from('tb_record_items').update({ item_text: text }).eq('item_id', itemId)
  }

  async function editFields(itemId: string, fields: { priority?: number | null; dueDate?: string | null }) {
    const payload: Record<string, unknown> = {}
    if ('priority' in fields) payload.item_priority = fields.priority
    if ('dueDate' in fields)  payload.item_due_date = fields.dueDate
    await supabase.from('tb_record_items').update(payload).eq('item_id', itemId)
  }

  async function remove(itemId: string) {
    await supabase.from('tb_record_items').delete().eq('item_id', itemId)
  }

  const doneCount = items.filter(i => i.item_done).length

  return { items, loading, doneCount, add, toggleDone, editText, editFields, remove, refetch: fetch }
}
