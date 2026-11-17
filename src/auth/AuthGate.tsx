import { createContext, Fragment, useCallback, useContext, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase, AUTH_ERROR_EVENT, AUTH_STORAGE_KEY } from '../lib/supabase'
import type { AuthErrorDetail } from '../lib/supabase'
import { clearAccessToken } from '../lib/googleCalendar'
import { LoginScreen } from '../components/LoginScreen'
import { ResetPasswordScreen } from '../components/ResetPasswordScreen'

const DENIED_MESSAGE = 'Sessione scaduta o utente non abilitato'

/** Cache dati del service worker (vedi runtimeCaching in vite.config.ts). */
const DATA_CACHE_NAME = 'supabase-cache'
/** Stato locale legato ai dati dell'utente, da azzerare al logout. Le preferenze del dispositivo restano. */
const LOCAL_STATE_KEYS = ['tb_digest_seen']

interface AuthContextValue {
  user: User
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth va usato dentro AuthGate')
  return ctx
}

function isResetPath(): boolean {
  return window.location.pathname.replace(/\/+$/, '') === '/reset'
}

/** Rimuove canali Realtime, cache dati e stato locale dell'utente uscente. */
function cleanupLocalState() {
  supabase.removeAllChannels()
  clearAccessToken()
  for (const k of LOCAL_STATE_KEYS) {
    try { localStorage.removeItem(k) } catch { /* ignore */ }
  }
  if ('caches' in window) {
    caches.delete(DATA_CACHE_NAME).catch(() => { /* ignore */ })
  }
}

/**
 * Verifica che l'utente autenticato sia nella lista degli abilitati (tb_allowed_users).
 * Il progetto Supabase è condiviso con altre applicazioni: un loro utente supera il login
 * ma riceverebbe solo elenchi vuoti. Qui viene riconosciuto e respinto.
 * Se la tabella non è presente il controllo è considerato superato.
 */
async function isUserAllowed(): Promise<boolean> {
  const { data, error, status } = await supabase.from('tb_allowed_users').select('user_id').limit(1)
  if (!error) return (data?.length ?? 0) > 0
  if (status === 404 || error.code === 'PGRST205' || error.code === '42P01') return true
  if (status === 401 || status === 403 || error.code === '42501') return false
  // Rete assente o errore transitorio: non blocca l'app, i dati restano protetti dalla RLS
  return true
}

/**
 * Guardia di sessione: senza sessione mostra solo il login e non monta l'app,
 * quindi non parte nessuna query tb_* né alcuna sottoscrizione Realtime.
 * I canali vengono creati al montaggio dell'app (dopo SIGNED_IN) e rimossi a SIGNED_OUT.
 */
export function AuthGate({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false)
  const [session, setSession] = useState<Session | null>(null)
  const [access, setAccess] = useState<'unknown' | 'granted'>('unknown')
  const [notice, setNotice] = useState<string | null>(null)
  const [resetRoute, setResetRoute] = useState(isResetPath)
  const [epoch, setEpoch] = useState(0)

  const sessionRef = useRef<Session | null>(null)
  const handlingRef = useRef(false)
  const lastRecoveryRef = useRef(0)

  // ── Sessione iniziale e ascolto dei cambi di stato ──────────────────────────
  useEffect(() => {
    let active = true

    const apply = (s: Session | null) => {
      sessionRef.current = s
      setSession(s)
      setReady(true)
    }

    supabase.auth.getSession().then(({ data }) => { if (active) apply(data.session) })

    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      if (!active) return
      if (event === 'SIGNED_OUT') {
        apply(null)
        // Fuori dal callback: nessuna chiamata supabase mentre il lock auth è impegnato
        setTimeout(cleanupLocalState, 0)
      } else if (
        event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION' ||
        event === 'PASSWORD_RECOVERY' || event === 'USER_UPDATED'
      ) {
        if (event === 'PASSWORD_RECOVERY') setResetRoute(true)
        apply(s)
      }
    })

    return () => { active = false; sub.subscription.unsubscribe() }
  }, [])

  // ── Uscita forzata locale (anche offline) ───────────────────────────────────
  const endSession = useCallback(async (message: string | null) => {
    setNotice(message)
    // scope 'local': chiude la sessione di questo dispositivo, non quella degli altri
    const { error } = await supabase.auth.signOut({ scope: 'local' })
    if (error) {
      // Server non raggiungibile: la sessione viene comunque rimossa dal dispositivo
      try { localStorage.removeItem(AUTH_STORAGE_KEY) } catch { /* ignore */ }
      cleanupLocalState()
      window.location.replace('/')
    }
  }, [])

  const signOut = useCallback(() => endSession(null), [endSession])

  // ── Utente abilitato? ───────────────────────────────────────────────────────
  const userId = session?.user.id ?? null
  useEffect(() => {
    setAccess('unknown')
    if (!userId) return
    let active = true
    isUserAllowed().then(ok => {
      if (!active) return
      if (ok) setAccess('granted')
      else if (!handlingRef.current) {
        handlingRef.current = true
        endSession(DENIED_MESSAGE).finally(() => { handlingRef.current = false })
      }
    })
    return () => { active = false }
  }, [userId, endSession])

  // ── Errori di permesso sulle chiamate dati (401 / 403 / 42501) ──────────────
  useEffect(() => {
    const onAuthError = (e: Event) => {
      const { status, code } = (e as CustomEvent<AuthErrorDetail>).detail
      if (!sessionRef.current || handlingRef.current) return
      handlingRef.current = true

      const run = async () => {
        // 401 senza violazione di permesso: token scaduto. Un solo tentativo di rinnovo,
        // poi l'app viene rimontata per rileggere i dati. Se si ripete entro 30 s si torna al login.
        const recentlyRecovered = Date.now() - lastRecoveryRef.current < 30_000
        if (status === 401 && code !== '42501' && !recentlyRecovered) {
          const { data, error } = await supabase.auth.refreshSession()
          if (!error && data.session) {
            lastRecoveryRef.current = Date.now()
            setEpoch(n => n + 1)
            return
          }
        }
        await endSession(DENIED_MESSAGE)
      }
      run().finally(() => { handlingRef.current = false })
    }
    window.addEventListener(AUTH_ERROR_EVENT, onAuthError)
    return () => window.removeEventListener(AUTH_ERROR_EVENT, onAuthError)
  }, [endSession])

  // ── Render ──────────────────────────────────────────────────────────────────
  if (!ready) return <Splash />

  if (resetRoute) {
    const leave = () => {
      window.history.replaceState(null, '', '/')
      setResetRoute(false)
    }
    return <ResetPasswordScreen hasSession={!!session} onDone={leave} onBackToLogin={leave} />
  }

  if (!session) return <LoginScreen notice={notice} onNoticeShown={() => setNotice(null)} />

  if (access !== 'granted') return <Splash />

  return (
    <AuthContext.Provider value={{ user: session.user, signOut }}>
      <Fragment key={`${session.user.id}:${epoch}`}>{children}</Fragment>
    </AuthContext.Provider>
  )
}

function Splash() {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#1E1E2E' }}>
      <span className="w-6 h-6 border-2 border-white/70 border-t-transparent rounded-full animate-spin" aria-label="Caricamento" />
    </div>
  )
}
