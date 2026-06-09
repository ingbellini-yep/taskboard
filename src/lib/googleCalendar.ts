const CLIENT_ID: string =
  (import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined) ||
  '662062928198-6mdk974dlfk8hu8sg8nmh1att98mvcr9.apps.googleusercontent.com'
const SCOPES =
  'https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/calendar.events'

// Token in memoria (non localStorage)
let accessToken: string | null = null

export function getAccessToken(): string | null {
  return accessToken
}

export function setAccessToken(token: string): void {
  accessToken = token
}

export function clearAccessToken(): void {
  accessToken = null
}

export async function signInWithGoogle(): Promise<string> {
  return new Promise((resolve, reject) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const client = (window as any).google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: SCOPES,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      callback: (response: any) => {
        if (response.error) {
          reject(new Error(response.error))
          return
        }
        setAccessToken(response.access_token)
        resolve(response.access_token)
      },
    })
    client.requestAccessToken()
  })
}

/** Garantisce un token valido: se non c'è, lancia il login Google. */
export async function ensureSignedIn(): Promise<string> {
  const existing = getAccessToken()
  if (existing) return existing
  return signInWithGoogle()
}

const PREF_CAL_KEY = 'tb_google_pref_calendar'

/** Ricorda l'ultimo calendario usato (id pubblico, non sensibile). */
export function getPreferredCalendarId(): string | null {
  try { return localStorage.getItem(PREF_CAL_KEY) } catch { return null }
}
export function setPreferredCalendarId(calId: string): void {
  try { localStorage.setItem(PREF_CAL_KEY, calId) } catch { /* ignore */ }
}

/** Restituisce l'id del calendario da usare di default: preferito salvato, primary, o primo. */
export async function resolveDefaultCalendarId(): Promise<string> {
  const pref = getPreferredCalendarId()
  const cals = await fetchCalendarList()
  if (pref && cals.some(c => c.id === pref)) return pref
  const primary = cals.find(c => c.primary)
  return primary?.id ?? cals[0]?.id ?? 'primary'
}

export function signOutGoogle(): void {
  const token = getAccessToken()
  if (token) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(window as any).google.accounts.oauth2.revoke(token)
    clearAccessToken()
  }
}

export async function fetchCalendarList(): Promise<Calendar[]> {
  const token = getAccessToken()
  if (!token) throw new Error('Non autenticato')

  const res = await fetch(
    'https://www.googleapis.com/calendar/v3/users/me/calendarList',
    { headers: { Authorization: `Bearer ${token}` } }
  )
  const data = await res.json()
  return data.items || []
}

export async function fetchEvents(
  calendarIds: string[],
  timeMin: string,
  timeMax: string
): Promise<GoogleEvent[]> {
  const token = getAccessToken()
  if (!token) throw new Error('Non autenticato')

  const allEvents: GoogleEvent[] = []

  for (const calId of calendarIds) {
    const params = new URLSearchParams({
      timeMin,
      timeMax,
      singleEvents: 'true',
      orderBy: 'startTime',
      maxResults: '250',
    })
    const res = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calId)}/events?${params}`,
      { headers: { Authorization: `Bearer ${token}` } }
    )
    const data = await res.json()
    if (data.items) {
      allEvents.push(...data.items.map((e: GoogleEvent) => ({ ...e, calendarId: calId })))
    }
  }

  return allEvents.sort((a, b) => {
    const aStart = a.start?.dateTime || a.start?.date || ''
    const bStart = b.start?.dateTime || b.start?.date || ''
    return aStart.localeCompare(bStart)
  })
}

export async function createGoogleEvent(
  calendarId: string,
  event: {
    summary: string
    description?: string
    start: string
    end: string
    location?: string
    allDay?: boolean
  }
): Promise<string> {
  const token = getAccessToken()
  if (!token) throw new Error('Non autenticato con Google Calendar')

  let startField: Record<string, string>
  let endField: Record<string, string>

  if (event.allDay) {
    // Eventi tutto-il-giorno: Google usa { date: 'YYYY-MM-DD' }, end esclusivo (giorno dopo)
    const startDate = event.start.slice(0, 10)
    const d = new Date(startDate + 'T00:00:00')
    d.setDate(d.getDate() + 1)
    const endDate = d.toISOString().slice(0, 10)
    startField = { date: startDate }
    endField = { date: endDate }
  } else {
    startField = { dateTime: event.start, timeZone: 'Europe/Rome' }
    endField = { dateTime: event.end, timeZone: 'Europe/Rome' }
  }

  const body = {
    summary: event.summary,
    description: event.description,
    location: event.location,
    start: startField,
    end: endField,
  }

  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    }
  )

  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error?.message || 'Errore creazione evento Google')
  }

  const created = await res.json()
  return created.id as string
}

export interface Calendar {
  id: string
  summary: string
  backgroundColor: string
  foregroundColor: string
  primary?: boolean
}

export interface GoogleEvent {
  id: string
  summary: string
  description?: string
  start: { dateTime?: string; date?: string }
  end: { dateTime?: string; date?: string }
  calendarId: string
  location?: string
  colorId?: string
}
