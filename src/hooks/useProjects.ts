import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Project } from '../types'

export function useProjects() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)

  const refetch = useCallback(async () => {
    const { data } = await supabase
      .from('tb_projects')
      .select('*')
      .in('prj_status', ['active', 'suspended'])
      .order('prj_updated_at', { ascending: false })
    if (data) setProjects(data as Project[])
    setLoading(false)
  }, [])

  useEffect(() => { refetch() }, [refetch])

  return { projects, loading, refetch }
}

export interface DeleteProjectResult {
  prj_code: string
  prj_label: string
  records_deleted: number
  purchases_unlinked: number
}

export interface MergeProjectsResult {
  source_code: string
  target_code: string
  target_id: string
  records_moved: number
  purchases_moved: number
}

/** Elimina definitivamente un progetto e tutti i suoi record (RPC atomica tb_delete_project). */
export async function deleteProject(prjId: string): Promise<{ data: DeleteProjectResult | null; error: string | null }> {
  const { data, error } = await supabase.rpc('tb_delete_project', { p_prj_id: prjId })
  if (error) return { data: null, error: error.message }
  return { data: data as DeleteProjectResult, error: null }
}

/**
 * Fonde il progetto `sourceId` nel progetto `targetId` (RPC atomica tb_merge_projects):
 * i record della sorgente vengono spostati e rinumerati nella destinazione, la sorgente è eliminata.
 */
export async function mergeProjects(sourceId: string, targetId: string): Promise<{ data: MergeProjectsResult | null; error: string | null }> {
  const { data, error } = await supabase.rpc('tb_merge_projects', { p_source_id: sourceId, p_target_id: targetId })
  if (error) return { data: null, error: error.message }
  return { data: data as MergeProjectsResult, error: null }
}
