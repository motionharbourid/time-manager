import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { useRoomStore } from '@/store/useRoomStore'
import { useMessageStore } from '@/store/useMessageStore'
import { useTimer } from '@/hooks/useTimer'
import { useSync } from '@/hooks/useSync'
import { formatDuration, formatClock, getTimerColor } from '@/lib/utils'

export default function Viewer() {
  const { roomId } = useParams<{ roomId: string }>()
  // viewType='viewer': joins room as viewer, receives all sync events, no control emits
  const { timers } = useTimer(roomId, 'viewer')
  // Poll PHP API every 2s — keeps timer + message in sync without socket server
  useSync(roomId, 2000)
  const { currentRoom, loadRoom } = useRoomStore()
  const { activeMessage } = useMessageStore()
  const [now, setNow] = useState(new Date())
  const [cursorVisible, setCursorVisible] = useState(false)

  useEffect(() => {
    if (!roomId) return
    loadRoom(roomId)
    const clockTick = setInterval(() => setNow(new Date()), 500)
    return () => clearInterval(clockTick)
  }, [roomId]) // eslint-disable-line react-hooks/exhaustive-deps

  // Hide cursor after 3s of inactivity
  const handleMouseMove = useCallback(() => {
    setCursorVisible(true)
    const t = setTimeout(() => setCursorVisible(false), 3000)
    return () => clearTimeout(t)
  }, [])

  // Tap anywhere on mobile to request fullscreen
  const handleTap = useCallback(() => {
    const el = document.documentElement
    if (!document.fullscreenElement) {
      el.requestFullscreen?.().catch(() => {})
    }
  }, [])

  const activeTimer = timers.find(t => t.status === 'running' || t.status === 'paused' || t.status === 'overtime')
  const nextTimer = (() => {
    if (!activeTimer) return timers[0]
    const idx = timers.findIndex(t => t.id === activeTimer.id)
    return timers[idx + 1]
  })()

  const timerColor = activeTimer
    ? getTimerColor(activeTimer.remaining, activeTimer.wrapupColors)
    : '#22c55e'
  const isOvertime = activeTimer?.status === 'overtime'
  const isPaused = activeTimer?.status === 'paused'
  const progress = activeTimer && activeTimer.duration > 0
    ? Math.max(0, Math.min(100, (activeTimer.remaining / activeTimer.duration) * 100))
    : 0

  // Blackout screen
  if (currentRoom?.blackout) {
    return <div className="w-screen h-screen bg-black" onClick={handleTap} />
  }

  const bgColor = currentRoom?.backgroundColor ?? '#0A0A0A'
  const clockStr = currentRoom?.masterClock
    ? formatClock(now, '24h', currentRoom.timezone)
    : null

  return (
    <div
      className="w-screen h-screen select-none overflow-hidden relative flex flex-col"
      style={{
        backgroundColor: bgColor,
        cursor: cursorVisible ? 'default' : 'none'
      }}
      onMouseMove={handleMouseMove}
      onClick={handleTap}
    >
      {/* Ambient background glow */}
      {activeTimer && (
        <div
          className="absolute inset-0 pointer-events-none transition-all duration-2000"
          style={{
            background: `radial-gradient(ellipse 60% 40% at 50% 60%, ${timerColor}18 0%, transparent 70%)`
          }}
        />
      )}

      {/* ON AIR badge */}
      {currentRoom?.onAir && (
        <div className="absolute top-6 left-8 z-10 flex items-center gap-2 bg-red-500/90 backdrop-blur-sm
          text-white text-xs font-black px-3 py-1.5 rounded-lg tracking-widest shadow-lg">
          <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
          ON AIR
        </div>
      )}

      {/* Master clock */}
      {clockStr && (
        <div className="absolute top-6 right-8 z-10 font-mono text-2xl font-light"
          style={{ color: `${timerColor}60` }}>
          {clockStr}
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 relative z-10">

        {activeTimer ? (
          <div className="w-full text-center">
            {/* Session title */}
            {activeTimer.showTitle && activeTimer.title && (
              <p
                className="font-display font-medium mb-3 transition-all duration-500"
                style={{
                  fontSize: 'clamp(1rem, 3vw, 2rem)',
                  color: `${timerColor}80`
                }}
              >
                {activeTimer.title}
              </p>
            )}

            {/* Speaker name — large and prominent */}
            {activeTimer.showSpeaker && activeTimer.speaker && (
              <p
                className="font-display font-bold mb-6 transition-all duration-500"
                style={{
                  fontSize: 'clamp(1.5rem, 4vw, 3rem)',
                  color: `${timerColor}CC`
                }}
              >
                {activeTimer.speaker}
              </p>
            )}

            {/* TIMER — the centerpiece */}
            <div
              className="font-mono font-black tabular-nums leading-none tracking-tight transition-colors duration-500 select-none"
              style={{
                fontSize: 'clamp(5rem, 22vw, 18rem)',
                color: timerColor,
                textShadow: `0 0 120px ${timerColor}30, 0 0 40px ${timerColor}20`
              }}
            >
              {isOvertime && (
                <span
                  className="block font-display font-black tracking-widest mb-2"
                  style={{ fontSize: '0.12em', color: timerColor, opacity: 0.8 }}
                >
                  OVERTIME
                </span>
              )}
              {formatDuration(activeTimer.remaining)}
            </div>

            {/* Status label */}
            {isPaused && (
              <p className="mt-4 font-mono text-sm tracking-[0.3em] uppercase"
                style={{ color: `${timerColor}50` }}>
                PAUSED
              </p>
            )}

            {/* Progress bar */}
            {activeTimer.duration > 0 && !isOvertime && (
              <div className="mt-10 mx-auto" style={{ maxWidth: 'clamp(200px, 50vw, 600px)' }}>
                <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-1000 ease-linear"
                    style={{ width: `${progress}%`, backgroundColor: timerColor }}
                  />
                </div>
                <div className="flex justify-between mt-2 opacity-30" style={{ color: timerColor }}>
                  <span className="text-xs font-mono">{formatDuration(activeTimer.duration)}</span>
                  <span className="text-xs font-mono">0:00</span>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center">
            <p className="font-mono text-white/10 font-black"
              style={{ fontSize: 'clamp(4rem, 15vw, 12rem)' }}>
              STANDBY
            </p>
          </div>
        )}
      </div>

      {/* Next timer bar */}
      {nextTimer && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-10">
          <div className="flex items-center gap-4 bg-black/50 backdrop-blur-md border border-white/5
            rounded-2xl px-6 py-3">
            <span className="text-xs font-medium uppercase tracking-widest" style={{ color: `${timerColor}50` }}>
              Next
            </span>
            <span className="text-sm font-semibold text-white/60">{nextTimer.title}</span>
            {nextTimer.speaker && (
              <span className="text-xs text-white/30">· {nextTimer.speaker}</span>
            )}
            <span className="text-xs font-mono text-white/30">{formatDuration(nextTimer.duration)}</span>
          </div>
        </div>
      )}

      {/* Active message */}
      {activeMessage && (
        <div
          className={`absolute bottom-0 left-0 right-0 z-20 px-8 py-5 transition-all ${
            activeMessage.flash ? 'animate-flash-message' : ''
          }`}
          style={{
            backgroundColor: activeMessage.backgroundColor || '#111111',
            color: activeMessage.textColor || '#ffffff',
            borderTop: `1px solid ${activeMessage.textColor || '#ffffff'}15`
          }}
        >
          <p className="text-center font-semibold leading-tight"
            style={{ fontSize: 'clamp(1rem, 3vw, 2rem)' }}>
            {activeMessage.emoji && <span className="mr-3">{activeMessage.emoji}</span>}
            {activeMessage.text}
          </p>
        </div>
      )}
    </div>
  )
}
