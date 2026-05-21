import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Timer, Wifi, WifiOff, ChevronRight, Monitor, Users, List, Maximize2, LayoutDashboard } from 'lucide-react'
import { useRoomStore } from '@/store/useRoomStore'
import { useConnectionStore } from '@/store/useConnectionStore'

export default function Landing() {
  const navigate = useNavigate()
  const { createRoom, recentRooms } = useRoomStore()
  const { mode, setMode } = useConnectionStore()
  const [loading, setLoading] = useState(false)
  const [joinId, setJoinId] = useState('')

  const handleCreate = async () => {
    setLoading(true)
    try {
      const room = await createRoom('My Event', 'Asia/Jakarta')
      navigate(`/controller/${room.id}`)
    } finally {
      setLoading(false)
    }
  }

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault()
    if (!joinId.trim()) return
    const id = joinId.toUpperCase().startsWith('TM-') ? joinId.toUpperCase() : `TM-${joinId.toUpperCase()}`
    navigate(`/join/${id}`)
  }

  return (
    <div className="min-h-screen bg-tm-darker text-white font-display overflow-x-hidden">

      {/* ── Nav ─────────────────────────────────────────────────── */}
      <nav className="border-b border-tm-border sticky top-0 z-50 bg-tm-darker/95 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-5 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, #00D4FF 0%, #A855F7 100%)' }}>
              <Timer className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-sm tracking-tight text-tm-text">Time-Manager</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setMode(mode === 'online' ? 'offline' : 'online')}
              className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-all ${
                mode === 'offline'
                  ? 'border-timer-yellow/30 text-timer-yellow bg-timer-yellow/8'
                  : 'border-timer-green/30 text-timer-green bg-timer-green/8'
              }`}
            >
              {mode === 'offline' ? <WifiOff className="w-3 h-3" /> : <Wifi className="w-3 h-3" />}
              {mode === 'offline' ? 'Offline' : 'Online'}
            </button>
            <button
              onClick={handleCreate}
              disabled={loading}
              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg
                bg-accent-cyan/10 hover:bg-accent-cyan/20 border border-accent-cyan/30 hover:border-accent-cyan/50
                text-accent-cyan transition-all disabled:opacity-50"
            >
              {loading ? 'Creating…' : 'New Room'}
            </button>
          </div>
        </div>
      </nav>

      {/* ── Hero ─────────────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-5 pt-20 pb-16 text-center">
        <h1 className="text-5xl sm:text-6xl font-black tracking-tight mb-5 leading-none">
          Professional<br />
          <span style={{ background: 'linear-gradient(90deg, #00D4FF, #A855F7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            countdown timer
          </span>
        </h1>
        <p className="text-base text-tm-muted max-w-xl mx-auto mb-10 leading-relaxed">
          Control from backstage, display anywhere. Runs online &amp; offline.
          Built for events, conferences, and live productions.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-8">
          <button
            onClick={handleCreate}
            disabled={loading}
            className="w-full sm:w-auto flex items-center justify-center gap-2 font-bold text-sm px-6 py-3 rounded-xl
              bg-accent-cyan/10 hover:bg-accent-cyan/18 border border-accent-cyan/40 hover:border-accent-cyan/60
              text-accent-cyan transition-all shadow-lg shadow-accent-cyan/10 disabled:opacity-50"
          >
            <Timer className="w-4 h-4" />
            {loading ? 'Creating room…' : 'Create Room — Free'}
            <ChevronRight className="w-4 h-4" />
          </button>
          <button
            onClick={() => setMode('offline')}
            className="w-full sm:w-auto flex items-center justify-center gap-2 text-sm border border-tm-border
              hover:border-tm-border-2 text-tm-muted hover:text-tm-text px-6 py-3 rounded-xl transition-all"
          >
            <WifiOff className="w-4 h-4" />
            Use Offline
          </button>
        </div>

        {/* Join existing room */}
        <form onSubmit={handleJoin} className="flex items-center gap-2 max-w-xs mx-auto">
          <input
            type="text"
            value={joinId}
            onChange={(e) => setJoinId(e.target.value)}
            placeholder="Room code: TM-XXXXXXXX"
            className="flex-1 bg-tm-surface border border-tm-border rounded-xl px-4 py-2.5 text-xs
              text-white placeholder:text-tm-subtle focus:outline-none focus:border-tm-border-2 font-mono uppercase"
          />
          <button
            type="submit"
            className="bg-tm-surface border border-tm-border hover:border-tm-border-2 text-tm-muted
              hover:text-tm-text px-4 py-2.5 rounded-xl text-xs transition-all font-medium"
          >
            Join
          </button>
        </form>

        {/* Recent rooms */}
        {recentRooms.length > 0 && (
          <div className="mt-5 max-w-xs mx-auto">
            <p className="text-[10px] text-tm-subtle mb-2 uppercase tracking-wider">Recent</p>
            <div className="flex flex-wrap gap-1.5 justify-center">
              {recentRooms.slice(0, 4).map(r => (
                <button
                  key={r.id}
                  onClick={() => navigate(`/controller/${r.id}`)}
                  className="text-[10px] bg-tm-surface border border-tm-border hover:border-tm-border-2
                    rounded-lg px-3 py-1.5 text-tm-subtle hover:text-tm-muted font-mono transition-all"
                >
                  {r.id}
                </button>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* ── Output views ─────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-5 pb-16">
        <p className="text-[10px] text-tm-subtle uppercase tracking-widest text-center mb-6">Output Views</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {VIEWS.map(v => (
            <div key={v.name} className="bg-tm-surface border border-tm-border rounded-xl p-4 text-center hover:border-tm-border-2 transition-all">
              <div className="w-8 h-8 rounded-lg bg-tm-surface-2 border border-tm-border flex items-center justify-center mx-auto mb-3">
                <v.Icon className="w-4 h-4 text-tm-muted" />
              </div>
              <p className="text-xs font-semibold text-tm-text mb-1">{v.name}</p>
              <p className="text-[10px] text-tm-subtle leading-relaxed">{v.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features ─────────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-5 pb-16">
        <p className="text-[10px] text-tm-subtle uppercase tracking-widest text-center mb-6">Features</p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {FEATURES.map(f => (
            <div key={f.title} className="bg-tm-surface border border-tm-border rounded-xl p-5 hover:border-tm-border-2 transition-all">
              <p className="text-sm font-semibold text-tm-text mb-1">{f.title}</p>
              <p className="text-xs text-tm-subtle leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────── */}
      <footer className="border-t border-tm-border py-8 text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          <div className="w-5 h-5 rounded-md flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #00D4FF 0%, #A855F7 100%)' }}>
            <Timer className="w-3 h-3 text-white" />
          </div>
          <span className="text-xs font-bold text-tm-muted">Time-Manager</span>
        </div>
        <p className="text-[10px] text-tm-subtle">Professional countdown timer for events.</p>
      </footer>
    </div>
  )
}

const VIEWS = [
  { name: 'Controller', desc: 'Full production control interface', Icon: LayoutDashboard },
  { name: 'Viewer', desc: 'Fullscreen countdown for screens', Icon: Monitor },
  { name: 'Moderator', desc: 'Large display with rundown sidebar', Icon: Users },
  { name: 'Operator', desc: 'Simplified backstage controls', Icon: Timer },
  { name: 'Agenda', desc: 'Session list for audience', Icon: List },
  { name: 'Focus', desc: 'Minimal confidence monitor', Icon: Maximize2 },
]

const FEATURES = [
  { title: 'Drag & Drop Rundown', desc: 'Reorder sessions with drag and drop. Auto-advance to next timer on finish.' },
  { title: 'Live Messages', desc: 'Send flash text and messages to presenter screens instantly.' },
  { title: 'Chime Alerts', desc: 'Audio cues (bell, beep, ding) at configurable time thresholds.' },
  { title: 'ON AIR / Blackout', desc: 'Instantly show or hide output with one click.' },
  { title: 'Offline-First', desc: 'Works without internet. All data stored locally in IndexedDB.' },
  { title: 'PHP Sync', desc: 'Multi-device sync via REST API — no socket server required.' },
  { title: 'Wrapup Colors', desc: 'Automatic color changes as timer counts down to zero.' },
  { title: 'Export / Import', desc: 'Save and load rundowns as JSON. Import via file picker.' },
  { title: 'Keyboard Shortcuts', desc: 'Space to play/pause, arrow keys to nudge, N/P to navigate.' },
]
