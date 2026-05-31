import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { TbRecord } from '../types'

export type SmallCategory = 'LP' | 'RB' | 'PNRR' | 'FAM' | 'PERS' | null
export type SmallStatus = 'aperto' | 'in_progress' | 'chiuso'
export type SmallView = 'lista' | 'kanban' | 'categoria'
export type SmallStatusFilter = 'aperti' | 'tutti' | 'chiusi'
export type SmallSort = 'priorita' | 'scadenza' | 'creazione'

// SMALL project UUID — creato una tantum via migration
export const SMALL_PRJ_ID = 'fb30b6d8-1590-41b5-af7d-fce6533b5e01'

export const CATEGORY_COLORS: Record<string, string> = {
  LP:   '#1565C0',
  RB:   '#2E7D32',
  PNRR: '#E65100',
  FAM:  '#AD1457',
  PERS: '#6A1B9A',
}

export const CATEGORY_LABELS: Record<string, string> = {
  LP:   'LP',
  RB:   'RB',
  PNRR: 'PNRR',
  FAM:  'FAM',
  PERS: 'PERS',
}

export function categoryColor(code: string | null): string {
  return code ? (CATEGORY_COLORS[code] ?? '#757575') : '#757575'
}

export function categoryLabel(code: string | null): string {
  return code ? (CATEGORY_LABELS[code] ?? code) : 'Nessuna'
}

export function sortSmall(records: TbRecord[], sortBy: SmallSort): TbRecord[] {
  return [...records].sort((a, b) => {
    if (sortBy === 'priorita') {
      if (a.rec_priority !== b.rec_priority) return a.rec_priority - b.rec_priority
      if (!a.rec_due_date && !b.rec_due_date) return 0
      if (!a.rec_due_date) return 1
      if (!b.rec_due_date) return -1
      return new Date(a.rec_due_date).getTime() - new Date(b.rec_due_date).getTime()
    }
    if (sortBy === 'scadenza') {
      if (!a.rec_due_date && !b.rec_due_date) return 0
      if (!a.rec_due_date) return 1
      if (!b.rec_due_date) return -1
      return new Date(a.rec_due_date).getTime() - new Date(b.rec_due_date).getTime()
    }
    return new Date(b.rec_created_at).getTime() - new Date(a.rec_created_at).getTime()
  })
}

export function useSmallTasks() {
  const [records, setRecords] = useState<TbRecord[]>([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('tb_records')
      .select('*')
      .eq('rec_bucket', 'small_tasks')
      .order('rec_priority', { ascending: true })
      .order('rec_due_date', { ascending: true, nullsFirst: false })
      .order('rec_created_at', { ascending: false })

    setRecords((data ?? []) as TbRecord[])
    setLoading(false)
  }, [])

  useEffect(() => { fetch() }, [fetch])

  useEffect(() => {
    const channel = supabase
      .channel('tb_small_tasks')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tb_records' }, () => fetch())
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [fetch])

  async function addTask(params: {
    title: string
    priority: number
    category: SmallCategory
    dueDate: string | null
  }) {
    await supabase.from('tb_records').insert({
      rec_title:    params.title,
      rec_kind:     'T',
      rec_status:   'aperto',
      rec_bucket:   'small_tasks',
      rec_priority: params.priority,
      rec_ws_code:  params.category,
      rec_prj_id:   SMALL_PRJ_ID,
      rec_due_date: params.dueDate,
      rec_source:   'web',
    })
  }

  async function updateStatus(recId: string, status: SmallStatus) {
    await supabase
      .from('tb_records')
      .update({
        rec_status:  status,
        rec_done_at: status === 'chiuso' ? new Date().toISOString() : null,
      })
      .eq('rec_id', recId)
  }

  async function deleteTask(recId: string) {
    await supabase.from('tb_records').delete().eq('rec_id', recId)
  }

  async function updatePriority(recId: string, priority: number) {
    await supabase.from('tb_records').update({ rec_priority: priority }).eq('rec_id', recId)
  }

  return { records, loading, addTask, updateStatus, deleteTask, updatePriority, refetch: fetch }
}
