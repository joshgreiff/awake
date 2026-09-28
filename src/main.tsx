import { StrictMode, Suspense, lazy, type ComponentType } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/globals.css'
import App from './App'
import { isClearingRoute } from './clearing/route'

const ClearingRoute = lazy(() => import('./clearing/ClearingRoute'))

// Founder sync decks are local-only (gitignored) and never ship to production.
const syncModules = import.meta.env.DEV
  ? import.meta.glob<{ SyncRouter: ComponentType }>('./sync/SyncRouter.tsx')
  : {}
const loadSync = syncModules['./sync/SyncRouter.tsx']
const SyncRouter = loadSync
  ? lazy(async () => ({ default: (await loadSync()).SyncRouter }))
  : null

function isSyncRoute(): boolean {
  return /^\/sync(\/|$)/.test(window.location.pathname)
}

function Root() {
  if (isClearingRoute()) {
    return (
      <Suspense fallback={<div style={{ position: 'fixed', inset: 0, background: '#070a12' }} />}>
        <ClearingRoute />
      </Suspense>
    )
  }
  if (SyncRouter && isSyncRoute()) {
    return (
      <Suspense fallback={null}>
        <SyncRouter />
      </Suspense>
    )
  }
  return <App />
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
)
