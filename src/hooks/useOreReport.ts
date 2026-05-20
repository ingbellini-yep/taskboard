import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export interface OreTask {
  rec_id: string
  rec_code: string | null
  rec_title: string
  rec_hours: number
  rec_done_at: string | null
}

export interface OreProgetto {
  prj_id: string
  prj_code: string
  prj_label: string
  ore_totali: number
  task_count: number
  tasks: OreTask[]
}

export interface OreWorkspace {
  ws_code: string
  ws_label: string
  ws_color: string
  ws_icon: string
  ws_sort_order: number
  ore_totali: number
  progetti: OreProgetto[]
}

export interface OreSummary {
  ore_totali: number
  task_chiusi: number
  progetti_count: number
}

export function useOreReport() {
  const [workspaces, setWorkspaces] = useState<OreWorkspace[]>([])
  const [summary, setSummary] = useState<OreSummary>({ ore_totali: 0, task_chiusi: 0, progetti_count: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetch() {
      setLoading(true)
      const { data, error } = await supabase
        .from('tb_records')
        .select(`
          rec_id, rec_code, rec_title, rec_hours, rec_done_at,
          rec_prj_id, rec_prj_code, rec_ws_id, rec_ws_code,
          tb_projects!rec_prj_id ( prj_label ),
          tb_workspaces!rec_ws_id ( ws_label, ws_color, ws_icon, ws_sort_order )
        `)
        .eq('rec_kind', 'T')
        .eq('rec_status', 'chiuso')
        .not('rec_hours', 'is', null)
        .order('rec_done_at', { ascending: false })

      if (error) {
        setError(error.message)
        setLoading(false)
        return
      }

      // Client-side grouping
      const wsMap = new Map<string, OreWorkspace>()
      const prjMap = new Map<string, OreProgetto>()

      for (const r of data ?? []) {
        const wsRaw = r.tb_workspaces as { ws_label: string; ws_color: string; ws_icon: string; ws_sort_order: number } | null
        const prjRaw = r.tb_projects as { prj_label: string } | null

        if (!r.rec_ws_code || !r.rec_prj_id || !r.rec_prj_code) continue
        const hours = Number(r.rec_hours)

        // Workspace
        if (!wsMap.has(r.rec_ws_code)) {
          wsMap.set(r.rec_ws_code, {
            ws_code: r.rec_ws_code,
            ws_label: wsRaw?.ws_label ?? r.rec_ws_code,
            ws_color: wsRaw?.ws_color ?? '#718096',
            ws_icon: wsRaw?.ws_icon ?? '',
            ws_sort_order: wsRaw?.ws_sort_order ?? 99,
            ore_totali: 0,
            progetti: [],
          })
        }
        const ws = wsMap.get(r.rec_ws_code)!
        ws.ore_totali = round2(ws.ore_totali + hours)

        // Progetto
        const prjKey = r.rec_prj_id
        if (!prjMap.has(prjKey)) {
          const prj: OreProgetto = {
            prj_id: r.rec_prj_id,
            prj_code: r.rec_prj_code,
            prj_label: prjRaw?.prj_label ?? r.rec_prj_code,
            ore_totali: 0,
            task_count: 0,
            tasks: [],
          }
          prjMap.set(prjKey, prj)
          ws.progetti.push(prj)
        }
        const prj = prjMap.get(prjKey)!
        prj.ore_totali = round2(prj.ore_totali + hours)
        prj.task_count += 1
        prj.tasks.push({
          rec_id: r.rec_id,
          rec_code: r.rec_code,
          rec_title: r.rec_title,
          rec_hours: hours,
          rec_done_at: r.rec_done_at,
        })
      }

      const wsList = Array.from(wsMap.values())
        .sort((a, b) => a.ws_sort_order - b.ws_sort_order)

      // Sort progetti by code within each workspace
      for (const ws of wsList) {
        ws.progetti.sort((a, b) => a.prj_code.localeCompare(b.prj_code))
      }

      const totaleOre = round2(wsList.reduce((s, w) => s + w.ore_totali, 0))
      const taskChiusi = Array.from(prjMap.values()).reduce((s, p) => s + p.task_count, 0)

      setWorkspaces(wsList)
      setSummary({ ore_totali: totaleOre, task_chiusi: taskChiusi, progetti_count: prjMap.size })
      setLoading(false)
    }

    fetch()
  }, [])

  return { workspaces, summary, loading, error }
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}
