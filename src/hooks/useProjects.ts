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
