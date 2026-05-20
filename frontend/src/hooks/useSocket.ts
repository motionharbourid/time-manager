import { useEffect, useRef } from 'react'
import { getSocket, connectSocket, joinRoom } from '@/lib/socket'
import { useConnectionStore } from '@/store/useConnectionStore'
import { useTimerStore } from '@/store/useTimerStore'
import { useRoomStore } from '@/store/useRoomStore'
import { useMessageStore } from '@/store/useMessageStore'

export function useSocket(roomId?: string, viewType: string = 'controller') {
  const { mode, isOnline, setSocketConnected } = useConnectionStore()
  const { updateTimer } = useTimerStore()
  const { updateRoom } = useRoomStore()
  const mounted = useRef(true)

  useEffect(() => {
    mounted.current = true
    return () => { mounted.current = false }
  }, [])

  useEffect(() => {
    if (mode === 'offline' || !isOnline) return

    const socket = connectSocket()

    // Named handlers so we can remove them precisely on cleanup
    const onConnect = () => {
      if (!mounted.current) return
      setSocketConnected(true)
      if (roomId) joinRoom(roomId, viewType)
    }

    const onDisconnect = () => {
      if (!mounted.current) return
      setSocketConnected(false)
    }

    socket.on('connect', onConnect)
    socket.on('disconnect', onDisconnect)

    // Full room state on join — restore timers, messages, activeMessage
    socket.on('room:state', (payload) => {
      if (!mounted.current) return
      if (Array.isArray(payload.timers)) {
        for (const t of payload.timers) updateTimer(t.id, t)
      }
      if (payload.room) {
        updateRoom(payload.room as Parameters<typeof updateRoom>[0])
      }
      if (Array.isArray(payload.messages)) {
        const { messages } = useMessageStore.getState()
        const merged = [
          ...payload.messages,
          ...messages.filter(m => !payload.messages.some((pm: { id: string }) => pm.id === m.id))
        ]
        useMessageStore.setState({ messages: merged })
      }
      if ('activeMessageId' in payload && payload.activeMessageId) {
        const msg = payload.messages?.find((m: { id: string }) => m.id === payload.activeMessageId) ?? null
        if (msg) useMessageStore.setState({ activeMessage: msg })
      }
    })

    // Full timer update (nudge, edit from other controller)
    socket.on('timer:update', (timer) => {
      if (!mounted.current) return
      updateTimer(timer.id, timer)
    })

    // Timer started — update status + startedAt so tick engine takes over
    socket.on('timer:start', ({ timerId, startedAt }) => {
      if (!mounted.current) return
      updateTimer(timerId, { status: 'running', startedAt, pausedAt: null })
    })

    // Timer paused
    socket.on('timer:pause', ({ timerId, elapsed }) => {
      if (!mounted.current) return
      updateTimer(timerId, { status: 'paused', pausedAt: Date.now(), elapsed })
    })

    // Timer reset — restore remaining from stored duration
    socket.on('timer:reset', ({ timerId }) => {
      if (!mounted.current) return
      const timer = useTimerStore.getState().getTimerById(timerId)
      if (timer) {
        updateTimer(timerId, {
          status: 'idle', elapsed: 0, remaining: timer.duration,
          startedAt: null, pausedAt: null
        })
      }
    })

    // Next/prev — server already emitted timer:update for stopped + timer:start for new active
    // This event is informational; no extra state needed here
    socket.on('timer:next', () => { /* handled via timer:start + timer:update */ })

    socket.on('room:onair', ({ onAir }) => {
      if (!mounted.current) return
      updateRoom({ onAir })
    })

    socket.on('room:blackout', ({ blackout }) => {
      if (!mounted.current) return
      updateRoom({ blackout })
    })

    // New message: add to list, set active if server says so
    socket.on('message:new', (message) => {
      if (!mounted.current) return
      useMessageStore.setState((s) => ({
        messages: [message, ...s.messages.filter(m => m.id !== message.id)],
        activeMessage: message.isActive ? message : s.activeMessage
      }))
    })

    // Message deleted
    socket.on('message:clear', ({ messageId }) => {
      if (!mounted.current) return
      useMessageStore.setState((s) => ({
        messages: s.messages.filter(m => m.id !== messageId),
        activeMessage: s.activeMessage?.id === messageId ? null : s.activeMessage
      }))
    })

    // Message activated/deactivated by any controller in the room
    socket.on('message:activate', ({ message }) => {
      if (!mounted.current) return
      useMessageStore.setState({ activeMessage: message })
    })

    // If socket is already connected when this effect runs, join immediately
    if (socket.connected && roomId) {
      setSocketConnected(true)
      joinRoom(roomId, viewType)
    }

    return () => {
      socket.off('connect', onConnect)
      socket.off('disconnect', onDisconnect)
      socket.off('room:state')
      socket.off('timer:update')
      socket.off('timer:start')
      socket.off('timer:pause')
      socket.off('timer:reset')
      socket.off('timer:next')
      socket.off('room:onair')
      socket.off('room:blackout')
      socket.off('message:new')
      socket.off('message:clear')
      socket.off('message:activate')
    }
  }, [mode, isOnline, roomId, viewType]) // eslint-disable-line react-hooks/exhaustive-deps

  const emitTimerControl = (action: 'start' | 'pause' | 'reset' | 'next' | 'prev', timerId?: string) => {
    if (!roomId || mode === 'offline') return
    getSocket().emit('timer:control', { roomId, action, timerId })
  }

  const emitNudge = (timerId: string, seconds: number) => {
    if (!roomId || mode === 'offline') return
    getSocket().emit('timer:nudge', { roomId, timerId, seconds })
  }

  return { emitTimerControl, emitNudge }
}
