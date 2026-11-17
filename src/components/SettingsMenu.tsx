import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../auth/AuthGate'

/** Menu Impostazioni nell'header: account in uso e uscita. */
export function SettingsMenu() {
  const { user, signOut } = useAuth()
  const [open, setOpen] = useState(false)
  const [leaving, setLeaving] = useState(false)
  const boxRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  async function handleSignOut() {
    if (leaving) return
    setLeaving(true)
    await signOut()
  }

  return (
    <div ref={boxRef} className="relative shrink-0">
      <button
        onClick={() => setOpen(o => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        title="Impostazioni"
        className="text-sm font-medium px-3 py-1.5 rounded-lg border border-white/15 bg-white/10 text-white hover:bg-white/20 transition-colors"
      >
        ⚙<span className="hidden sm:inline"> Impostazioni</span>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-gray-200 z-50 overflow-hidden"
        >
          <div className="px-4 py-3 border-b border-gray-100">
            <div className="text-xs text-gray-400 uppercase tracking-wide">Account</div>
            <div className="text-sm text-gray-800 truncate" title={user.email ?? ''}>{user.email ?? '—'}</div>
          </div>
          <button
            role="menuitem"
            onClick={handleSignOut}
            disabled={leaving}
            className="w-full text-left px-4 py-3 text-sm text-red-700 hover:bg-red-50 disabled:opacity-50"
          >
            {leaving ? 'Uscita…' : '⎋ Esci da questo dispositivo'}
          </button>
        </div>
      )}
    </div>
  )
}
