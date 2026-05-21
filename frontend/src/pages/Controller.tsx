import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { Plus, Download, Upload, Settings2, ArrowLeft } from 'lucide-react'
import { useTimer } from '@/hooks/useTimer'
import { useSync } from '@/hooks/useSync'
import { useRoomStore } from '@/store/useRoomStore'
import { useMessageStore } from '@/store/useMessageStore'
import { useConnectionStore } from '@/store/useConnectionStore'
import { indonesianTimezones } from '@/lib/utils'
import { exportRoomJSON, importRoomJSON } from '@/lib/db'
import { TopBar } from '@/components/controller/TopBar'
import { TimerList } from '@/components/controller/TimerList'
import { MessagesPanel } from '@/components/controller/MessagesPanel'
import { LivePreview } from '@/components/controller/LivePreview'

export default function Controller() {
  const { roomId } = useParams<{ roomId: string }>()
  const navigate = useNavigate()
  const { currentRoom, loadRoom, createRoom, updateRoom } = useRoomStore()
  const { loadMessages } = useMessageStore()
  const { mode } = useConnectionStore()
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [settingsName, setSettingsName] = useState('')
  const [settingsTimezone, setSettingsTimezone] = useState('Asia/Jakarta')
  const [settingsMasterClock, setSettingsMasterClock] = useState(true)
  const settingsNameRef = useRef<HTMLInputElement>(null)
  const [roomNotFound, setRoomNotFound] = useState(false)

  const {
    timers, activeTimer,
    addTimer, updateTimer, deleteTimer, reorderTimers,
    start, pause, reset, nudge, next, prev
  } = useTimer(roomId)

  useSync(roomId)

  const nextTimer = (() => {
    if (!activeTimer) return timers[0]
    const idx = timers.findIndex(t => t.id === activeTimer.id)
    return timers[idx + 1]
  })()

  useEffect(() => {
    if (settingsOpen && currentRoom) {
      setSettingsName(currentRoom.name)
      setSettingsTimezone(currentRoom.timezone)
      setSettingsMasterClock(currentRoom.masterClock)
      setTimeout(() => settingsNameRef.current?.select(), 50)
    }
  }, [settingsOpen]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSettingsSave = async () => {
    await updateRoom({
      name: settingsName.trim() || currentRoom!.name,
      timezone: settingsTimezone,
      masterClock: settingsMasterClock
    })
    setSettingsOpen(false)
  }

  useEffect(() => {
    const initRoom = async () => {
      if (!roomId) { navigate('/'); return }
      const room = await loadRoom(roomId)
      if (!room) {
        if (mode === 'offline') {
          await createRoom('New Event', 'Asia/Jakarta')
        } else {
          setRoomNotFound(true)
          return
        }
      }
      await loadMessages(roomId)
    }
    initRoom()
  }, [roomId]) // eslint-disable-line react-hooks/exhaustive-deps

  // Keyboard shortcuts: Space = play/pause, ← → = nudge -10s/+10s, N = next, P = prev
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      if (!activeTimer) return
      if (e.key === ' ') {
        e.preventDefault()
        activeTimer.status === 'running' ? pause(activeTimer.id) : start(activeTimer.id)
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        nudge(activeTimer.id, -10)
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        nudge(activeTimer.id, 10)
      } else if (e.key === 'n' || e.key === 'N') {
        next()
      } else if (e.key === 'p' || e.key === 'P') {
        prev()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [activeTimer, start, pause, nudge, next, prev]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleExport = async () => {
    if (!currentRoom) return
    const json = await exportRoomJSON(currentRoom.id)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${currentRoom.name.replace(/\s+/g, '-')}-rundown.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleImport = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return
      const text = await file.text()
      await importRoomJSON(text)
      if (roomId) await loadMessages(roomId)
    }
    input.click()
  }

  if (roomNotFound) {
    return (
      <div className="w-screen h-screen bg-tm-darker flex items-center justify-center p-4">
        <div className="text-center max-w-sm">
          <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-4">
            <ArrowLeft className="w-6 h-6 text-red-400" />
          </div>
          <h2 className="text-lg font-bold text-tm-text mb-2">Room Not Found</h2>
          <p className="text-sm text-tm-muted mb-1">Room <span className="font-mono text-tm-text">{roomId}</span> tidak ditemukan.</p>
          <p className="text-xs text-tm-subtle mb-6">Pastikan kode room benar atau buat room baru.</p>
          <Link to="/" className="btn-primary inline-flex">
            <ArrowLeft className="w-3.5 h-3.5" />
            Kembali ke Beranda
          </Link>
        </div>
      </div>
    )
  }

  if (!currentRoom) {
    return (
      <div className="w-screen h-screen bg-tm-darker flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-accent-cyan/50 border-t-accent-cyan rounded-full animate-spin mx-auto mb-3" />
          <p className="text-tm-muted text-sm">Loading room…</p>
          <p className="text-tm-subtle text-xs font-mono mt-1">{roomId}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="w-screen h-screen bg-tm-darker flex flex-col overflow-hidden font-display">

      {/* ── Top bar (transport + room info) ─────────────────────────── */}
      <TopBar
        room={currentRoom}
        activeTimer={activeTimer}
        onSettingsOpen={() => setSettingsOpen(true)}
        onStart={start}
        onPause={pause}
        onReset={reset}
        onNudge={nudge}
        onNext={next}
        onPrev={prev}
      />

      {/* ── 3-column main layout ─────────────────────────────────────── */}
      <div className="flex-1 flex overflow-hidden">

        {/* LEFT: Rundown */}
        <div className="border-r border-tm-border overflow-hidden flex flex-col flex-shrink-0"
          style={{ width: '30%', minWidth: '260px', maxWidth: '380px' }}>
          <TimerList
            timers={timers}
            roomId={currentRoom.id}
            onAdd={() => addTimer(currentRoom.id, { title: `Sesi ${timers.length + 1}` })}
            onStart={start}
            onPause={pause}
            onReset={reset}
            onUpdate={(id, updates) => void updateTimer(id, updates)}
            onDelete={(id) => void deleteTimer(id)}
            onReorder={reorderTimers}
          />
        </div>

        {/* CENTER: Live Preview */}
        <div className="flex-1 overflow-hidden border-r border-tm-border">
          <LivePreview
            room={currentRoom}
            activeTimer={activeTimer}
            nextTimer={nextTimer}
          />
        </div>

        {/* RIGHT: Messages */}
        <div className="overflow-hidden flex flex-col flex-shrink-0"
          style={{ width: '30%', minWidth: '240px', maxWidth: '360px' }}>
          <MessagesPanel roomId={currentRoom.id} />
        </div>
      </div>

      {/* ── Bottom bar ──────────────────────────────────────────────── */}
      <div className="h-10 bg-tm-darker border-t border-tm-border flex items-center px-4 gap-2 flex-shrink-0">
        <button
          onClick={() => addTimer(currentRoom.id, { title: `Sesi ${timers.length + 1}` })}
          className="btn-ghost text-[11px]"
        >
          <Plus className="w-3 h-3" />
          Tambah Sesi
        </button>

        <div className="w-px h-4 bg-tm-border mx-1" />

        <button onClick={() => void handleExport()} className="btn-ghost text-[11px]" title="Export rundown as JSON">
          <Download className="w-3 h-3" />
          Export
        </button>
        <button onClick={handleImport} className="btn-ghost text-[11px]" title="Import rundown from JSON">
          <Upload className="w-3 h-3" />
          Import
        </button>

        <div className="flex-1" />

        <span className="text-[10px] text-tm-subtle font-mono">{currentRoom.id}</span>

        <button
          onClick={() => setSettingsOpen(true)}
          className="btn-ghost text-[11px]"
        >
          <Settings2 className="w-3 h-3" />
          Settings
        </button>
      </div>

      {/* ── Settings modal ──────────────────────────────────────────── */}
      {settingsOpen && (
        <div
          className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
          onClick={() => setSettingsOpen(false)}
        >
          <div
            className="bg-tm-surface border border-tm-border rounded-2xl p-6 w-full max-w-md shadow-2xl"
            style={{ boxShadow: '0 24px 64px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 rounded-xl bg-accent-cyan/10 border border-accent-cyan/20 flex items-center justify-center">
                <Settings2 className="w-4 h-4 text-accent-cyan" />
              </div>
              <div>
                <h2 className="font-bold text-base text-tm-text">Room Settings</h2>
                <p className="text-[10px] text-tm-subtle font-mono">{currentRoom.id}</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs text-tm-muted block mb-1.5 font-medium">Room Name</label>
                <input
                  ref={settingsNameRef}
                  value={settingsName}
                  onChange={(e) => setSettingsName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') void handleSettingsSave() }}
                  className="input-premium w-full"
                />
              </div>
              <div>
                <label className="text-xs text-tm-muted block mb-1.5 font-medium">Timezone</label>
                <select
                  value={settingsTimezone}
                  onChange={(e) => setSettingsTimezone(e.target.value)}
                  className="input-premium w-full"
                >
                  {indonesianTimezones().map(tz => (
                    <option key={tz.value} value={tz.value}>{tz.label}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-center justify-between py-1">
                <div>
                  <span className="text-sm text-tm-text font-medium">Master Clock</span>
                  <p className="text-xs text-tm-subtle mt-0.5">Tampilkan jam di layar presenter</p>
                </div>
                <button
                  onClick={() => setSettingsMasterClock(v => !v)}
                  className={`w-11 h-6 rounded-full transition-all relative flex-shrink-0 ${
                    settingsMasterClock ? 'bg-accent-cyan' : 'bg-tm-surface-3'
                  }`}
                >
                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${
                    settingsMasterClock ? 'left-6' : 'left-1'
                  }`} />
                </button>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setSettingsOpen(false)}
                className="px-4 py-2 text-sm text-tm-muted hover:text-tm-text transition-colors"
              >
                Batal
              </button>
              <button
                onClick={() => void handleSettingsSave()}
                className="px-5 py-2 text-sm bg-accent-cyan/10 hover:bg-accent-cyan/20 border border-accent-cyan/30
                  hover:border-accent-cyan/50 rounded-xl text-accent-cyan font-semibold transition-all"
              >
                Simpan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
