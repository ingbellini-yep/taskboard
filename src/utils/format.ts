export function formatDate(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export function formatDateTime(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' }) +
    ' ' + d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
}

export function isOverdue(iso: string | null): boolean {
  if (!iso) return false
  return new Date(iso) < new Date()
}

export function kindLabel(kind: string): string {
  return kind === 'T' ? 'Task' : kind === 'M' ? 'Memo' : 'Event'
}

export function kindBadgeColor(kind: string): string {
  return kind === 'T'
    ? 'bg-blue-600 text-white'
    : kind === 'M'
    ? 'bg-purple-600 text-white'
    : 'bg-orange-500 text-white'
}

export function priorityLabel(p: number): string {
  return p === 1 ? 'alta' : p === 3 ? 'bassa' : 'normale'
}

export function priorityBadgeColor(p: number): string {
  return p === 1
    ? 'bg-red-100 text-red-700 border border-red-300'
    : p === 3
    ? 'bg-gray-100 text-gray-500 border border-gray-300'
    : 'bg-yellow-50 text-yellow-700 border border-yellow-300'
}

export function statusLabel(s: string): string {
  const map: Record<string, string> = {
    aperto: 'Aperto',
    in_progress: 'In corso',
    sospeso: 'Sospeso',
    chiuso: 'Chiuso',
    archiviato: 'Archiviato',
  }
  return map[s] ?? s
}

export function dueDateLabel(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const diff = Math.ceil((d.getTime() - today.getTime()) / 86400000)
  if (diff < 0) return `Scaduto ${Math.abs(diff)}g fa`
  if (diff === 0) return 'Scade oggi'
  if (diff === 1) return 'Scade domani'
  if (diff <= 7) return `Scade in ${diff}g`
  return formatDate(iso)
}
