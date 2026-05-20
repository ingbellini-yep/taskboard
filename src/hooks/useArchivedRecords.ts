import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { TbRecord } from '../types'

export function useArchivedRecords() {
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
      .eq('rec_status', 'archiviato')
      .order('rec_updated_at', { ascending: false })

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

  useEffect(() => {
    const channel = supabase
      .channel('tb_records_archiviati')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tb_records' }, fetch)
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [fetch])

  return { records, loading, error }
}
