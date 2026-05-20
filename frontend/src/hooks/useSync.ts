import { useEffect, useRef } from 'react'
import { useConnectionStore } from '@/store/useConnectionStore'
import { useTimerStore } from '@/store/useTimerStore'
import { useMessageStore } from '@/store/useMessageStore'
import { flushPendingSync, pullAndMerge } from '@/lib/sync'

export function useSync(roomId?: string, intervalMs = 5000) {
  const { mode, isOnline, setLastSync, setSyncStatus } = useConnectionStore()
  const { loadTimers } = useTimerStore()
  const { loadMessages } = useMessageStore()
  const syncRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const isEffectivelyOnline = isOnline && mode === 'online'

  useEffect(() => {
    if (!roomId || !isEffectivelyOnline) return

    const doSync = async () => {
      setSyncStatus('pending')
      try {
        // Flush any local changes first (controller writes, nudges, etc.)
        await flushPendingSync(roomId)

        // Pull latest from PHP API
        const lastSync = parseInt(localStorage.getItem(`tm_last_sync_${roomId}`) ?? '0')
        const result = await pullAndMerge(roomId, lastSync)

        if (result) {
          localStorage.setItem(`tm_last_sync_${roomId}`, String(result.timestamp))
          await loadTimers(roomId)
          await loadMessages(roomId)
          setLastSync(result.timestamp)
          setSyncStatus('synced')

          // Sync active message from server (supports offline/no-socket scenario)
          const activeFromServer = result.messages?.find(m => m.isActive) ?? null
          useMessageStore.setState({ activeMessage: activeFromServer })
        }
      } catch {
        setSyncStatus('offline')
      }
    }

    doSync()
    syncRef.current = setInterval(doSync, intervalMs)

    return () => {
      if (syncRef.current) clearInterval(syncRef.current)
    }
  }, [roomId, isEffectivelyOnline, intervalMs]) // eslint-disable-line react-hooks/exhaustive-deps

  return { isEffectivelyOnline }
}
