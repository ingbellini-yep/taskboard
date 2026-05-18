import { useState } from 'react'
import { BoardView } from './components/BoardView'
import { InboxTab } from './components/InboxTab'

type Tab = 'board' | 'inbox'

export default function App() {
  const [tab, setTab] = useState<Tab>('board')

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100">
      {/* Top bar */}
      <header className="sticky top-0 z-10 bg-gray-900/95 backdrop-blur border-b border-gray-800 px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center gap-4">
          <div className="flex items-center gap-2 mr-auto">
            <span className="text-xl">📋</span>
            <span className="font-bold text-white text-lg tracking-tight">Taskboard</span>
          </div>

          {/* Tabs */}
          <nav className="flex gap-1 bg-gray-800 rounded-xl p-1">
            <TabButton active={tab === 'board'} onClick={() => setTab('board')}>
              Board
            </TabButton>
            <TabButton active={tab === 'inbox'} onClick={() => setTab('inbox')}>
              📥 Inbox
            </TabButton>
          </nav>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {tab === 'board' ? <BoardView /> : <InboxTab />}
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
          ? 'bg-gray-600 text-white shadow'
          : 'text-gray-400 hover:text-gray-200'
      }`}
    >
      {children}
    </button>
  )
}
