import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

/** Chiave di localStorage in cui supabase-js conserva la sessione utente. */
export const AUTH_STORAGE_KEY = 'tb-auth-token'

/**
 * Frammento dell'URL al caricamento della pagina, letto prima che supabase-js lo consumi.
 * Serve alla pagina /reset per mostrare l'eventuale errore del link di recupero.
 */
export const INITIAL_URL_HASH = typeof window !== 'undefined' ? window.location.hash : ''

/** Evento emesso quando una chiamata dati viene respinta per sessione o permessi. */
export const AUTH_ERROR_EVENT = 'tb:auth-error'
export interface AuthErrorDetail {
  status: number
  code: string | null
}

/**
 * fetch con rilevazione degli errori di permesso sulle chiamate dati (REST e Storage):
 * HTTP 401/403 oppure codice Postgres 42501 (insufficient_privilege, cioè RLS o GRANT).
 * La risposta è restituita invariata: la gestione (ritorno al login) è in AuthGate.
 * Le chiamate /auth/v1 sono escluse: un 400/401 sul login è un normale errore di credenziali.
 */
const authAwareFetch: typeof fetch = async (input, init) => {
  const res = await fetch(input, init)
  if (res.ok || res.status < 400 || res.status >= 500) return res

  const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
  if (!/\/(rest|storage)\/v1\//.test(url)) return res

  let code: string | null = null
  try {
    const body = await res.clone().json()
    if (body && typeof body.code === 'string') code = body.code
  } catch { /* corpo assente (HEAD) o non JSON */ }

  if (res.status === 401 || res.status === 403 || code === '42501') {
    const detail: AuthErrorDetail = { status: res.status, code }
    window.dispatchEvent(new CustomEvent<AuthErrorDetail>(AUTH_ERROR_EVENT, { detail }))
  }
  return res
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,      // la PWA installata resta autenticata fra un'apertura e l'altra
    autoRefreshToken: true,
    detectSessionInUrl: true,  // link di recupero password → pagina /reset
    storageKey: AUTH_STORAGE_KEY,
  },
  global: { fetch: authAwareFetch },
})
