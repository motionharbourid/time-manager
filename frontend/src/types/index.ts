// ─── Core Entities ─────────────────────────────────────────────────────────

export type ConnectionMode = 'online' | 'offline'
export type TimerStatus = 'idle' | 'running' | 'paused' | 'finished' | 'overtime'
export type TriggerType = 'manual' | 'auto' | 'previous_end'
export type ChimeType = 'none' | 'bell' | 'beep' | 'ding' | 'custom'
export type MessageType = 'normal' | 'flash' | 'lower_third' | 'qa'
export type PlanType = 'free' | 'pro' | 'premium'
export type SyncStatus = 'synced' | 'pending' | 'conflict' | 'offline'

// ─── Timer ──────────────────────────────────────────────────────────────────

export interface WrapupColors {
  stage1: { threshold: number; color: string }  // e.g. 5min → yellow
  stage2: { threshold: number; color: string }  // e.g. 2min → orange
  stage3: { threshold: number; color: string }  // e.g. 0   → red
}

export interface Timer {
  id: string
  roomId: string
  order: number
  title: string
  speaker: string
  duration: number          // seconds
  elapsed: number           // seconds
  remaining: number         // seconds (computed but stored for sync)
  status: TimerStatus
  trigger: TriggerType
  wrapupColors: WrapupColors
  chime: ChimeType
  chimeAt: number           // seconds before end
  notes: string
  backgroundColor: string
  textColor: string
  showSpeaker: boolean
  showTitle: boolean
  overtimeLimit: number     // seconds, 0 = unlimited
  startedAt: number | null  // epoch ms
  pausedAt: number | null
  lastModified: number      // epoch ms for sync
  syncStatus: SyncStatus
}

export type TimerCreateInput = Omit<Timer, 'id' | 'elapsed' | 'remaining' | 'status' | 'startedAt' | 'pausedAt' | 'lastModified' | 'syncStatus'>

// ─── Room ───────────────────────────────────────────────────────────────────

export interface Room {
  id: string                // TM-XXXXXXXX
  name: string
  password: string | null
  plan: PlanType
  ownerId: string
  timezone: string          // e.g. 'Asia/Jakarta'
  masterClock: boolean
  onAir: boolean
  blackout: boolean
  currentTimerIndex: number
  activeTimerId: string | null
  logo: string | null       // base64 or URL
  primaryColor: string
  backgroundColor: string
  createdAt: number
  lastModified: number
  syncStatus: SyncStatus
}

export type RoomCreateInput = Pick<Room, 'name' | 'timezone'> & Partial<Pick<Room, 'password' | 'plan'>>

// ─── Message ────────────────────────────────────────────────────────────────

export interface Message {
  id: string
  roomId: string
  text: string
  type: MessageType
  backgroundColor: string
  textColor: string
  emoji: string
  isActive: boolean
  flash: boolean
  createdAt: number
  expiresAt: number | null
  lastModified: number
  syncStatus: SyncStatus
}

export type MessageCreateInput = Pick<Message, 'text' | 'type' | 'backgroundColor' | 'textColor' | 'emoji' | 'flash'>

// ─── Connection / Viewer ────────────────────────────────────────────────────

export interface ViewerConnection {
  id: string
  roomId: string
  deviceName: string
  deviceType: 'desktop' | 'tablet' | 'mobile' | 'unknown'
  viewType: 'viewer' | 'moderator' | 'agenda' | 'operator' | 'custom'
  ipAddress: string
  connectedAt: number
  lastSeen: number
  isOnline: boolean
}

// ─── Analytics / Log ────────────────────────────────────────────────────────

export interface EventLog {
  id: string
  roomId: string
  timerId: string | null
  event: string
  details: Record<string, unknown>
  timestamp: number
  operatorId: string
}

export interface Analytics {
  roomId: string
  totalRuntime: number      // seconds
  timersCompleted: number
  timersOvertime: number
  messagesDelivered: number
  peakConnections: number
  averageViewers: number
  sessionStart: number
  sessionEnd: number | null
}

// ─── Sync ───────────────────────────────────────────────────────────────────

export interface SyncPayload {
  roomId: string
  timers: Timer[]
  messages: Message[]
  room: Room
  timestamp: number
  operatorId: string
  activeMessage?: Message | null
}

export interface SyncDelta {
  roomId: string
  timers?: Partial<Timer>[]
  messages?: Partial<Message>[]
  room?: Partial<Room>
  timestamp: number
  operatorId: string
}

// ─── Socket Events ───────────────────────────────────────────────────────────

export interface ServerToClientEvents {
  'room:state': (payload: SyncPayload & { activeMessageId?: string | null }) => void
  'timer:update': (timer: Timer) => void
  'timer:start': (data: { timerId: string; startedAt: number }) => void
  'timer:pause': (data: { timerId: string; elapsed: number }) => void
  'timer:reset': (data: { timerId: string }) => void
  'timer:next': (data: { nextTimerId: string }) => void
  'message:new': (message: Message) => void
  'message:clear': (data: { messageId: string }) => void
  'message:flash': (message: Message) => void
  'message:activate': (data: { messageId: string | null; message: Message | null }) => void
  'room:onair': (data: { onAir: boolean }) => void
  'room:blackout': (data: { blackout: boolean }) => void
  'viewer:join': (viewer: ViewerConnection) => void
  'viewer:leave': (data: { viewerId: string }) => void
  'sync:delta': (delta: SyncDelta) => void
  'error': (data: { code: string; message: string }) => void
}

export interface ClientToServerEvents {
  'room:join': (data: { roomId: string; password?: string; viewType: string; deviceName: string }) => void
  'room:leave': (data: { roomId: string }) => void
  'timer:control': (data: { roomId: string; action: 'start' | 'pause' | 'reset' | 'next' | 'prev'; timerId?: string }) => void
  'timer:nudge': (data: { roomId: string; timerId: string; seconds: number }) => void
  'timer:update': (data: { roomId: string; timer: Partial<Timer> & { id: string } }) => void
  'message:send': (data: { roomId: string; message: MessageCreateInput }) => void
  'message:clear': (data: { roomId: string; messageId: string }) => void
  'message:activate': (data: { roomId: string; messageId: string | null }) => void
  'room:update': (data: { roomId: string; updates: Partial<Room> }) => void
  'sync:request': (data: { roomId: string; lastSync: number }) => void
}

// ─── Store State ─────────────────────────────────────────────────────────────

export interface ConnectionState {
  mode: ConnectionMode
  isOnline: boolean
  socketConnected: boolean
  serverUrl: string
  lastSync: number | null
  syncStatus: SyncStatus
  pendingChanges: number
}

export interface AppSettings {
  theme: 'dark' | 'light' | 'auto'
  language: 'id' | 'en'
  timezone: string
  autoSaveInterval: number   // ms, default 30000
  offlineServerPort: number  // default 3001
  voiceAnnouncement: boolean
  preventSleep: boolean
  showMilliseconds: boolean
  masterClockFormat: '12h' | '24h'
}

// ─── API Response ─────────────────────────────────────────────────────────────

export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
  timestamp: number
}
