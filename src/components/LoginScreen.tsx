import { useState } from 'react'
import type { FormEvent } from 'react'
import { supabase } from '../lib/supabase'

interface Props {
  /** Messaggio mostrato al rientro forzato sul login (es. sessione scaduta). */
  notice: string | null
  onNoticeShown: () => void
}

type Mode = 'login' | 'forgot'

/**
 * Schermata di accesso: email + password. Nessuna registrazione dall'app.
 * Include la richiesta del link di recupero password (pagina /reset).
 */
export function LoginScreen({ notice, onNoticeShown }: Props) {
  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)

  function switchMode(m: Mode) {
    setMode(m)
    setError(null)
    setInfo(null)
    setPassword('')
    onNoticeShown()
  }

  async function handleLogin(e: FormEvent) {
    e.preventDefault()
    if (busy || !email.trim() || !password) return
    setBusy(true)
    setError(null)
    onNoticeShown()
    const { error: err } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
    setBusy(false)
    if (!err) return   // SIGNED_IN: AuthGate monta l'app
    if (err.status === 400 || /invalid login credentials/i.test(err.message)) {
      setError('Email o password non corretti.')
    } else if (/email not confirmed/i.test(err.message)) {
      setError('Indirizzo email non ancora confermato.')
    } else if (err.status === 429) {
      setError('Troppi tentativi. Riprova tra qualche minuto.')
    } else {
      setError(`Accesso non riuscito: ${err.message}`)
    }
  }

  async function handleForgot(e: FormEvent) {
    e.preventDefault()
    if (busy || !email.trim()) return
    setBusy(true)
    setError(null)
    setInfo(null)
    const { error: err } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset`,
    })
    setBusy(false)
    if (err) {
      setError(err.status === 429
        ? 'Troppe richieste. Riprova tra qualche minuto.'
        : `Invio non riuscito: ${err.message}`)
      return
    }
    setInfo('Se l\'indirizzo è registrato, riceverai un\'email con il link per reimpostare la password.')
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
            <span className="font-semibold text-gray-900">
              {mode === 'login' ? 'Accedi' : 'Recupera password'}
            </span>
          </div>

          <form onSubmit={mode === 'login' ? handleLogin : handleForgot} className="px-6 py-5 flex flex-col gap-4">
            {notice && mode === 'login' && (
              <p role="alert" className="text-xs text-amber-900 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                ⚠️ {notice}
              </p>
            )}

            {mode === 'forgot' && (
              <p className="text-xs text-gray-500 leading-relaxed">
                Inserisci l'email dell'account: riceverai un link per impostare una nuova password.
              </p>
            )}

            <div className="flex flex-col gap-1">
              <label htmlFor="tb-login-email" className="text-xs text-gray-500">Email</label>
              <input
                id="tb-login-email"
                type="email"
                name="email"
                autoComplete="username"
                inputMode="email"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                required
                autoFocus
                value={email}
                onChange={e => setEmail(e.target.value)}
                className={inputCls}
              />
            </div>

            {mode === 'login' && (
              <div className="flex flex-col gap-1">
                <label htmlFor="tb-login-password" className="text-xs text-gray-500">Password</label>
                <input
                  id="tb-login-password"
                  type="password"
                  name="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className={inputCls}
                />
              </div>
            )}

            {error && (
              <p role="alert" className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">⚠️ {error}</p>
            )}
            {info && (
              <p role="status" className="text-xs text-green-800 bg-green-50 border border-green-200 rounded-lg px-3 py-2">✓ {info}</p>
            )}

            <button
              type="submit"
              disabled={busy || !email.trim() || (mode === 'login' && !password)}
              className="mt-1 px-4 py-2.5 bg-blue-700 hover:bg-blue-800 text-white text-sm font-medium rounded-lg disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {busy && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              {mode === 'login' ? 'Accedi' : 'Invia link di recupero'}
            </button>

            <button
              type="button"
              onClick={() => switchMode(mode === 'login' ? 'forgot' : 'login')}
              className="text-xs text-blue-700 hover:text-blue-900 font-medium self-center"
            >
              {mode === 'login' ? 'Password dimenticata?' : '← Torna all\'accesso'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
