import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { AuthGate } from './auth/AuthGate.tsx'
import { UpdatePrompt } from './components/UpdatePrompt.tsx'
import { DailyDigest } from './components/DailyDigest.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* Tutto ciò che legge dati tb_* vive dentro AuthGate: senza sessione non viene montato */}
    <AuthGate>
      <App />
      <DailyDigest />
    </AuthGate>
    <UpdatePrompt />
  </StrictMode>,
)
