import { useState } from 'react'
import {
  Timer, ExternalLink, Copy, Check, Settings,
  Play, Pause, RotateCcw, SkipForward, SkipBack,
  Radio, EyeOff, Link2, X, Monitor, Users, List, Maximize2
} from 'lucide-react'
import { ConnectionStatus } from '@/components/shared/ConnectionStatus'
import { useRoomStore } from '@/store/useRoomStore'
import { formatDuration } from '@/lib/utils'
import { getTimerColor } from '@/lib/utils'
import type { Room, Timer as TimerType } from '@/types'

interface TopBarProps {
  room: Room
  activeTimer: TimerType | undefined
  onSettingsOpen: () => void
  onStart: (id: string) => void
  onPause: (id: string) => void
  onReset: (id: string) => void
  onNudge: (id: string, seconds: number) => void
  onNext: () => void
  onPrev: () => void
}

export function TopBar({
  room, activeTimer, onSettingsOpen,
  onStart, onPause, onReset, onNudge, onNext, onPrev
}: TopBarProps) {
  const { updateRoom, toggleOnAir, toggleBlackout } = useRoomStore()
  const [editingName, setEditingName] = useState(false)
  const [nameValue, setNameValue] = useState(room.name)
  const [copied, setCopied] = useState(false)
  const [linksOpen, setLinksOpen] = useState(false)
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null)

  const isRunning = activeTimer?.status === 'running'
  const isOvertime = activeTimer?.status === 'overtime'
  const timerColor = activeTimer ? getTimerColor(activeTimer.remaining, activeTimer.wrapupColors) : '#22C55E'

  const handleCopyId = () => {
    navigator.clipboard.writeText(room.id)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleNameSave = () => {
    if (nameValue.trim()) updateRoom({ name: nameValue.trim() })
    setEditingName(false)
  }

  const origin = window.location.origin
  const outputLinks = [
    { key: 'viewer',    label: 'Viewer',    desc: 'Main display output',         url: `${origin}/viewer/${room.id}`,    Icon: Monitor },
    { key: 'moderator', label: 'Moderator', desc: 'Moderator control + rundown', url: `${origin}/moderator/${room.id}`, Icon: Users },
    { key: 'operator',  label: 'Operator',  desc: 'Backstage operator controls', url: `${origin}/operator/${room.id}`,  Icon: Timer },
    { key: 'agenda',    label: 'Agenda',    desc: 'Session list for audience',   url: `${origin}/agenda/${room.id}`,    Icon: List },
    { key: 'focus',     label: 'Focus',     desc: 'Minimal fullscreen display',  url: `${origin}/focus/${room.id}`,     Icon: Maximize2 },
  ]

  const copyUrl = (url: string) => {
    navigator.clipboard.writeText(url)
    setCopiedUrl(url)
    setTimeout(() => setCopiedUrl(null), 2000)
  }

  return (
    <>
    <header className="h-14 bg-tm-darker border-b border-tm-border flex items-center gap-0 flex-shrink-0 overflow-hidden">

      {/* ── LEFT ZONE: Logo + Room ───────────────────────────────────── */}
      <div className="flex items-center gap-2.5 px-4 flex-shrink-0 min-w-0" style={{ width: '28%' }}>
        {/* Logo */}
        <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: 'linear-gradient(135deg, #00D4FF 0%, #A855F7 100%)' }}>
          <Timer className="w-4 h-4 text-white" />
        </div>

        {/* Room name */}
        {editingName ? (
          <input
            autoFocus
            value={nameValue}
            onChange={(e) => setNameValue(e.target.value)}
            onBlur={handleNameSave}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleNameSave()
              if (e.key === 'Escape') setEditingName(false)
            }}
            className="bg-tm-surface border border-accent-cyan/50 rounded-lg px-2 py-1 text-sm
              font-semibold text-white focus:outline-none min-w-0 w-36"
          />
        ) : (
          <button
            onClick={() => setEditingName(true)}
            className="text-sm font-semibold text-tm-text hover:text-white transition-colors truncate max-w-[140px]"
            title="Click to rename"
          >
            {room.name}
          </button>
        )}

        {/* Room ID */}
        <button
          onClick={handleCopyId}
          className="hidden lg:flex items-center gap-1 font-mono text-[10px] text-tm-subtle
            bg-tm-surface border border-tm-border hover:border-tm-border-2 rounded-md px-1.5 py-0.5
            transition-all flex-shrink-0"
          title="Copy room ID"
        >
          {room.id}
          {copied ? <Check className="w-2.5 h-2.5 text-timer-green" /> : <Copy className="w-2.5 h-2.5" />}
        </button>

        {/* Plan badge */}
        <span className={`hidden xl:inline text-[10px] font-bold px-1.5 py-0.5 rounded-md flex-shrink-0 ${
          room.plan === 'premium' ? 'bg-accent-purple/15 text-accent-purple border border-accent-purple/20' :
          room.plan === 'pro' ? 'bg-timer-yellow/15 text-timer-yellow border border-timer-yellow/20' :
          'bg-tm-surface-2 text-tm-subtle border border-tm-border'
        }`}>
          {room.plan.toUpperCase()}
        </span>
      </div>

      {/* ── CENTER ZONE: Transport Controls ─────────────────────────── */}
      <div className="flex-1 flex items-center justify-center gap-1.5 min-w-0 px-2">
        {/* Prev */}
        <button
          onClick={onPrev}
          disabled={!activeTimer}
          className="p-1.5 text-tm-muted hover:text-tm-text hover:bg-tm-surface rounded-lg
            transition-all disabled:opacity-25 flex-shrink-0"
          title="Previous"
        >
          <SkipBack className="w-3.5 h-3.5" />
        </button>

        {/* Play / Pause — primary action */}
        <button
          onClick={() => activeTimer && (isRunning ? onPause(activeTimer.id) : onStart(activeTimer.id))}
          disabled={!activeTimer}
          className={`flex items-center gap-2 px-4 py-1.5 rounded-lg font-semibold text-sm
            transition-all disabled:opacity-25 flex-shrink-0 ${
            isRunning
              ? 'bg-timer-yellow/15 hover:bg-timer-yellow/25 text-timer-yellow border border-timer-yellow/25'
              : 'bg-timer-green/15 hover:bg-timer-green/25 text-timer-green border border-timer-green/25'
          }`}
          title={isRunning ? 'Pause' : 'Start'}
        >
          {isRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          <span className="hidden sm:inline">{isRunning ? 'Pause' : 'Start'}</span>
        </button>

        {/* Reset */}
        <button
          onClick={() => activeTimer && onReset(activeTimer.id)}
          disabled={!activeTimer}
          className="p-1.5 text-tm-muted hover:text-tm-text hover:bg-tm-surface rounded-lg
            transition-all disabled:opacity-25 flex-shrink-0"
          title="Reset"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>

        {/* Next */}
        <button
          onClick={onNext}
          disabled={!activeTimer}
          className="p-1.5 text-tm-muted hover:text-tm-text hover:bg-tm-surface rounded-lg
            transition-all disabled:opacity-25 flex-shrink-0"
          title="Next"
        >
          <SkipForward className="w-3.5 h-3.5" />
        </button>

        {/* Divider */}
        <div className="w-px h-5 bg-tm-border mx-1 flex-shrink-0" />

        {/* Nudge buttons */}
        <div className="hidden md:flex items-center gap-0.5 flex-shrink-0">
          {([[-60, '-1m'], [-10, '-10s'], [10, '+10s'], [60, '+1m']] as [number, string][]).map(([secs, label]) => (
            <button
              key={label}
              onClick={() => activeTimer && onNudge(activeTimer.id, secs)}
              disabled={!activeTimer}
              className={`text-[10px] px-1.5 py-1 rounded-md border font-mono transition-all disabled:opacity-25 ${
                secs < 0
                  ? 'border-red-500/20 text-red-400/70 hover:bg-red-500/10 hover:text-red-400'
                  : 'border-accent-cyan/20 text-accent-cyan/70 hover:bg-accent-cyan/10 hover:text-accent-cyan'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Divider */}
        <div className="w-px h-5 bg-tm-border mx-1 flex-shrink-0" />

        {/* Live timer display */}
        {activeTimer ? (
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <span
              className="text-xl font-black font-mono tabular-nums transition-colors duration-500"
              style={{ color: timerColor }}
            >
              {isOvertime && <span className="text-sm mr-0.5">+</span>}
              {formatDuration(activeTimer.remaining)}
            </span>
            <span className="hidden xl:inline text-xs text-tm-subtle font-mono">
              / {formatDuration(activeTimer.duration)}
            </span>
          </div>
        ) : (
          <span className="text-xl font-black font-mono text-tm-surface-3 select-none">--:--</span>
        )}
      </div>

      {/* ── RIGHT ZONE: Links + Status + Settings ───────────────────── */}
      <div className="flex items-center gap-1.5 px-4 flex-shrink-0" style={{ width: '28%', justifyContent: 'flex-end' }}>
        {/* On Air */}
        <button
          onClick={toggleOnAir}
          className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold
            border transition-all flex-shrink-0 ${
            room.onAir
              ? 'bg-red-500/15 border-red-500/40 text-red-400 animate-pulse'
              : 'border-tm-border text-tm-subtle hover:border-tm-border-2 hover:text-tm-muted'
          }`}
        >
          <Radio className="w-3 h-3" />
          <span className="hidden lg:inline">ON AIR</span>
        </button>

        {/* Blackout */}
        <button
          onClick={toggleBlackout}
          className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold
            border transition-all flex-shrink-0 ${
            room.blackout
              ? 'bg-tm-surface-3 border-tm-border-2 text-tm-text'
              : 'border-tm-border text-tm-subtle hover:border-tm-border-2 hover:text-tm-muted'
          }`}
        >
          <EyeOff className="w-3 h-3" />
          <span className="hidden lg:inline">Blackout</span>
        </button>

        {/* Divider */}
        <div className="w-px h-5 bg-tm-border flex-shrink-0" />

        {/* Output links */}
        <button
          onClick={() => setLinksOpen(true)}
          className="hidden lg:flex items-center gap-1 text-[11px] text-tm-subtle hover:text-tm-muted
            bg-tm-surface border border-tm-border hover:border-tm-border-2 rounded-lg px-2.5 py-1.5
            transition-all flex-shrink-0"
          title="Output links"
        >
          <Link2 className="w-3 h-3" />
          Links
        </button>

        {/* Connection status */}
        <ConnectionStatus />

        {/* Settings */}
        <button
          onClick={onSettingsOpen}
          className="p-1.5 text-tm-subtle hover:text-tm-muted hover:bg-tm-surface rounded-lg transition-all flex-shrink-0"
          title="Settings"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>
    </header>

    {/* Output links modal */}
    {linksOpen && (
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={() => setLinksOpen(false)}
      >
        <div
          className="bg-tm-surface border border-tm-border rounded-2xl p-6 w-full max-w-md shadow-2xl"
          style={{ boxShadow: '0 24px 64px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04)' }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-accent-cyan/10 border border-accent-cyan/20 flex items-center justify-center">
                <Link2 className="w-4 h-4 text-accent-cyan" />
              </div>
              <div>
                <h2 className="font-bold text-sm text-tm-text">Output Links</h2>
                <p className="text-[10px] text-tm-subtle font-mono">{room.id}</p>
              </div>
            </div>
            <button
              onClick={() => setLinksOpen(false)}
              className="p-1.5 text-tm-subtle hover:text-tm-muted hover:bg-tm-surface-2 rounded-lg transition-all"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-2">
            {outputLinks.map(({ key, label, desc, url, Icon }) => (
              <div key={key} className="flex items-center gap-3 p-3 rounded-xl bg-tm-surface-2 border border-tm-border hover:border-tm-border-2 transition-all group">
                <div className="w-7 h-7 rounded-lg bg-tm-surface-3 border border-tm-border flex items-center justify-center flex-shrink-0">
                  <Icon className="w-3.5 h-3.5 text-tm-muted" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-tm-text">{label}</p>
                  <p className="text-[10px] text-tm-subtle">{desc}</p>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => copyUrl(url)}
                    className="p-1.5 rounded-lg text-tm-subtle hover:text-tm-muted hover:bg-tm-surface-3 transition-all"
                    title="Copy link"
                  >
                    {copiedUrl === url ? <Check className="w-3 h-3 text-timer-green" /> : <Copy className="w-3 h-3" />}
                  </button>
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 rounded-lg text-tm-subtle hover:text-tm-muted hover:bg-tm-surface-3 transition-all"
                    title="Open in new tab"
                  >
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            ))}
          </div>

          <p className="text-[10px] text-tm-subtle text-center mt-4">
            Share these links so others can view or control the session.
          </p>
        </div>
      </div>
    )}
    </>
  )
}
