type ChimeKind = 'none' | 'bell' | 'beep' | 'ding' | 'custom'

let audioCtx: AudioContext | null = null

function getCtx(): AudioContext | null {
  if (!audioCtx && typeof window !== 'undefined' && 'AudioContext' in window) {
    try { audioCtx = new AudioContext() } catch { return null }
  }
  return audioCtx
}

function tone(freq: number, dur: number, type: OscillatorType = 'sine', vol = 0.3, delayMs = 0) {
  const ctx = getCtx()
  if (!ctx) return
  const at = () => {
    try {
      if (ctx.state === 'suspended') ctx.resume()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.frequency.value = freq
      osc.type = type
      gain.gain.setValueAtTime(vol, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur)
      osc.start(ctx.currentTime)
      osc.stop(ctx.currentTime + dur)
    } catch { /* blocked */ }
  }
  if (delayMs > 0) setTimeout(at, delayMs)
  else at()
}

export function playChime(type: ChimeKind): void {
  switch (type) {
    case 'bell':
      tone(880, 1.0, 'sine', 0.3)
      tone(1100, 0.7, 'sine', 0.2, 260)
      break
    case 'beep':
      tone(880, 0.12, 'square', 0.15)
      tone(880, 0.12, 'square', 0.15, 180)
      tone(880, 0.12, 'square', 0.15, 360)
      break
    case 'ding':
      tone(1047, 0.9, 'sine', 0.3)
      break
    default:
      break
  }
}

export function unlockAudio(): void {
  getCtx()?.resume().catch(() => {})
}
