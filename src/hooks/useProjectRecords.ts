import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { TbRecord } from '../types'

/**
 * Recupera TUTTI i record di un progetto (qualsiasi stato, tipo, bucket).
 * Usato dalla vista Progetto per mostrare la storia completa.
 */
export function useProjectRecords(prjId: string | null) {
  const [records, setRecords] = useState<TbRecord[]>([])
  const [loading, setLoading] = useState(false)

  const fetch = useCallback(async () => {
    if (!prjId) { setRecords([]); return }
    setLoading(true)
    const { data } = await supabase
      .from('tb_records')
      .select(`
        *,
        tb_projects!rec_prj_id ( prj_label ),
        tb_workspaces!rec_ws_id ( ws_label, ws_color, ws_icon )
      `)
      .eq('rec_prj_id', prjId)
      .order('rec_created_at', { ascending: false })

    const normalized = (data ?? []).map((r: Record<string, unknown>) => ({
      ...r,
      prj_label: (r.tb_projects as { prj_label: string } | null)?.prj_label ?? null,
      ws_label:  (r.tb_workspaces as { ws_label: string; ws_color: string; ws_icon: string } | null)?.ws_label ?? null,
      ws_color:  (r.tb_workspaces as { ws_label: string; ws_color: string; ws_icon: string } | null)?.ws_color ?? null,
      ws_icon:   (r.tb_workspaces as { ws_label: string; ws_color: string; ws_icon: string } | null)?.ws_icon ?? null,
    })) as TbRecord[]
    setRecords(normalized)
    setLoading(false)
  }, [prjId])

  useEffect(() => { fetch() }, [fetch])

  useEffect(() => {
    if (!prjId) return
    const channel = supabase
      .channel(`tb_prj_records_${prjId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tb_records' }, fetch)
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [fetch, prjId])

  return { records, loading, refetch: fetch }
}
