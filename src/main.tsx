import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/globals.css'
import App from './App'
import { SyncRouter, isSyncRoute } from './sync/SyncRouter'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {isSyncRoute() ? <SyncRouter /> : <App />}
  </StrictMode>,
)
