import type { Server as HTTPServer } from 'http'
import { Server as SocketServer } from 'socket.io'
import { v4 as uuidv4 } from 'uuid'
import {
  getOrCreateRoom, addConnection, removeConnection, getRoomSnapshot, setRoomState
} from './rooms'
import type { ViewerConnection } from './types'

const ALLOWED_ORIGINS = [
  'https://timemanager.motionharbour.com',
  'http://localhost:5173',
  'http://localhost:4173',
  'http://127.0.0.1:5173'
]

export function setupSocket(httpServer: HTTPServer): SocketServer {
  const io = new SocketServer(httpServer, {
    cors: {
      origin: (origin, cb) => {
        if (!origin || ALLOWED_ORIGINS.some(o => origin.startsWith(o)) || origin.includes('192.168.')) {
          cb(null, true)
        } else {
          cb(null, true) // open in dev; tighten in prod if needed
        }
      },
      methods: ['GET', 'POST']
    },
    transports: ['websocket', 'polling'],
    pingTimeout: 30000,
    pingInterval: 10000
  })

  io.on('connection', (socket) => {
    const clientIp = (socket.handshake.headers['x-forwarded-for'] as string)?.split(',')[0].trim()
      ?? socket.handshake.address

    console.log(`[Socket] Client connected: ${socket.id} from ${clientIp}`)

    // ── Join room ─────────────────────────────────────────────────────────────

    socket.on('room:join', ({ roomId, viewType, deviceName }) => {
      if (!roomId) return

      const connId = uuidv4()
      const deviceType = detectDeviceType(socket.handshake.headers['user-agent'] ?? '')

      const conn: ViewerConnection = {
        id: connId,
        roomId,
        deviceName: deviceName ?? 'Unknown Device',
        deviceType,
        viewType: (viewType ?? 'viewer') as ViewerConnection['viewType'],
        ipAddress: clientIp,
        connectedAt: Date.now(),
        lastSeen: Date.now(),
        isOnline: true
      }

      socket.join(roomId)
      socket.data.roomId = roomId
      socket.data.connId = connId
      addConnection(roomId, conn)

      // Send current state snapshot to the joining client
      const snapshot = getRoomSnapshot(roomId)
      if (snapshot) socket.emit('room:state', { ...snapshot, operatorId: 'server' })

      // Notify others of new connection
      socket.to(roomId).emit('viewer:join', conn)
      console.log(`[Socket] ${deviceName} (${viewType}) joined room ${roomId}`)
    })

    // ── Leave room ────────────────────────────────────────────────────────────

    socket.on('room:leave', ({ roomId }) => {
      socket.leave(roomId)
      if (socket.data.connId) {
        removeConnection(roomId, socket.data.connId)
        io.to(roomId).emit('viewer:leave', { viewerId: socket.data.connId })
      }
    })

    // ── Timer controls ────────────────────────────────────────────────────────

    socket.on('timer:control', ({ roomId, action, timerId }) => {
      if (!roomId) return
      const state = getOrCreateRoom(roomId)
      const now = Date.now()

      if (timerId && state.timers.has(timerId)) {
        const timer = state.timers.get(timerId)!

        switch (action) {
          case 'start': {
            const startedAt = timer.pausedAt ? now - (timer.elapsed * 1000) : now
            state.timers.set(timerId, { ...timer, status: 'running', startedAt, pausedAt: null, lastModified: now })
            io.to(roomId).emit('timer:start', { timerId, startedAt })
            break
          }
          case 'pause': {
            state.timers.set(timerId, { ...timer, status: 'paused', pausedAt: now, lastModified: now })
            io.to(roomId).emit('timer:pause', { timerId, elapsed: timer.elapsed })
            break
          }
          case 'reset': {
            state.timers.set(timerId, {
              ...timer, status: 'idle', elapsed: 0, remaining: timer.duration,
              startedAt: null, pausedAt: null, lastModified: now
            })
            io.to(roomId).emit('timer:reset', { timerId })
            break
          }
        }
      }

      if (action === 'next' || action === 'prev') {
        const timerList = Array.from(state.timers.values()).sort((a, b) => a.order - b.order)
        const activeIdx = timerList.findIndex(t => t.status === 'running' || t.status === 'paused')
        const targetIdx = action === 'next' ? activeIdx + 1 : activeIdx - 1

        if (targetIdx >= 0 && targetIdx < timerList.length) {
          const nowMs = Date.now()

          // Stop & reset the currently active timer
          if (activeIdx >= 0) {
            const current = timerList[activeIdx]
            const stopped = {
              ...current, status: 'idle' as const, elapsed: 0, remaining: current.duration,
              startedAt: null, pausedAt: null, lastModified: nowMs
            }
            state.timers.set(current.id, stopped)
            io.to(roomId).emit('timer:update', stopped)
          }

          // Start the target timer
          const target = timerList[targetIdx]
          const started = { ...target, status: 'running' as const, startedAt: nowMs, pausedAt: null, lastModified: nowMs }
          state.timers.set(target.id, started)
          state.activeTimerId = target.id
          io.to(roomId).emit('timer:start', { timerId: target.id, startedAt: nowMs })
          io.to(roomId).emit('timer:next', { nextTimerId: target.id })
        }
      }
    })

    // ── Timer nudge ────────────────────────────────────────────────────────────

    socket.on('timer:nudge', ({ roomId, timerId, seconds }) => {
      if (!roomId || !timerId) return
      const state = getOrCreateRoom(roomId)
      const timer = state.timers.get(timerId)
      if (!timer) return
      const now = Date.now()
      const newRemaining = timer.remaining + seconds
      // Shift startedAt so the tick engine on all clients continues from the nudged value
      let newStartedAt = timer.startedAt
      if (timer.status === 'running' && timer.startedAt) {
        const newElapsed = Math.max(0, timer.duration - newRemaining)
        newStartedAt = now - (newElapsed * 1000)
      }
      state.timers.set(timerId, { ...timer, remaining: newRemaining, startedAt: newStartedAt, lastModified: now })
      io.to(roomId).emit('timer:update', state.timers.get(timerId)!)
    })

    // ── Timer update (from controller editing) ────────────────────────────────

    socket.on('timer:update', ({ roomId, timer }) => {
      if (!roomId || !timer?.id) return
      const state = getOrCreateRoom(roomId)
      const existing = state.timers.get(timer.id)
      if (existing) {
        state.timers.set(timer.id, { ...existing, ...timer, lastModified: Date.now() })
        socket.to(roomId).emit('timer:update', state.timers.get(timer.id)!)
      }
    })

    // ── Messages ──────────────────────────────────────────────────────────────

    socket.on('message:send', ({ roomId, message }) => {
      if (!roomId || !message) return
      const state = getOrCreateRoom(roomId)
      const id = uuidv4()
      const now = Date.now()
      const msg = {
        id, roomId, ...message, isActive: true, createdAt: now, expiresAt: null,
        lastModified: now, syncStatus: 'synced'
      }
      state.messages.set(id, msg)
      // Mark as the active message
      state.activeMessageId = id
      io.to(roomId).emit('message:new', msg)
    })

    socket.on('message:clear', ({ roomId, messageId }) => {
      if (!roomId || !messageId) return
      const state = getOrCreateRoom(roomId)
      state.messages.delete(messageId)
      if (state.activeMessageId === messageId) state.activeMessageId = null
      io.to(roomId).emit('message:clear', { messageId })
    })

    // ── Message activate / deactivate ─────────────────────────────────────────

    socket.on('message:activate', ({ roomId, messageId }) => {
      if (!roomId) return
      const state = getOrCreateRoom(roomId)

      if (!messageId) {
        // Deactivate: no active message
        state.activeMessageId = null
        io.to(roomId).emit('message:activate', { messageId: null, message: null })
        return
      }

      const msg = state.messages.get(messageId) ?? null
      state.activeMessageId = msg ? messageId : null
      io.to(roomId).emit('message:activate', { messageId: state.activeMessageId, message: msg })
    })

    // ── Room updates ──────────────────────────────────────────────────────────

    socket.on('room:update', ({ roomId, updates }) => {
      if (!roomId) return
      const state = getOrCreateRoom(roomId)

      if ('onAir' in updates) {
        state.onAir = updates.onAir
        io.to(roomId).emit('room:onair', { onAir: updates.onAir })
      }
      if ('blackout' in updates) {
        state.blackout = updates.blackout
        io.to(roomId).emit('room:blackout', { blackout: updates.blackout })
      }
    })

    // ── Sync request ──────────────────────────────────────────────────────────

    socket.on('sync:request', ({ roomId }) => {
      const snapshot = getRoomSnapshot(roomId)
      if (snapshot) socket.emit('room:state', { ...snapshot, operatorId: 'server' })
    })

    // ── Disconnect ────────────────────────────────────────────────────────────

    socket.on('disconnect', () => {
      const { roomId, connId } = socket.data
      if (roomId && connId) {
        removeConnection(roomId, connId)
        io.to(roomId).emit('viewer:leave', { viewerId: connId })
      }
      console.log(`[Socket] Client disconnected: ${socket.id}`)
    })
  })

  setInterval(() => {
    cleanupInactiveRooms()
  }, 600_000)

  return io
}

function cleanupInactiveRooms() {
  const { cleanupInactiveRooms: cleanup } = require('./rooms') as typeof import('./rooms')
  cleanup()
}

function detectDeviceType(ua: string): ViewerConnection['deviceType'] {
  if (/Mobi|Android/i.test(ua)) return 'mobile'
  if (/Tablet|iPad/i.test(ua)) return 'tablet'
  if (ua) return 'desktop'
  return 'unknown'
}
