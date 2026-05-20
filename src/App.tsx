import { useState } from 'react'
import { BoardView } from './components/BoardView'
import { InboxTab } from './components/InboxTab'
import { OreView } from './components/OreView'

type Tab = 'board' | 'inbox' | 'ore'

export default function App() {
  const [tab, setTab] = useState<Tab>('board')

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F4F6F8', color: '#1A202C' }}>
      {/* Top bar */}
      <header className="sticky top-0 z-10 bg-white border-b border-gray-200 px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center gap-4">
          <div className="flex items-center gap-2 mr-auto">
            <span className="text-xl">📋</span>
            <span className="font-bold text-gray-900 text-lg tracking-tight">Taskboard</span>
          </div>

          {/* Tabs */}
          <nav className="flex gap-1 bg-gray-100 rounded-xl p-1">
            <TabButton active={tab === 'board'} onClick={() => setTab('board')}>
              Board
            </TabButton>
            <TabButton active={tab === 'inbox'} onClick={() => setTab('inbox')}>
              📥 Inbox
            </TabButton>
            <TabButton active={tab === 'ore'} onClick={() => setTab('ore')}>
              ⏱️ Ore
            </TabButton>
          </nav>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {tab === 'board' && <BoardView />}
        {tab === 'inbox' && <InboxTab />}
        {tab === 'ore' && <OreView />}
      </main>
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
      className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
        active
          ? 'bg-blue-50 text-blue-700'
          : 'text-gray-500 hover:text-gray-700'
      }`}
    >
      {children}
    </button>
  )
}
