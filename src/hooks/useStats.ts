import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export interface UrgentRecord {
  rec_code: string | null
  rec_title: string
}

export interface Stats {
  urgenti: number
  alta: number
  normale: number
  sospesi: number
  totali: number
  urgentRecords: UrgentRecord[]
  progettiAttivi: number
  lastUpdated: Date
}

const DEFAULT_STATS: Stats = {
  urgenti: 0, alta: 0, normale: 0, sospesi: 0, totali: 0,
  urgentRecords: [], progettiAttivi: 0, lastUpdated: new Date(),
}

export function useStats() {
  const [stats, setStats] = useState<Stats>(DEFAULT_STATS)

  const fetchStats = useCallback(async () => {
    const [recordsRes, projectsRes] = await Promise.all([
      supabase
        .from('tb_records')
        .select('rec_priority, rec_status, rec_code, rec_title')
        .eq('rec_bucket', 'project')
        .in('rec_status', ['aperto', 'in_progress', 'sospeso']),
      supabase
        .from('tb_projects')
        .select('prj_id', { count: 'exact', head: true })
        .eq('prj_status', 'active'),
    ])

    const recs = recordsRes.data ?? []
    const progettiAttivi = projectsRes.count ?? 0

    const urgentRecords = recs
      .filter(r => r.rec_priority === 1 && (r.rec_status === 'aperto' || r.rec_status === 'in_progress'))
      .slice(0, 5)

    setStats({
      urgenti: urgentRecords.length,
      alta: recs.filter(r => r.rec_priority === 1).length,
      normale: recs.filter(r => r.rec_priority === 2).length,
      sospesi: recs.filter(r => r.rec_status === 'sospeso').length,
      totali: recs.length,
      urgentRecords,
      progettiAttivi,
      lastUpdated: new Date(),
    })
  }, [])

  useEffect(() => { fetchStats() }, [fetchStats])

  useEffect(() => {
    const channel = supabase
      .channel('tb_stats_channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tb_records' }, fetchStats)
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [fetchStats])

  return stats
}
