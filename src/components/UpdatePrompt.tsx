import { useEffect, useState } from 'react'
import { registerSW } from 'virtual:pwa-register'

/**
 * Banner "nuova versione disponibile".
 * - Controlla gli aggiornamenti all'avvio, ogni 60s e quando l'app torna in primo piano
 *   (fondamentale su mobile: la PWA resta sospesa e non si accorge dei deploy).
 * - Un tap su "Aggiorna" attiva il nuovo service worker e ricarica.
 */
export function UpdatePrompt() {
  const [needRefresh, setNeedRefresh] = useState(false)
  const [updateSW, setUpdateSW] = useState<((reload?: boolean) => Promise<void>) | null>(null)

  useEffect(() => {
    let intervalId: number | undefined

    const update = registerSW({
      immediate: true,
      onNeedRefresh() {
        setNeedRefresh(true)
      },
      onRegisteredSW(_swUrl, registration) {
        if (!registration) return

        const check = () => {
          if (registration.installing || !navigator.onLine) return
          registration.update().catch(() => { /* offline o rete assente */ })
        }

        // Controllo periodico
        intervalId = window.setInterval(check, 60_000)

        // Controllo quando l'app torna visibile (rientro dalla home su mobile)
        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'visible') check()
        })
        window.addEventListener('focus', check)
      },
    })

    setUpdateSW(() => update)

    return () => { if (intervalId) clearInterval(intervalId) }
  }, [])

  if (!needRefresh) return null

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[60] w-[min(92vw,420px)]">
      <div className="bg-gray-900 text-white rounded-xl shadow-2xl px-4 py-3 flex items-center gap-3">
        <span className="text-lg">🔄</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">Nuova versione disponibile</p>
          <p className="text-xs text-gray-400">Aggiorna per vedere le ultime modifiche</p>
        </div>
        <button
          onClick={() => updateSW?.(true)}
          className="shrink-0 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-3 py-1.5 rounded-lg transition-colors"
        >
          Aggiorna
        </button>
        <button
          onClick={() => setNeedRefresh(false)}
          className="shrink-0 text-gray-400 hover:text-white text-lg leading-none px-1"
          aria-label="Chiudi"
        >
          ×
        </button>
      </div>
    </div>
  )
}
