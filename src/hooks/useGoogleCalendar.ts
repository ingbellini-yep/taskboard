import { useState, useCallback } from 'react'
import {
  signInWithGoogle, signOutGoogle, fetchCalendarList,
  fetchEvents, getAccessToken,
} from '../lib/googleCalendar'
import type { Calendar, GoogleEvent } from '../lib/googleCalendar'

export type { Calendar, GoogleEvent }

export function useGoogleCalendar() {
  const [isAuthenticated, setIsAuthenticated] = useState(() => !!getAccessToken())
  const [calendars, setCalendars] = useState<Calendar[]>([])
  const [selectedCalendars, setSelectedCalendars] = useState<string[]>([])
  const [events, setEvents] = useState<GoogleEvent[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const login = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      await signInWithGoogle()
      setIsAuthenticated(true)
      const cals = await fetchCalendarList()
      setCalendars(cals)
      setSelectedCalendars(cals.map(c => c.id))
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Errore autenticazione')
    } finally {
      setLoading(false)
    }
  }, [])

  const logout = useCallback(() => {
    signOutGoogle()
    setIsAuthenticated(false)
    setCalendars([])
    setSelectedCalendars([])
    setEvents([])
  }, [])

  const loadEvents = useCallback(async (start: Date, end: Date) => {
    if (selectedCalendars.length === 0) return
    try {
      setLoading(true)
      setError(null)
      const evs = await fetchEvents(
        selectedCalendars,
        start.toISOString(),
        end.toISOString()
      )
      setEvents(evs)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Errore caricamento eventi')
    } finally {
      setLoading(false)
    }
  }, [selectedCalendars])

  const toggleCalendar = useCallback((calId: string) => {
    setSelectedCalendars(prev =>
      prev.includes(calId) ? prev.filter(id => id !== calId) : [...prev, calId]
    )
  }, [])

  return {
    isAuthenticated,
    calendars,
    selectedCalendars,
    events,
    loading,
    error,
    login,
    logout,
    loadEvents,
    toggleCalendar,
  }
}
