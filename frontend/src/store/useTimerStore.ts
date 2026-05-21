import { create } from 'zustand'
import type { Timer, TimerStatus, WrapupColors } from '@/types'
import { generateId, nowMs, deepClone } from '@/lib/utils'
import { dbSaveTimer, dbSaveTimers, dbGetTimers, dbDeleteTimer } from '@/lib/db'
import { dbAddPendingSync } from '@/lib/db'

const DEFAULT_WRAPUP: WrapupColors = {
  stage1: { threshold: 300, color: '#eab308' },   // 5min → yellow
  stage2: { threshold: 120, color: '#f97316' },   // 2min → orange
  stage3: { threshold: 30,  color: '#ef4444' }    // 30s  → red (overtime → purple)
}

function makeTimer(roomId: string, overrides?: Partial<Timer>): Timer {
  const id = generateId()
  return {
    id,
    roomId,
    order: 0,
    title: 'New Timer',
    speaker: '',
    duration: 600,          // 10 minutes default
    elapsed: 0,
    remaining: 600,
    status: 'idle',
    trigger: 'manual',
    wrapupColors: deepClone(DEFAULT_WRAPUP),
    chime: 'none',
    chimeAt: 60,
    notes: '',
    backgroundColor: '',
    textColor: '',
    showSpeaker: true,
    showTitle: true,
    overtimeLimit: 0,
    startedAt: null,
    pausedAt: null,
    lastModified: nowMs(),
    syncStatus: 'offline',
    ...overrides
  }
}

interface TimerStore {
  timers: Timer[]
  tickHandle: ReturnType<typeof setInterval> | null

  // CRUD
  loadTimers: (roomId: string) => Promise<void>
  addTimer: (roomId: string, overrides?: Partial<Timer>) => Promise<Timer>
  updateTimer: (id: string, updates: Partial<Timer>) => Promise<void>
  deleteTimer: (id: string) => Promise<void>
  reorderTimers: (orderedIds: string[]) => Promise<void>

  // Playback
  startTimer: (id: string) => void
  pauseTimer: (id: string) => void
  resetTimer: (id: string) => void
  nudgeTimer: (id: string, seconds: number) => void
  nextTimer: () => void
  prevTimer: () => void

  // Tick engine (called from useEffect)
  startTicking: () => void
  stopTicking: () => void

  // Selectors
  getActiveTimer: () => Timer | undefined
  getTimerById: (id: string) => Timer | undefined
}

