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
  }
): Promise<string> {
  const token = getAccessToken()
  if (!token) throw new Error('Non autenticato con Google Calendar')

  const body = {
    summary: event.summary,
    description: event.description,
    location: event.location,
    start: { dateTime: event.start, timeZone: 'Europe/Rome' },
    end: { dateTime: event.end, timeZone: 'Europe/Rome' },
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
