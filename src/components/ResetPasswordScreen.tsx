import { useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { supabase, INITIAL_URL_HASH } from '../lib/supabase'

interface Props {
  /** true se il link di recupero ha aperto una sessione valida. */
  hasSession: boolean
  /** Password aggiornata: si entra nell'app. */
  onDone: () => void
  /** Link non valido: ritorno alla schermata di accesso. */
  onBackToLogin: () => void
}

const MIN_LENGTH = 8

/** Pagina /reset: imposta la nuova password dopo il link ricevuto via email. */
export function ResetPasswordScreen({ hasSession, onDone, onBackToLogin }: Props) {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  // Errore riportato da Supabase nel frammento dell'URL (es. link scaduto o già usato)
  const linkError = useMemo(() => {
    const params = new URLSearchParams(INITIAL_URL_HASH.replace(/^#/, ''))
    return params.has('error_code') || params.has('error')
  }, [])

  const mismatch = confirm.length > 0 && password !== confirm
  const canSave = password.length >= MIN_LENGTH && password === confirm && !busy

  async function handleSave(e: FormEvent) {
    e.preventDefault()
    if (!canSave) return
    setBusy(true)
    setError(null)
    const { error: err } = await supabase.auth.updateUser({ password })
    setBusy(false)
    if (err) {
      setError(/different from the old/i.test(err.message)
        ? 'La nuova password deve essere diversa dalla precedente.'
        : `Aggiornamento non riuscito: ${err.message}`)
      return
    }
    setDone(true)
  }

  const inputCls = 'border border-gray-200 rounded-lg px-3 py-2.5 text-base text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500'

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10" style={{ backgroundColor: '#1E1E2E' }}>
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <h1 className="text-white font-bold text-lg">Task Board</h1>
          <p className="text-xs mt-1" style={{ color: '#9E9E9E' }}>Ing. Epifanio Bellini</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <span className="font-semibold text-gray-900">Nuova password</span>
          </div>

          {!hasSession ? (
            <div className="px-6 py-5 flex flex-col gap-4">
              <p role="alert" className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                ⚠️ {linkError
                  ? 'Il link di recupero è scaduto o è già stato usato.'
                  : 'Link di recupero non valido o mancante.'}
              </p>
              <p className="text-xs text-gray-500 leading-relaxed">
                Richiedi un nuovo link dalla schermata di accesso con «Password dimenticata?».
              </p>
              <button
                onClick={onBackToLogin}
                className="px-4 py-2.5 bg-blue-700 hover:bg-blue-800 text-white text-sm font-medium rounded-lg"
              >
                Vai all'accesso
              </button>
            </div>
          ) : done ? (
            <div className="px-6 py-5 flex flex-col gap-4">
              <p role="status" className="text-xs text-green-800 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                ✓ Password aggiornata.
              </p>
              <button
                onClick={onDone}
                className="px-4 py-2.5 bg-blue-700 hover:bg-blue-800 text-white text-sm font-medium rounded-lg"
              >
                Apri il Taskboard
              </button>
            </div>
          ) : (
            <form onSubmit={handleSave} className="px-6 py-5 flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <label htmlFor="tb-reset-new" className="text-xs text-gray-500">Nuova password (almeno {MIN_LENGTH} caratteri)</label>
                <input
                  id="tb-reset-new"
                  type="password"
                  name="new-password"
                  autoComplete="new-password"
                  required
                  minLength={MIN_LENGTH}
                  autoFocus
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className={inputCls}
                />
              </div>
              <div className="flex flex-col gap-1">
                <label htmlFor="tb-reset-confirm" className="text-xs text-gray-500">Ripeti la password</label>
                <input
                  id="tb-reset-confirm"
                  type="password"
                  name="confirm-password"
                  autoComplete="new-password"
                  required
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  className={inputCls}
                />
                {mismatch && <span className="text-xs text-red-600">Le due password non coincidono.</span>}
              </div>

              {error && (
                <p role="alert" className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">⚠️ {error}</p>
              )}

              <button
                type="submit"
                disabled={!canSave}
                className="mt-1 px-4 py-2.5 bg-blue-700 hover:bg-blue-800 text-white text-sm font-medium rounded-lg disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {busy && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                Salva nuova password
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
