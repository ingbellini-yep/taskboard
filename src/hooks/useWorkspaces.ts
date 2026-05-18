import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Workspace } from '../types'

export function useWorkspaces() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('tb_workspaces')
      .select('*')
      .eq('ws_active', true)
      .order('ws_sort_order')
      .then(({ data }) => {
        if (data) setWorkspaces(data as Workspace[])
        setLoading(false)
      })
  }, [])

  return { workspaces, loading }
}
