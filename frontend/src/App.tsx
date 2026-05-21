import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useEffect } from 'react'
import { useOffline } from '@/hooks/useOffline'
import Landing from '@/pages/Landing'
import Controller from '@/pages/Controller'
import Viewer from '@/pages/Viewer'
import Agenda from '@/pages/Agenda'
import Moderator from '@/pages/Moderator'
import Operator from '@/pages/Operator'
import Focus from '@/pages/Focus'
import Join from '@/pages/Join'

function AppProviders({ children }: { children: React.ReactNode }) {
  useOffline()

  useEffect(() => {
    // Register service worker
    if ('serviceWorker' in navigator && (import.meta.env as Record<string, unknown>)['PROD']) {
      navigator.serviceWorker.register('/sw.js').catch(console.error)
    }

    // Prevent sleep (Screen Wake Lock API)
    let wakeLock: WakeLockSentinel | null = null
    const requestWakeLock = async () => {
      try {
        if ('wakeLock' in navigator) {
          wakeLock = await (navigator as Navigator & { wakeLock: { request: (type: string) => Promise<WakeLockSentinel> } }).wakeLock.request('screen')
        }
      } catch { /* not supported */ }
    }
    requestWakeLock()

    return () => { wakeLock?.release().catch(() => {}) }
  }, [])

  return <>{children}</>
}

export default function App() {
  return (
    <BrowserRouter>
      <AppProviders>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/controller/:roomId" element={<Controller />} />
          <Route path="/viewer/:roomId" element={<Viewer />} />
          <Route path="/agenda/:roomId" element={<Agenda />} />
          <Route path="/moderator/:roomId" element={<Moderator />} />
          <Route path="/operator/:roomId" element={<Operator />} />
          <Route path="/focus/:roomId" element={<Focus />} />
          <Route path="/join/:roomId" element={<Join />} />
          {/* Redirect old paths */}
          <Route path="/room/:roomId" element={<Navigate to="/controller/:roomId" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AppProviders>
    </BrowserRouter>
  )
}
