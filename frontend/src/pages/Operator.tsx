import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useTimer } from '@/hooks/useTimer'
import { useRoomStore } from '@/store/useRoomStore'
import { useMessageStore } from '@/store/useMessageStore'
import { useSocket } from '@/hooks/useSocket'
import { useSync } from '@/hooks/useSync'
import { formatDuration, formatClock, getTimerColor } from '@/lib/utils'
import { joinRoom } from '@/lib/socket'
import { unlockAudio } from '@/lib/chime'
import {
  Play, Pause, SkipForward, SkipBack, RotateCcw,
  Minus, Plus, ChevronRight, Radio, EyeOff, Timer
} from 'lucide-react'

export default function Operator() {
  const { roomId } = useParams<{ roomId: string }>()
  const { timers, activeTimer, start, pause, reset, nudge, next, prev } = useTimer(roomId)
  const { currentRoom, loadRoom } = useRoomStore()
  const { activeMessage } = useMessageStore()
  const [now, setNow] = useState(new Date())

  useSocket(roomId)
  useSync(roomId, 3000)

  useEffect(() => {
    if (!roomId) return
    loadRoom(roomId)
    joinRoom(roomId, 'operator')
    const tick = setInterval(() => setNow(new Date()), 1000)
    unlockAudio()
    return () => clearInterval(tick)
  }, [roomId]) // eslint-disable-line react-hooks/exhaustive-deps

  const timerColor = activeTimer
    ? getTimerColor(activeTimer.remaining, activeTimer.wrapupColors)
    : '#22c55e'
  const isOvertime = activeTimer?.status === 'overtime'
  const isRunning = activeTimer?.status === 'running'
  const isPaused = activeTimer?.status === 'paused'

  const currentIdx = timers.findIndex(t => t.id === activeTimer?.id)
  const nextTimer = currentIdx >= 0 ? timers[currentIdx + 1] : timers[0]
  const prevTimerItem = currentIdx > 0 ? timers[currentIdx - 1] : null

  return (
    <div className="w-screen h-screen bg-black flex flex-col font-display overflow-hidden select-none">

      {/* Header */}
      <header className="h-12 flex items-center justify-between px-5 border-b border-white/8 bg-white/3 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #00D4FF 0%, #A855F7 100%)' }}>
            <Timer className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="text-white/70 text-sm font-semibold">{currentRoom?.name ?? 'Operator'}</span>
          <span className="text-white/25 text-xs font-mono">{roomId}</span>
        </div>
        <div className="flex items-center gap-3">
          {currentRoom?.onAir && (
            <div className="flex items-center gap-1.5 bg-red-500/20 border border-red-500/30 px-2 py-0.5 rounded-md">
              <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
              <span className="text-red-400 text-[10px] font-bold tracking-widest">ON AIR</span>
            </div>
          )}
          {currentRoom?.blackout && (
            <div className="flex items-center gap-1.5 bg-white/5 border border-white/10 px-2 py-0.5 rounded-md">
              <EyeOff className="w-2.5 h-2.5 text-white/40" />
              <span className="text-white/40 text-[10px] font-bold">BLACKOUT</span>
            </div>
          )}
          <span className="text-white/30 text-xs font-mono">{formatClock(now, '24h', currentRoom?.timezone)}</span>
        </div>
      </header>

      {/* Main area */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 gap-8 overflow-hidden relative">

        {/* Ambient glow */}
        <div
          className="absolute inset-0 pointer-events-none transition-all duration-1000"
          style={{ background: `radial-gradient(ellipse 50% 50% at 50% 50%, ${timerColor}12 0%, transparent 70%)` }}
        />

        {/* Session info */}
        <div className="text-center z-10">
          {activeTimer?.showTitle && activeTimer.title ? (
            <p className="text-white/40 text-lg font-medium mb-1">{activeTimer.title}</p>
          ) : null}
          {activeTimer?.showSpeaker && activeTimer.speaker ? (
            <p className="text-white/60 text-2xl font-bold">{activeTimer.speaker}</p>
          ) : null}
          {!activeTimer && (
            <p className="text-white/15 text-xl font-mono">STANDBY</p>
          )}
        </div>

        {/* Big countdown */}
        <div
          className="z-10 font-mono font-black tabular-nums leading-none transition-colors duration-300 text-center"
          style={{
            fontSize: 'clamp(4rem, 18vw, 14rem)',
            color: timerColor,
            textShadow: `0 0 80px ${timerColor}40`
          }}
        >
          {isOvertime && (
            <div className="text-[0.18em] tracking-[0.4em] mb-2 opacity-70">+OVERTIME</div>
          )}
          {isPaused && (
            <div className="text-[0.12em] tracking-[0.5em] mb-2 opacity-40">PAUSED</div>
          )}
          {activeTimer ? formatDuration(activeTimer.remaining) : '--:--'}
        </div>

        {/* Progress bar */}
        {activeTimer && activeTimer.duration > 0 && !isOvertime && (
          <div className="w-full max-w-lg h-1 bg-white/8 rounded-full overflow-hidden z-10">
            <div
              className="h-full rounded-full transition-all duration-1000 ease-linear"
              style={{
                width: `${Math.max(0, (activeTimer.remaining / activeTimer.duration) * 100)}%`,
                backgroundColor: timerColor
              }}
            />
          </div>
        )}

        {/* Main play/pause control */}
        <div className="flex items-center gap-4 z-10">
          <button
            onClick={prev}
            disabled={!prevTimerItem && !activeTimer}
            className="p-3.5 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20
              text-white/50 hover:text-white/80 transition-all disabled:opacity-20 disabled:cursor-not-allowed"
            title="Previous"
          >
            <SkipBack className="w-5 h-5" />
          </button>

          <button
            onClick={() => activeTimer && (isRunning ? pause(activeTimer.id) : start(activeTimer.id))}
            disabled={!activeTimer}
            className={`px-10 py-4 rounded-2xl font-bold text-lg transition-all flex items-center gap-3
              disabled:opacity-20 disabled:cursor-not-allowed ${
              isRunning
                ? 'bg-yellow-500/15 border border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/25'
                : 'bg-green-500/15 border border-green-500/30 text-green-400 hover:bg-green-500/25'
            }`}
          >
            {isRunning ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
            {isRunning ? 'Pause' : activeTimer ? 'Resume' : 'Start'}
          </button>

          <button
            onClick={next}
            disabled={!activeTimer}
            className="p-3.5 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20
              text-white/50 hover:text-white/80 transition-all disabled:opacity-20 disabled:cursor-not-allowed"
            title="Next"
          >
            <SkipForward className="w-5 h-5" />
          </button>
        </div>

        {/* Secondary controls */}
        <div className="flex items-center gap-3 z-10">
          {/* Nudge */}
          {([[-60, '-1m'], [-10, '-10s'], [10, '+10s'], [60, '+1m']] as [number, string][]).map(([secs, label]) => (
            <button
              key={label}
              onClick={() => activeTimer && nudge(activeTimer.id, secs)}
              disabled={!activeTimer}
              className={`px-3 py-1.5 rounded-xl text-xs font-mono border transition-all disabled:opacity-20 ${
                secs < 0
                  ? 'border-red-500/20 text-red-400/60 hover:bg-red-500/10 hover:text-red-400'
                  : 'border-cyan-500/20 text-cyan-400/60 hover:bg-cyan-500/10 hover:text-cyan-400'
              }`}
            >
              {label}
            </button>
          ))}

          <div className="w-px h-5 bg-white/10" />

          <button
            onClick={() => activeTimer && reset(activeTimer.id)}
            disabled={!activeTimer}
            className="p-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-white/40
              hover:text-white/70 transition-all disabled:opacity-20"
            title="Reset"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>

        {/* Next session preview */}
        {nextTimer && (
          <div className="flex items-center gap-3 bg-white/4 border border-white/8 rounded-2xl px-5 py-3 z-10">
            <ChevronRight className="w-3.5 h-3.5 text-white/25" />
            <span className="text-white/30 text-xs">Next</span>
            <span className="text-white/60 text-sm font-semibold">{nextTimer.title}</span>
            {nextTimer.speaker && <span className="text-white/30 text-xs">· {nextTimer.speaker}</span>}
            <span className="text-white/30 text-xs font-mono ml-1">{formatDuration(nextTimer.duration)}</span>
          </div>
        )}

        {/* Active message */}
        {activeMessage && (
          <div
            className="absolute bottom-6 left-6 right-6 rounded-2xl px-5 py-3 text-center font-semibold z-20
              border border-white/10"
            style={{ backgroundColor: activeMessage.backgroundColor, color: activeMessage.textColor }}
          >
            {activeMessage.emoji && <span className="mr-2">{activeMessage.emoji}</span>}
            {activeMessage.text}
          </div>
        )}
      </div>

      {/* Rundown strip at bottom */}
      <div className="border-t border-white/8 flex-shrink-0 overflow-x-auto">
        <div className="flex items-stretch gap-0 min-w-max">
          {timers.map((timer, idx) => {
            const isCurr = timer.status === 'running' || timer.status === 'paused' || timer.status === 'overtime'
            const isDone = timer.status === 'finished'
            const color = isCurr ? getTimerColor(timer.remaining, timer.wrapupColors) : undefined

            return (
              <div
                key={timer.id}
                className={`px-4 py-3 border-r border-white/8 flex items-center gap-2.5 min-w-[160px] transition-all ${
                  isCurr ? 'bg-white/5' : isDone ? 'opacity-30' : ''
                }`}
              >
                <span className="text-white/20 text-xs font-mono w-4 text-center">{idx + 1}</span>
                {isCurr ? (
                  <div className="w-2 h-2 rounded-full animate-pulse flex-shrink-0" style={{ backgroundColor: color }} />
                ) : isDone ? (
                  <div className="w-2 h-2 rounded-full bg-green-400/40 flex-shrink-0" />
                ) : (
                  <div className="w-2 h-2 rounded-full bg-white/10 flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className={`text-xs font-semibold truncate ${isCurr ? 'text-white' : isDone ? 'text-white/30 line-through' : 'text-white/50'}`}>
                    {timer.title}
                  </p>
                </div>
                <span className="text-xs font-mono flex-shrink-0" style={{ color: isCurr ? color : '#374151' }}>
                  {isCurr ? formatDuration(timer.remaining) : formatDuration(timer.duration)}
                </span>
              </div>
            )
          })}
          {timers.length === 0 && (
            <div className="px-6 py-3 text-white/20 text-xs">No timers</div>
          )}
        </div>
      </div>
    </div>
  )
}
