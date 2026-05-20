import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { TbRecord } from '../types'

// Fetches board records (non-inbox, non-archived) with workspace/project joins
export function useRecords() {
  const [records, setRecords] = useState<TbRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('tb_records')
      .select(`
        *,
        tb_projects!rec_prj_id ( prj_label ),
        tb_workspaces!rec_ws_id ( ws_label, ws_color, ws_icon )
      `)
      .eq('rec_bucket', 'project')
      .in('rec_status', ['aperto', 'in_progress', 'sospeso'])
      .order('rec_priority', { ascending: true })
      .order('rec_due_date', { ascending: true, nullsFirst: false })

    if (error) {
      setError(error.message)
    } else {
      const normalized = (data ?? []).map((r: Record<string, unknown>) => ({
        ...r,
        prj_label: (r.tb_projects as { prj_label: string } | null)?.prj_label ?? null,
        ws_label: (r.tb_workspaces as { ws_label: string; ws_color: string; ws_icon: string } | null)?.ws_label ?? null,
        ws_color: (r.tb_workspaces as { ws_label: string; ws_color: string; ws_icon: string } | null)?.ws_color ?? null,
        ws_icon: (r.tb_workspaces as { ws_label: string; ws_color: string; ws_icon: string } | null)?.ws_icon ?? null,
      })) as TbRecord[]
      setRecords(normalized)
    }
    setLoading(false)
  }, [])

  useEffect(() => { fetch() }, [fetch])

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('tb_records_board')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tb_records' }, () => { fetch() })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [fetch])

  return { records, loading, error, refetch: fetch }
}

// Fetches inbox records
export function useInboxRecords() {
  const [records, setRecords] = useState<TbRecord[]>([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('tb_records')
      .select(`
        *,
        tb_workspaces!rec_ws_id ( ws_label, ws_color, ws_icon )
      `)
      .eq('rec_bucket', 'inbox')
      .not('rec_status', 'in', '("chiuso","archiviato")')
      .order('rec_created_at', { ascending: false })

    const normalized = (data ?? []).map((r: Record<string, unknown>) => ({
      ...r,
      prj_label: null,
      ws_label: (r.tb_workspaces as { ws_label: string; ws_color: string; ws_icon: string } | null)?.ws_label ?? null,
      ws_color: (r.tb_workspaces as { ws_label: string; ws_color: string; ws_icon: string } | null)?.ws_color ?? null,
      ws_icon: (r.tb_workspaces as { ws_label: string; ws_color: string; ws_icon: string } | null)?.ws_icon ?? null,
    })) as TbRecord[]
    setRecords(normalized)
    setLoading(false)
  }, [])

  useEffect(() => { fetch() }, [fetch])

  useEffect(() => {
    const channel = supabase
      .channel('tb_records_inbox')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tb_records' }, () => { fetch() })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [fetch])

  return { records, loading, refetch: fetch }
}

export async function closeRecord(recId: string, hours: number | null = null): Promise<void> {
  await supabase
    .from('tb_records')
    .update({
      rec_status: 'chiuso',
      rec_done_at: new Date().toISOString(),
      rec_hours: hours,
    })
    .eq('rec_id', recId)
}

export async function deleteRecord(recId: string): Promise<void> {
  await supabase.from('tb_records').delete().eq('rec_id', recId)
}

export async function archiveRecord(recId: string): Promise<void> {
  await supabase
    .from('tb_records')
    .update({ rec_status: 'archiviato' })
    .eq('rec_id', recId)
}

export async function restoreRecord(recId: string): Promise<void> {
  await supabase
    .from('tb_records')
    .update({ rec_status: 'aperto' })
    .eq('rec_id', recId)
}

export async function assignToProject(recId: string, prjId: string, prjCode: string, wsId: string, wsCode: string): Promise<void> {
  const code = await generateRecordCode(prjId, 'T')
  await supabase
    .from('tb_records')
    .update({
      rec_bucket: 'project',
      rec_prj_id: prjId,
      rec_prj_code: prjCode,
      rec_ws_id: wsId,
      rec_ws_code: wsCode,
      rec_code: code,
    })
    .eq('rec_id', recId)
}

export async function moveToSmallTasks(recId: string): Promise<void> {
  await supabase
    .from('tb_records')
    .update({ rec_bucket: 'small_tasks', rec_prj_id: null, rec_prj_code: null })
    .eq('rec_id', recId)
}

async function generateRecordCode(prjId: string, kind: string): Promise<string> {
  const { data } = await supabase.rpc('tb_generate_record_code', { p_prj_id: prjId, p_kind: kind })
  return data as string
}
