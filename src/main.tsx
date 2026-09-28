import { StrictMode, Suspense, lazy } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/globals.css'
import App from './App'
import { SyncRouter, isSyncRoute } from './sync/SyncRouter'
import { isClearingRoute } from './clearing/route'

const ClearingRoute = lazy(() => import('./clearing/ClearingRoute'))

function Root() {
  if (isClearingRoute()) {
    return (
      <Suspense fallback={<div style={{ position: 'fixed', inset: 0, background: '#070a12' }} />}>
        <ClearingRoute />
      </Suspense>
    )
  }
  return isSyncRoute() ? <SyncRouter /> : <App />
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
)
