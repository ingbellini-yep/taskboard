import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { UpdatePrompt } from './components/UpdatePrompt.tsx'
import { DailyDigest } from './components/DailyDigest.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
    <DailyDigest />
    <UpdatePrompt />
  </StrictMode>,
)