export const useTimerStore = create<TimerStore>((set, get) => ({
  timers: [],
  tickHandle: null,

  loadTimers: async (roomId) => {
    const timers = await dbGetTimers(roomId)
    set({ timers })
  },

  addTimer: async (roomId, overrides) => {
    const timers = get().timers
    const timer = makeTimer(roomId, {
      order: timers.length,
      ...overrides
    })
    await dbSaveTimer(timer)
    set({ timers: [...timers, timer] })
    return timer
  },

  updateTimer: async (id, updates) => {
    const updated = get().timers.map(t =>
      t.id === id ? { ...t, ...updates, lastModified: nowMs() } : t
    )
    const timer = updated.find(t => t.id === id)
    if (!timer) return
    await dbSaveTimer(timer)
    await dbAddPendingSync('timer', timer)
    set({ timers: updated })
  },

  deleteTimer: async (id) => {
    await dbDeleteTimer(id)
    const remaining = get().timers
      .filter(t => t.id !== id)
      .map((t, i) => ({ ...t, order: i }))
    await dbSaveTimers(remaining)
    set({ timers: remaining })
  },

  reorderTimers: async (orderedIds) => {
    const timerMap = new Map(get().timers.map(t => [t.id, t]))
    const reordered = orderedIds
      .map((id, i) => ({ ...timerMap.get(id)!, order: i, lastModified: nowMs() }))
      .filter(Boolean)
    await dbSaveTimers(reordered)
    set({ timers: reordered })
  },

  startTimer: (id) => {
    const now = nowMs()
    set((s) => ({
      timers: s.timers.map(t => {
        if (t.id !== id) return t
        if (t.status === 'running') return t
        const startedAt = t.pausedAt ? now - (t.elapsed * 1000) : now
        return { ...t, status: 'running', startedAt, pausedAt: null, lastModified: now }
      })
    }))
    const timer = get().timers.find(t => t.id === id)
    if (timer) { dbSaveTimer(timer); dbAddPendingSync('timer', timer) }
  },

  pauseTimer: (id) => {
    const now = nowMs()
    set((s) => ({
      timers: s.timers.map(t => {
        if (t.id !== id || t.status !== 'running') return t
        return { ...t, status: 'paused', pausedAt: now, lastModified: now }
      })
    }))
    const timer = get().timers.find(t => t.id === id)
    if (timer) { dbSaveTimer(timer); dbAddPendingSync('timer', timer) }
  },

  resetTimer: (id) => {
    const now = nowMs()
    set((s) => ({
      timers: s.timers.map(t => {
        if (t.id !== id) return t
        return { ...t, status: 'idle', elapsed: 0, remaining: t.duration, startedAt: null, pausedAt: null, lastModified: now }
      })
    }))
    const timer = get().timers.find(t => t.id === id)
    if (timer) { dbSaveTimer(timer); dbAddPendingSync('timer', timer) }
  },

  nudgeTimer: (id, seconds) => {
    const now = nowMs()
    let nudged: Timer | undefined
    set((s) => ({
      timers: s.timers.map(t => {
        if (t.id !== id) return t
        const newRemaining = t.remaining + seconds
        let newStartedAt = t.startedAt
        let newElapsed = t.elapsed
        if (t.status === 'running' && t.startedAt) {
          // Shift startedAt so tick engine continues from nudged value
          newElapsed = Math.max(0, t.duration - newRemaining)
          newStartedAt = now - (newElapsed * 1000)
        } else if (t.status === 'paused') {
          // Adjust elapsed so resume computes correctly
          newElapsed = Math.max(0, t.duration - newRemaining)
        }
        nudged = { ...t, remaining: newRemaining, elapsed: newElapsed, startedAt: newStartedAt, lastModified: now }
        return nudged
      })
    }))
    if (nudged) { dbSaveTimer(nudged); dbAddPendingSync('timer', nudged) }
  },

  nextTimer: () => {
    const { timers } = get()
    const activeIdx = timers.findIndex(t => t.status === 'running' || t.status === 'paused')
    if (activeIdx === -1 || activeIdx >= timers.length - 1) return
    const currentId = timers[activeIdx].id
    const nextId = timers[activeIdx + 1].id
    get().pauseTimer(currentId)
    get().resetTimer(currentId)
    get().startTimer(nextId)
  },

  prevTimer: () => {
    const { timers } = get()
    const activeIdx = timers.findIndex(t => t.status === 'running' || t.status === 'paused')
    if (activeIdx <= 0) return
    const currentId = timers[activeIdx].id
    const prevId = timers[activeIdx - 1].id
    get().pauseTimer(currentId)
    get().resetTimer(currentId)
    get().startTimer(prevId)
  },

  startTicking: () => {
    if (get().tickHandle) return
    let prevTimers = get().timers
    const handle = setInterval(() => {
      const now = nowMs()
      set((s) => ({
        timers: s.timers.map(t => {
          if (t.status !== 'running' || !t.startedAt) return t
          const elapsed = Math.floor((now - t.startedAt) / 1000)
          const remaining = t.duration - elapsed
          const status: TimerStatus = remaining > 0 ? 'running' : remaining <= -(t.overtimeLimit || 99999) ? 'finished' : 'overtime'
          return { ...t, elapsed, remaining, status }
        })
      }))
      const curr = get().timers
      for (const timer of curr) {
        const prev = prevTimers.find(t => t.id === timer.id)
        if (!prev) continue
        // Auto-advance when trigger !== 'manual' and timer just finished
        if (timer.status === 'finished' && prev.status !== 'finished' && timer.trigger !== 'manual') {
          get().nextTimer()
          break
        }
        // Fire chime when remaining just crossed chimeAt threshold
        if (
          timer.status === 'running' && timer.chime !== 'none' &&
          timer.chimeAt > 0 && prev.remaining > timer.chimeAt && timer.remaining <= timer.chimeAt
        ) {
          import('@/lib/chime').then(({ playChime }) => playChime(timer.chime as 'bell' | 'beep' | 'ding' | 'none' | 'custom'))
        }
      }
      prevTimers = curr
    }, 250)
    set({ tickHandle: handle })
  },

  stopTicking: () => {
    const handle = get().tickHandle
    if (handle) clearInterval(handle)
    set({ tickHandle: null })
  },

  getActiveTimer: () => get().timers.find(t => t.status === 'running' || t.status === 'paused'),
  getTimerById: (id) => get().timers.find(t => t.id === id)
}))
