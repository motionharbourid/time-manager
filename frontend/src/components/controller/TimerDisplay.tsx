import {
  Play, Pause, RotateCcw, SkipForward, SkipBack,
  MessageSquare, ChevronRight
} from 'lucide-react'
import { formatDuration, getTimerColor } from '@/lib/utils'
import { useMessageStore } from '@/store/useMessageStore'
import { useRoomStore } from '@/store/useRoomStore'
import type { Timer, Room } from '@/types'

interface TimerDisplayProps {
  room: Room
  activeTimer: Timer | undefined
  timers: Timer[]
  onStart: (id: string) => void
  onPause: (id: string) => void
  onReset: (id: string) => void
  onNudge: (id: string, seconds: number) => void
  onNext: () => void
  onPrev: () => void
}

export function TimerDisplay({
  room, activeTimer, timers,
  onStart, onPause, onReset, onNudge, onNext, onPrev
}: TimerDisplayProps) {
  const { activeMessage } = useMessageStore()
  const { toggleOnAir, toggleBlackout } = useRoomStore()

  const isRunning = activeTimer?.status === 'running'
  const isOvertime = activeTimer?.status === 'overtime'
  const isPaused = activeTimer?.status === 'paused'

  const timerColor = activeTimer
    ? getTimerColor(activeTimer.remaining, activeTimer.wrapupColors)
    : '#525252'

  const progress = activeTimer && activeTimer.duration > 0
    ? Math.max(0, Math.min(100, (activeTimer.remaining / activeTimer.duration) * 100))
    : 0

  const currentIdx = timers.findIndex(t => t.id === activeTimer?.id)
  const nextTimer = currentIdx >= 0 ? timers[currentIdx + 1] : (timers.length > 0 ? timers[0] : undefined)
  const hasPrev = currentIdx > 0
  const hasNext = currentIdx >= 0 && currentIdx < timers.length - 1

  return (
    <div className="flex flex-col h-full relative overflow-hidden bg-tm-darker">

      {/* Ambient background glow */}
      {activeTimer && (
        <div
          className="absolute inset-0 pointer-events-none transition-all duration-2000"
          style={{ background: `radial-gradient(ellipse 70% 55% at 50% 38%, ${timerColor}0d 0%, transparent 65%)` }}
        />
      )}

      {/* ── Status bar ────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-5 pt-4 pb-0 flex-shrink-0 relative z-10">
        <div className="flex items-center gap-2">
          <button
            onClick={toggleOnAir}
            className={`flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1.5 rounded-lg border transition-all ${
              room.onAir
                ? 'bg-red-500/15 border-red-500/35 text-red-400 animate-pulse'
                : 'border-tm-border text-tm-subtle hover:border-tm-border-2 hover:text-tm-muted'
            }`}
          >
            <div className={`w-1.5 h-1.5 rounded-full ${room.onAir ? 'bg-red-400' : 'bg-tm-border-2'}`} />
            ON AIR
          </button>
          <button
            onClick={toggleBlackout}
            className={`text-[11px] font-bold px-2.5 py-1.5 rounded-lg border transition-all ${
              room.blackout
                ? 'bg-tm-surface-3 border-tm-border-2 text-tm-muted'
                : 'border-tm-border text-tm-subtle hover:border-tm-border-2 hover:text-tm-muted'
            }`}
          >
            Blackout
          </button>
        </div>
        <div className="flex items-center gap-4 text-[11px] text-tm-subtle font-mono">
          {activeTimer && (
            <>
              <span>{formatDuration(activeTimer.elapsed)} elapsed</span>
              <span className="text-tm-border-2">·</span>
            </>
          )}
          <span className={isRunning ? 'text-timer-green' : isPaused ? 'text-timer-yellow' : isOvertime ? 'text-timer-overtime' : ''}>
            {isRunning ? 'Running' : isPaused ? 'Paused' : isOvertime ? 'Overtime' : 'Idle'}
          </span>
        </div>
      </div>

      {/* ── Main area ─────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 gap-5 relative z-10 min-h-0">

        {/* Session label */}
        <div className="text-center space-y-1">
          {activeTimer?.showTitle && activeTimer.title ? (
            <p className="text-sm font-medium truncate max-w-sm transition-colors duration-300"
              style={{ color: `${timerColor}70` }}>
              {activeTimer.title}
            </p>
          ) : null}
          {activeTimer?.showSpeaker && activeTimer.speaker ? (
            <p className="font-bold truncate max-w-sm transition-colors duration-300"
              style={{ color: `${timerColor}CC`, fontSize: 'clamp(0.9rem, 1.4vw, 1.2rem)' }}>
              {activeTimer.speaker}
            </p>
          ) : null}
        </div>

        {/* ── The countdown ─────────────────────────────────────── */}
        <div className="text-center">
          {isOvertime && (
            <p className="font-mono font-black tracking-[0.45em] text-xs mb-1.5 transition-colors duration-300"
              style={{ color: `${timerColor}70` }}>
              +OVERTIME
            </p>
          )}
          {isPaused && !isOvertime && (
            <p className="font-mono tracking-[0.4em] text-[10px] mb-1.5 opacity-40">PAUSED</p>
          )}
          <div
            className="font-mono font-black tabular-nums leading-none select-none transition-colors duration-300"
            style={{
              fontSize: 'clamp(4.5rem, 9vw, 7.5rem)',
              color: timerColor,
              textShadow: activeTimer ? `0 0 50px ${timerColor}20` : 'none'
            }}
          >
            {activeTimer ? formatDuration(activeTimer.remaining) : '--:--'}
          </div>
        </div>

        {/* Progress bar */}
        {activeTimer && activeTimer.duration > 0 && !isOvertime && (
          <div className="w-full max-w-xs">
            <div className="h-px bg-white/6 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-1000 ease-linear"
                style={{ width: `${progress}%`, backgroundColor: timerColor }}
              />
            </div>
          </div>
        )}

        {/* ── Transport controls ─────────────────────────────────── */}
        <div className="flex items-center gap-2">
          <button
            onClick={onPrev}
            disabled={!hasPrev}
            title="Previous (P)"
            className="p-2.5 rounded-xl bg-tm-surface border border-tm-border hover:border-tm-border-2
              text-tm-subtle hover:text-tm-muted transition-all disabled:opacity-20 disabled:cursor-not-allowed"
          >
            <SkipBack className="w-4 h-4" />
          </button>

          <button
            onClick={() => activeTimer && (isRunning ? onPause(activeTimer.id) : onStart(activeTimer.id))}
            disabled={!activeTimer}
            title="Play / Pause (Space)"
            className={`flex items-center gap-2 px-7 py-2.5 rounded-xl font-semibold text-sm
              transition-all disabled:opacity-20 disabled:cursor-not-allowed ${
              isRunning
                ? 'bg-timer-yellow/12 border border-timer-yellow/25 text-timer-yellow hover:bg-timer-yellow/20'
                : 'bg-timer-green/12 border border-timer-green/25 text-timer-green hover:bg-timer-green/20'
            }`}
          >
            {isRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            {isRunning ? 'Pause' : 'Start'}
          </button>

          <button
            onClick={() => activeTimer && onReset(activeTimer.id)}
            disabled={!activeTimer}
            title="Reset"
            className="p-2.5 rounded-xl bg-tm-surface border border-tm-border hover:border-tm-border-2
              text-tm-subtle hover:text-tm-muted transition-all disabled:opacity-20 disabled:cursor-not-allowed"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <button
            onClick={onNext}
            disabled={!hasNext}
            title="Next (N)"
            className="p-2.5 rounded-xl bg-tm-surface border border-tm-border hover:border-tm-border-2
              text-tm-subtle hover:text-tm-muted transition-all disabled:opacity-20 disabled:cursor-not-allowed"
          >
            <SkipForward className="w-4 h-4" />
          </button>
        </div>

        {/* ── Nudge buttons ──────────────────────────────────────── */}
        <div className="flex items-center gap-1">
          {([[-60, '-1m'], [-10, '-10s'], [10, '+10s'], [60, '+1m']] as [number, string][]).map(([secs, label]) => (
            <button
              key={label}
              onClick={() => activeTimer && onNudge(activeTimer.id, secs)}
              disabled={!activeTimer}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono border transition-all
                disabled:opacity-20 disabled:cursor-not-allowed ${
                secs < 0
                  ? 'border-red-500/15 text-red-400/50 hover:bg-red-500/8 hover:text-red-400 hover:border-red-500/30'
                  : 'border-accent-cyan/15 text-accent-cyan/50 hover:bg-accent-cyan/8 hover:text-accent-cyan hover:border-accent-cyan/30'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Standby */}
        {!activeTimer && timers.length === 0 && (
          <p className="text-tm-border-2 font-mono text-sm">Add a timer to get started</p>
        )}
        {!activeTimer && timers.length > 0 && (
          <p className="text-tm-subtle text-xs">Select a timer from the rundown to begin</p>
        )}
      </div>

      {/* ── Next timer info ────────────────────────────────────────── */}
      {nextTimer && activeTimer && (
        <div className="flex items-center justify-center gap-2 px-5 pb-3 flex-shrink-0 relative z-10">
          <div className="flex items-center gap-2 text-xs text-tm-subtle bg-tm-surface border border-tm-border rounded-xl px-4 py-2">
            <ChevronRight className="w-3 h-3 text-tm-border-2 flex-shrink-0" />
            <span className="text-tm-border-3">Next</span>
            <span className="text-tm-muted font-medium truncate max-w-[180px]">{nextTimer.title}</span>
            {nextTimer.speaker && (
              <span className="text-tm-subtle truncate max-w-[120px]">· {nextTimer.speaker}</span>
            )}
            <span className="font-mono text-tm-border-3 flex-shrink-0">{formatDuration(nextTimer.duration)}</span>
          </div>
        </div>
      )}

      {/* ── Active message ────────────────────────────────────────── */}
      {activeMessage && (
        <div
          className={`flex-shrink-0 mx-4 mb-4 rounded-xl px-4 py-3 flex items-center gap-3 relative z-10 ${
            activeMessage.flash ? 'animate-flash-message' : ''
          }`}
          style={{
            backgroundColor: activeMessage.backgroundColor || '#111111',
            color: activeMessage.textColor || '#ffffff',
            border: `1px solid ${activeMessage.textColor || '#ffffff'}12`
          }}
        >
          <MessageSquare className="w-3.5 h-3.5 flex-shrink-0 opacity-40" />
          <span className="text-sm font-semibold flex-1 truncate">
            {activeMessage.emoji && <span className="mr-2">{activeMessage.emoji}</span>}
            {activeMessage.text}
          </span>
          {activeMessage.flash && (
            <span className="text-[9px] font-bold tracking-widest opacity-50 border border-current rounded px-1 py-0.5 flex-shrink-0">
              FLASH
            </span>
          )}
        </div>
      )}
    </div>
  )
}
