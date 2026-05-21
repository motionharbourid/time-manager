import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { useTimer } from '@/hooks/useTimer'
import { useRoomStore } from '@/store/useRoomStore'
import { useMessageStore } from '@/store/useMessageStore'
import { useSync } from '@/hooks/useSync'
import { formatDuration, getTimerColor } from '@/lib/utils'

// Minimal full-screen timer — just the countdown, nothing else.
// Designed for secondary screens, presenter monitors, and confidence monitors.
export default function Focus() {
  const { roomId } = useParams<{ roomId: string }>()
  const { timers } = useTimer(roomId, 'viewer')
  useSync(roomId, 2000)
  const { currentRoom, loadRoom } = useRoomStore()
  const { activeMessage } = useMessageStore()
  const [cursorVisible, setCursorVisible] = useState(false)

  useEffect(() => {
    if (roomId) loadRoom(roomId)
  }, [roomId]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleMouseMove = useCallback(() => {
    setCursorVisible(true)
    const t = setTimeout(() => setCursorVisible(false), 2000)
    return () => clearTimeout(t)
  }, [])

  const handleTap = useCallback(() => {
    const el = document.documentElement
    if (!document.fullscreenElement) {
      el.requestFullscreen?.().catch(() => {})
    }
  }, [])

  const activeTimer = timers.find(t => t.status === 'running' || t.status === 'paused' || t.status === 'overtime')
  const timerColor = activeTimer
    ? getTimerColor(activeTimer.remaining, activeTimer.wrapupColors)
    : '#22c55e'
  const isOvertime = activeTimer?.status === 'overtime'

  if (currentRoom?.blackout) {
    return <div className="w-screen h-screen bg-black" />
  }

  const bgColor = currentRoom?.backgroundColor ?? '#000000'

  return (
    <div
      className="w-screen h-screen flex flex-col items-center justify-center overflow-hidden"
      style={{
        backgroundColor: bgColor,
        cursor: cursorVisible ? 'default' : 'none'
      }}
      onMouseMove={handleMouseMove}
      onClick={handleTap}
    >
      {/* Subtle background glow */}
      {activeTimer && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: `radial-gradient(ellipse 60% 50% at 50% 60%, ${timerColor}15 0%, transparent 65%)` }}
        />
      )}

      {/* Overtime label */}
      {isOvertime && (
        <p
          className="absolute top-[30%] font-mono font-black tracking-[0.5em] uppercase"
          style={{ fontSize: 'clamp(0.75rem, 2vw, 1.5rem)', color: `${timerColor}60` }}
        >
          OVERTIME
        </p>
      )}

      {/* The countdown — fills the screen */}
      <div
        className="font-mono font-black tabular-nums leading-none select-none transition-colors duration-500 z-10"
        style={{
          fontSize: 'clamp(6rem, 28vw, 22rem)',
          color: timerColor,
          textShadow: `0 0 120px ${timerColor}25`
        }}
      >
        {activeTimer ? formatDuration(activeTimer.remaining) : '--:--'}
      </div>

      {/* Active message — bottom strip */}
      {activeMessage && (
        <div
          className={`absolute bottom-0 left-0 right-0 px-10 py-6 text-center font-bold ${
            activeMessage.flash ? 'animate-flash-message' : ''
          }`}
          style={{
            backgroundColor: activeMessage.backgroundColor,
            color: activeMessage.textColor,
            fontSize: 'clamp(1.25rem, 3.5vw, 2.5rem)'
          }}
        >
          {activeMessage.emoji && <span className="mr-3">{activeMessage.emoji}</span>}
          {activeMessage.text}
        </div>
      )}
    </div>
  )
}
