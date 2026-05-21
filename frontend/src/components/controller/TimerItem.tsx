import { useState } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  GripVertical, Play, Pause, RotateCcw, Trash2,
  ChevronDown, ChevronUp, Clock, Bell, SkipForward,
  Eye, EyeOff
} from 'lucide-react'
import { formatDuration, getTimerColor, parseDuration } from '@/lib/utils'
import { playChime } from '@/lib/chime'
import type { Timer } from '@/types'

interface TimerItemProps {
  timer: Timer
  index: number
  isActive: boolean
  onStart: (id: string) => void
  onPause: (id: string) => void
  onReset: (id: string) => void
  onUpdate: (id: string, updates: Partial<Timer>) => void
  onDelete: (id: string) => void
}

export function TimerItem({ timer, index, isActive, onStart, onPause, onReset, onUpdate, onDelete }: TimerItemProps) {
  const [expanded, setExpanded] = useState(false)
  const [editingDuration, setEditingDuration] = useState(false)
  const [durationInput, setDurationInput] = useState('')

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: timer.id })
  const style = { transform: CSS.Transform.toString(transform), transition }

  const timerColor = getTimerColor(timer.remaining, timer.wrapupColors)
  const isRunning = timer.status === 'running'
  const isOvertime = timer.status === 'overtime'
  const isPaused = timer.status === 'paused'
  const isFinished = timer.status === 'finished'
  const progress = timer.duration > 0 ? Math.max(0, (timer.remaining / timer.duration)) * 100 : 0

  const handleDurationSave = () => {
    const secs = parseDuration(durationInput)
    if (secs > 0) onUpdate(timer.id, { duration: secs, remaining: secs, elapsed: 0 })
    setEditingDuration(false)
  }

  const statusLabel = isRunning ? 'RUNNING' : isPaused ? 'PAUSED' : isOvertime ? 'OVERTIME' : isFinished ? 'DONE' : null

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group relative rounded-xl overflow-hidden transition-all duration-200 ${
        isDragging ? 'opacity-40 scale-[0.98] shadow-2xl' : ''
      }`}
    >
      {/* Left accent bar */}
      <div
        className="absolute left-0 top-0 bottom-0 w-0.5 rounded-full transition-all duration-500"
        style={{ backgroundColor: isActive ? timerColor : 'transparent' }}
      />

      <div className={`border rounded-xl overflow-hidden transition-all duration-200 ${
        isActive
          ? 'border-white/10 bg-tm-surface-2 shadow-lg'
          : 'border-tm-border bg-tm-surface hover:border-tm-border-2'
      }`}
        style={isActive ? { boxShadow: `0 4px 24px ${timerColor}12, 0 0 0 1px ${timerColor}18` } : undefined}
      >
        {/* Progress bar */}
        {isActive && (
          <div className="h-px bg-white/5">
            <div
              className="h-full transition-all duration-1000 ease-linear"
              style={{ width: `${progress}%`, backgroundColor: timerColor }}
            />
          </div>
        )}

        <div className="px-3 py-2.5">
          <div className="flex items-center gap-2">
            {/* Drag handle */}
            <button
              {...listeners}
              {...attributes}
              className="cursor-grab active:cursor-grabbing text-tm-subtle hover:text-tm-muted transition-colors flex-shrink-0 p-0.5 touch-none"
            >
              <GripVertical className="w-3.5 h-3.5" />
            </button>

            {/* Index */}
            <span className="text-xs text-tm-subtle font-mono w-4 text-center flex-shrink-0 select-none">
              {index + 1}
            </span>

            {/* Title */}
            <div className="flex-1 min-w-0">
              <input
                value={timer.title}
                onChange={(e) => onUpdate(timer.id, { title: e.target.value })}
                className="bg-transparent text-sm font-semibold text-tm-text focus:outline-none w-full truncate
                  placeholder:text-tm-subtle hover:text-white focus:text-white transition-colors"
                placeholder="Timer title…"
              />
              {(timer.speaker || isActive) && (
                <input
                  value={timer.speaker}
                  onChange={(e) => onUpdate(timer.id, { speaker: e.target.value })}
                  className="bg-transparent text-xs text-tm-muted focus:outline-none w-full truncate mt-0.5
                    placeholder:text-tm-subtle"
                  placeholder="Speaker…"
                />
              )}
            </div>

            {/* Trigger badge */}
            {timer.trigger === 'auto' && (
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-accent-cyan/10 text-accent-cyan/70 border border-accent-cyan/20 flex-shrink-0">
                AUTO
              </span>
            )}

            {/* Status badge */}
            {statusLabel && (
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md tracking-wider flex-shrink-0 ${
                isRunning ? 'bg-timer-green/15 text-timer-green' :
                isPaused ? 'bg-timer-yellow/15 text-timer-yellow' :
                isOvertime ? 'bg-timer-overtime/15 text-timer-overtime' :
                'bg-tm-surface-3 text-tm-subtle'
              }`}>
                {statusLabel}
              </span>
            )}

            {/* Duration */}
            <div className="flex-shrink-0">
              {editingDuration ? (
                <input
                  autoFocus
                  value={durationInput}
                  onChange={(e) => setDurationInput(e.target.value)}
                  onBlur={handleDurationSave}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleDurationSave()
                    if (e.key === 'Escape') setEditingDuration(false)
                  }}
                  className="w-20 bg-tm-darker border border-accent-cyan/50 rounded-lg px-2 py-0.5
                    text-xs font-mono text-center focus:outline-none text-accent-cyan"
                  placeholder="10:00"
                />
              ) : (
                <button
                  onClick={() => { setDurationInput(formatDuration(timer.duration)); setEditingDuration(true) }}
                  className="text-sm font-mono font-bold tabular-nums hover:opacity-80 transition-opacity min-w-[4rem] text-right"
                  style={{ color: isActive ? timerColor : '#525252' }}
                  title="Click to edit duration"
                >
                  {isOvertime && <span className="text-xs mr-0.5">+</span>}
                  {formatDuration(isActive ? timer.remaining : timer.duration)}
                </button>
              )}
            </div>

            {/* Playback controls */}
            <div className="flex items-center gap-0.5 flex-shrink-0">
              <button
                onClick={() => isRunning ? onPause(timer.id) : onStart(timer.id)}
                className={`p-1.5 rounded-lg transition-all ${
                  isRunning
                    ? 'text-timer-yellow hover:bg-timer-yellow/10'
                    : 'text-timer-green hover:bg-timer-green/10'
                }`}
                title={isRunning ? 'Pause' : 'Start'}
              >
                {isRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              </button>
              <button
                onClick={() => onReset(timer.id)}
                className="p-1.5 rounded-lg text-tm-subtle hover:text-tm-muted hover:bg-tm-surface-3 transition-all"
                title="Reset"
              >
                <RotateCcw className="w-3 h-3" />
              </button>
              <button
                onClick={() => setExpanded(!expanded)}
                className="p-1.5 rounded-lg text-tm-subtle hover:text-tm-muted hover:bg-tm-surface-3 transition-all"
                title="Settings"
              >
                {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
              <button
                onClick={() => onDelete(timer.id)}
                className="p-1.5 rounded-lg text-tm-subtle hover:text-red-400 hover:bg-red-500/10 transition-all opacity-0 group-hover:opacity-100"
                title="Delete"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* ── Expanded settings ─────────────────────────────────── */}
          {expanded && (
            <div className="mt-3 pt-3 border-t border-tm-border space-y-3">

              {/* Row 1: Speaker + Notes */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-tm-subtle uppercase tracking-wider block mb-1">Speaker</label>
                  <input
                    value={timer.speaker}
                    onChange={(e) => onUpdate(timer.id, { speaker: e.target.value })}
                    placeholder="Speaker name"
                    className="input-premium w-full py-1.5 text-xs"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-tm-subtle uppercase tracking-wider block mb-1">Notes</label>
                  <input
                    value={timer.notes}
                    onChange={(e) => onUpdate(timer.id, { notes: e.target.value })}
                    placeholder="Internal notes…"
                    className="input-premium w-full py-1.5 text-xs"
                  />
                </div>
              </div>

              {/* Row 2: Show/hide toggles */}
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <div
                    onClick={() => onUpdate(timer.id, { showTitle: !timer.showTitle })}
                    className={`w-7 h-4 rounded-full transition-all relative flex-shrink-0 cursor-pointer ${
                      timer.showTitle ? 'bg-accent-cyan' : 'bg-tm-surface-3'
                    }`}
                  >
                    <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow transition-all ${
                      timer.showTitle ? 'left-3.5' : 'left-0.5'
                    }`} />
                  </div>
                  <span className="text-[11px] text-tm-muted">Show title</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <div
                    onClick={() => onUpdate(timer.id, { showSpeaker: !timer.showSpeaker })}
                    className={`w-7 h-4 rounded-full transition-all relative flex-shrink-0 cursor-pointer ${
                      timer.showSpeaker ? 'bg-accent-cyan' : 'bg-tm-surface-3'
                    }`}
                  >
                    <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow transition-all ${
                      timer.showSpeaker ? 'left-3.5' : 'left-0.5'
                    }`} />
                  </div>
                  <span className="text-[11px] text-tm-muted">Show speaker</span>
                </label>
              </div>

              {/* Row 3: Wrapup color thresholds */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-tm-subtle uppercase tracking-wider flex items-center gap-1 mb-1">
                    <Clock className="w-2.5 h-2.5 text-timer-yellow" />
                    Yellow at (sec)
                  </label>
                  <input
                    type="number"
                    value={timer.wrapupColors.stage1.threshold}
                    onChange={(e) => onUpdate(timer.id, {
                      wrapupColors: { ...timer.wrapupColors, stage1: { ...timer.wrapupColors.stage1, threshold: parseInt(e.target.value) || 300 } }
                    })}
                    className="input-premium w-full py-1.5 text-xs"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-tm-subtle uppercase tracking-wider flex items-center gap-1 mb-1">
                    <Clock className="w-2.5 h-2.5 text-timer-red" />
                    Red at (sec)
                  </label>
                  <input
                    type="number"
                    value={timer.wrapupColors.stage3.threshold}
                    onChange={(e) => onUpdate(timer.id, {
                      wrapupColors: { ...timer.wrapupColors, stage3: { ...timer.wrapupColors.stage3, threshold: parseInt(e.target.value) || 30 } }
                    })}
                    className="input-premium w-full py-1.5 text-xs"
                  />
                </div>
              </div>

              {/* Row 4: Timer output colors */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-tm-subtle uppercase tracking-wider block mb-1">Viewer BG</label>
                  <div className="flex items-center gap-2 input-premium py-1.5">
                    <input
                      type="color"
                      value={timer.backgroundColor || '#0A0A0A'}
                      onChange={(e) => onUpdate(timer.id, { backgroundColor: e.target.value })}
                      className="w-5 h-5 rounded cursor-pointer border-0 bg-transparent flex-shrink-0"
                    />
                    <span className="text-[10px] font-mono text-tm-subtle truncate">{timer.backgroundColor || '#0A0A0A'}</span>
                  </div>
                </div>
                <div>
                  <label className="text-[10px] text-tm-subtle uppercase tracking-wider block mb-1">Viewer Text</label>
                  <div className="flex items-center gap-2 input-premium py-1.5">
                    <input
                      type="color"
                      value={timer.textColor || '#ffffff'}
                      onChange={(e) => onUpdate(timer.id, { textColor: e.target.value })}
                      className="w-5 h-5 rounded cursor-pointer border-0 bg-transparent flex-shrink-0"
                    />
                    <span className="text-[10px] font-mono text-tm-subtle truncate">{timer.textColor || '#ffffff'}</span>
                  </div>
                </div>
              </div>

              {/* Row 5: Chime + Overtime limit */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-tm-subtle uppercase tracking-wider flex items-center gap-1 mb-1">
                    <Bell className="w-2.5 h-2.5 text-accent-cyan" />
                    Chime
                  </label>
                  <div className="flex gap-1">
                    <select
                      value={timer.chime}
                      onChange={(e) => onUpdate(timer.id, { chime: e.target.value as Timer['chime'] })}
                      className="input-premium flex-1 py-1.5 text-xs"
                    >
                      <option value="none">None</option>
                      <option value="bell">Bell</option>
                      <option value="beep">Beep</option>
                      <option value="ding">Ding</option>
                    </select>
                    {timer.chime !== 'none' && (
                      <button
                        onClick={() => playChime(timer.chime as 'bell' | 'beep' | 'ding')}
                        className="px-2 rounded-lg bg-accent-cyan/10 border border-accent-cyan/30 text-accent-cyan text-xs hover:bg-accent-cyan/20 transition-all flex-shrink-0"
                        title="Preview"
                      >▶</button>
                    )}
                  </div>
                </div>
                <div>
                  <label className="text-[10px] text-tm-subtle uppercase tracking-wider block mb-1">Overtime limit (sec)</label>
                  <input
                    type="number"
                    value={timer.overtimeLimit}
                    placeholder="0 = unlimited"
                    onChange={(e) => onUpdate(timer.id, { overtimeLimit: parseInt(e.target.value) || 0 })}
                    className="input-premium w-full py-1.5 text-xs"
                  />
                </div>
              </div>

              {/* Row 6: Chime threshold + Auto-advance */}
              <div className="grid grid-cols-2 gap-2">
                {timer.chime !== 'none' && (
                  <div>
                    <label className="text-[10px] text-tm-subtle uppercase tracking-wider block mb-1">Chime at (sec)</label>
                    <input
                      type="number"
                      value={timer.chimeAt}
                      onChange={(e) => onUpdate(timer.id, { chimeAt: parseInt(e.target.value) || 60 })}
                      className="input-premium w-full py-1.5 text-xs"
                    />
                  </div>
                )}
                <div>
                  <label className="text-[10px] text-tm-subtle uppercase tracking-wider flex items-center gap-1 mb-1">
                    <SkipForward className="w-2.5 h-2.5 text-timer-green" />
                    After this timer
                  </label>
                  <select
                    value={timer.trigger}
                    onChange={(e) => onUpdate(timer.id, { trigger: e.target.value as Timer['trigger'] })}
                    className="input-premium w-full py-1.5 text-xs"
                  >
                    <option value="manual">Manual (stay)</option>
                    <option value="auto">Auto-advance</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
