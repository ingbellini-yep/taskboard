import type { Workspace } from '../types'
import type { TbRecord } from '../types'

interface Props {
  workspace: Workspace
  records: TbRecord[]
  filterWs: string | null
  onFilterClick: (code: string | null) => void
}

export function WorkspaceHeader({ workspace: ws, records, filterWs, onFilterClick }: Props) {
  const count = records.filter(r => r.rec_ws_code === ws.ws_code).length
  const active = filterWs === ws.ws_code

  return (
    <button
      onClick={() => onFilterClick(active ? null : ws.ws_code)}
      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm font-medium transition-all ${
        active
          ? 'text-white border-transparent'
          : 'text-gray-600 border-gray-200 hover:border-gray-400 bg-white'
      }`}
      style={active ? { backgroundColor: ws.ws_color, borderColor: ws.ws_color } : {}}
    >
      <span>{ws.ws_icon}</span>
      <span>{ws.ws_code}</span>
      {count > 0 && (
        <span
          className="text-xs px-1.5 py-0.5 rounded-full font-bold"
          style={{
            backgroundColor: active ? 'rgba(255,255,255,0.25)' : ws.ws_color + '22',
            color: active ? 'white' : ws.ws_color,
          }}
        >
          {count}
        </span>
      )}
    </button>
  )
}
