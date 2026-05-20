import { useState } from 'react'
import { BoardView } from './components/BoardView'
import { CompletatiView } from './components/CompletatiView'
import { ArchiviatiView } from './components/ArchiviatiView'
import { InboxTab } from './components/InboxTab'
import { OreView } from './components/OreView'
import { useStats } from './hooks/useStats'
import { useInboxRecords } from './hooks/useRecords'

type Tab = 'aperti' | 'inbox' | 'completati' | 'archiviati' | 'ore'

export default function App() {
  const [tab, setTab] = useState<Tab>('aperti')
  const stats = useStats()
  const { records: inboxRecords } = useInboxRecords()

  const lastUpdated =
    stats.lastUpdated.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' }) +
    ' ' +
    stats.lastUpdated.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F5F5F5', color: '#212121' }}>
      {/* Header scuro */}
      <header style={{ backgroundColor: '#1E1E2E', padding: '16px 20px' }}>
        <div className="max-w-7xl mx-auto">
          <div className="flex items-start justify-between gap-4">
            <span className="text-white font-bold text-base">Task Board · Ing. Epifanio Bellini</span>
            <span className="text-xs shrink-0" style={{ color: '#9E9E9E' }}>Aggiornato {lastUpdated}</span>
          </div>
          <p className="text-xs mt-1" style={{ color: '#9E9E9E' }}>
            Ordine Ingegneri AG n. 1244 · Viale della Vittoria 105, Agrigento · v2 · {stats.progettiAttivi} progetti attivi
          </p>
        </div>
      </header>

      {/* Alert bar urgenti */}
      {stats.urgenti > 0 && (
        <div style={{ backgroundColor: '#C62828', padding: '8px 20px' }}>
          <div className="max-w-7xl mx-auto text-white text-sm">
            🔴 {stats.urgenti} urgenti →{' '}
            {stats.urgentRecords.map((r, i) => (
              <span key={i}>
                {i > 0 && ' | '}
                {r.rec_code && <span className="font-medium">{r.rec_code}</span>}
                {r.rec_code && ' · '}
                {r.rec_title}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Stats bar */}
      <div style={{ backgroundColor: '#EEEEEE', padding: '12px 20px', borderBottom: '1px solid #E0E0E0' }}>
        <div className="max-w-7xl mx-auto grid grid-cols-5 gap-4">
          <StatItem label="URGENTI" value={stats.urgenti} />
          <StatItem label="ALTA" value={stats.alta} />
          <StatItem label="NORMALE" value={stats.normale} />
          <StatItem label="SOSPESI" value={stats.sospesi} />
          <StatItem label="TOTALI" value={stats.totali} />
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-5 flex">
          <TabButton active={tab === 'aperti'} onClick={() => setTab('aperti')}>
            Aperti ({stats.totali})
          </TabButton>
          <TabButton active={tab === 'inbox'} onClick={() => setTab('inbox')}>
            📥 Inbox{inboxRecords.length > 0 && ` (${inboxRecords.length})`}
          </TabButton>
          <TabButton active={tab === 'completati'} onClick={() => setTab('completati')}>
            Completati
          </TabButton>
          <TabButton active={tab === 'archiviati'} onClick={() => setTab('archiviati')}>
            📁 Archiviati
          </TabButton>
          <TabButton active={tab === 'ore'} onClick={() => setTab('ore')}>
            Ore
          </TabButton>
        </div>
      </div>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-5 py-6">
        {tab === 'aperti' && <BoardView />}
        {tab === 'inbox' && <InboxTab />}
        {tab === 'completati' && <CompletatiView />}
        {tab === 'archiviati' && <ArchiviatiView />}
        {tab === 'ore' && <OreView />}
      </main>
    </div>
  )
}

function StatItem({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-2xl font-bold" style={{ color: '#212121' }}>{value}</span>
      <span className="text-xs uppercase tracking-wide" style={{ color: '#757575' }}>{label}</span>
    </div>
  )
}

function TabButton({ active, onClick, children }: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={`px-5 py-3 text-sm font-medium transition-all border-b-2 ${
        active
          ? 'border-blue-600 text-blue-700'
          : 'border-transparent text-gray-500 hover:text-gray-700'
      }`}
    >
      {children}
    </button>
  )
}

