import { useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { useTimer } from '@/hooks/useTimer'
import { useRoomStore } from '@/store/useRoomStore'
import { useSocket } from '@/hooks/useSocket'
import { useSync } from '@/hooks/useSync'
import { formatDuration } from '@/lib/utils'
import { CheckCircle, Circle, Clock } from 'lucide-react'

export default function Agenda() {
  const { roomId } = useParams<{ roomId: string }>()
  const { timers } = useTimer(roomId, 'viewer')
  const { currentRoom, loadRoom } = useRoomStore()

  useSocket(roomId)
  useSync(roomId, 3000)

  useEffect(() => {
    if (roomId) loadRoom(roomId)
  }, [roomId]) // eslint-disable-line react-hooks/exhaustive-deps

  const totalDuration = timers.reduce((sum, t) => sum + t.duration, 0)
  const completedTime = timers
    .filter(t => t.status === 'finished')
    .reduce((sum, t) => sum + t.duration, 0)

  return (
    <div className="min-h-screen bg-tm-darker text-white p-6 font-display">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">{currentRoom?.name ?? 'Event'}</h1>
          <p className="text-slate-400 text-sm mt-1">{currentRoom?.id} · Agenda</p>
        </div>

        {/* Progress */}
        <div className="bg-tm-surface border border-tm-border rounded-xl p-4 mb-6">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-slate-400">Progress</span>
            <span className="font-mono">{formatDuration(completedTime)} / {formatDuration(totalDuration)}</span>
          </div>
          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 rounded-full transition-all"
              style={{ width: totalDuration > 0 ? `${(completedTime / totalDuration) * 100}%` : '0%' }}
            />
          </div>
        </div>

        {/* Timer list */}
        <div className="space-y-2">
          {timers.map((timer, index) => {
            const isActive = timer.status === 'running' || timer.status === 'overtime'
            const isDone = timer.status === 'finished'

            return (
              <div
                key={timer.id}
                className={`border rounded-xl p-4 transition-all ${
                  isActive
                    ? 'border-blue-500/50 bg-blue-500/10'
                    : isDone
                    ? 'border-green-500/20 bg-green-500/5 opacity-60'
                    : 'border-tm-border bg-tm-surface'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0">
                    {isDone ? (
                      <CheckCircle className="w-5 h-5 text-green-400" />
                    ) : isActive ? (
                      <div className="w-5 h-5 rounded-full border-2 border-blue-400 flex items-center justify-center">
                        <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
                      </div>
                    ) : (
                      <Circle className="w-5 h-5 text-slate-600" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-500 font-mono">{String(index + 1).padStart(2, '0')}</span>
                      <span className={`font-semibold truncate ${isActive ? 'text-blue-300' : isDone ? 'text-slate-500 line-through' : 'text-white'}`}>
                        {timer.title}
                      </span>
                    </div>
                    {timer.speaker && (
                      <p className="text-xs text-slate-500 ml-6 mt-0.5">{timer.speaker}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-sm font-mono">
                    {isActive ? (
                      <span className={`font-bold ${timer.status === 'overtime' ? 'text-red-400' : 'text-blue-400'}`}>
                        {formatDuration(timer.remaining)}
                      </span>
                    ) : (
                      <span className="text-slate-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDuration(timer.duration)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )
          })}

          {timers.length === 0 && (
            <div className="text-center text-slate-500 py-12">
              Belum ada sesi dalam rundown.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
