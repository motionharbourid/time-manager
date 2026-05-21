import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Timer, Monitor, Users, ArrowLeft, RefreshCw, Wifi, WifiOff, List, Maximize2, LayoutDashboard } from 'lucide-react'
import { connectSocket, joinRoom, getSocket } from '@/lib/socket'
import { useConnectionStore } from '@/store/useConnectionStore'
import { useRoomStore } from '@/store/useRoomStore'

type JoinState = 'connecting' | 'found' | 'not_found'

const ROLES = [
  {
    key: 'controller',
    label: 'Controller',
    desc: 'Full control — edit timers, send messages, manage rundown',
    Icon: LayoutDashboard,
    color: 'accent-cyan'
  },
  {
    key: 'viewer',
    label: 'Viewer',
    desc: 'Fullscreen display output for presenter screens',
    Icon: Monitor,
    color: 'timer-green'
  },
  {
    key: 'moderator',
    label: 'Moderator',
    desc: 'Large countdown with rundown sidebar and playback controls',
    Icon: Users,
    color: 'accent-purple'
  },
  {
    key: 'operator',
    label: 'Operator',
    desc: 'Simplified backstage controls for technical operators',
    Icon: Timer,
    color: 'timer-yellow'
  },
  {
    key: 'agenda',
    label: 'Agenda',
    desc: 'Session list view for audience members',
    Icon: List,
    color: 'timer-orange'
  },
  {
    key: 'focus',
    label: 'Focus',
    desc: 'Minimal fullscreen countdown for confidence monitors',
    Icon: Maximize2,
    color: 'tm-muted'
  },
] as const

type RoleKey = typeof ROLES[number]['key']

export default function Join() {
  const { roomId } = useParams<{ roomId: string }>()
  const navigate = useNavigate()
  const { mode, isOnline } = useConnectionStore()
  const { loadRoom } = useRoomStore()
  const [joinState, setJoinState] = useState<JoinState>('connecting')
  const [roomName, setRoomName] = useState<string>('')

  const isEffectivelyOnline = mode === 'online' && isOnline

  useEffect(() => {
    if (!roomId) { navigate('/'); return }

    const run = async () => {
      const localRoom = await loadRoom(roomId)
      if (localRoom) {
        setRoomName(localRoom.name)
        setJoinState('found')
        return
      }

      if (!isEffectivelyOnline) {
        setJoinState('not_found')
        return
      }

      setJoinState('connecting')
      const socket = connectSocket()
      let timer: ReturnType<typeof setTimeout>

      const handleState = (payload: { room?: { name?: string } }) => {
        clearTimeout(timer)
        setRoomName(payload.room?.name ?? roomId)
        setJoinState('found')
        socket.off('room:state', handleState)
      }

      socket.on('room:state', handleState)

      const doRequest = () => {
        if (socket.connected) {
          socket.emit('sync:request', { roomId, lastSync: 0 })
        } else {
          socket.once('connect', () => {
            socket.emit('sync:request', { roomId, lastSync: 0 })
          })
        }
      }

      doRequest()

      timer = setTimeout(() => {
        socket.off('room:state', handleState)
        setJoinState('not_found')
      }, 5000)
    }

    run()
  }, [roomId, isEffectivelyOnline]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleJoinAs = (role: RoleKey) => {
    if (!roomId) return
    switch (role) {
      case 'controller': navigate(`/controller/${roomId}`); break
      case 'viewer':     navigate(`/viewer/${roomId}`); break
      case 'moderator':  navigate(`/moderator/${roomId}`); break
      case 'operator':   navigate(`/operator/${roomId}`); break
      case 'agenda':     navigate(`/agenda/${roomId}`); break
      case 'focus':      navigate(`/focus/${roomId}`); break
    }
  }

  return (
    <div className="min-h-screen bg-tm-darker flex flex-col items-center justify-center p-4">
      <button
        onClick={() => navigate('/')}
        className="absolute top-6 left-6 flex items-center gap-1.5 text-tm-subtle hover:text-tm-muted transition-colors text-sm"
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </button>

      <div className="w-full max-w-lg">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2.5 mb-8">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #00D4FF 0%, #A855F7 100%)' }}>
            <Timer className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-lg text-tm-text">Time-Manager</span>
        </div>

        <div
          className="bg-tm-surface border border-tm-border rounded-2xl p-7"
          style={{ boxShadow: '0 24px 64px rgba(0,0,0,0.5)' }}
        >
          <p className="text-[10px] text-tm-subtle text-center uppercase tracking-widest mb-1">Room Code</p>
          <p className="text-2xl font-black font-mono text-center text-tm-text mb-1 tracking-wider">{roomId}</p>
          {roomName && (
            <p className="text-sm text-tm-muted text-center mb-5">{roomName}</p>
          )}

          {/* Connecting */}
          {joinState === 'connecting' && (
            <div className="text-center py-8">
              <div className="w-8 h-8 border-2 border-accent-cyan/50 border-t-accent-cyan rounded-full animate-spin mx-auto mb-4" />
              <p className="text-sm text-tm-muted">Looking for room…</p>
              <p className="text-xs text-tm-subtle mt-1">
                {isEffectivelyOnline ? 'Connecting to server' : 'Checking local storage'}
              </p>
            </div>
          )}

          {/* Found — role selection */}
          {joinState === 'found' && (
            <div>
              <p className="text-[10px] text-tm-subtle text-center uppercase tracking-widest mb-4">Join as</p>
              <div className="grid grid-cols-2 gap-2">
                {ROLES.map(({ key, label, desc, Icon }) => (
                  <button
                    key={key}
                    onClick={() => handleJoinAs(key)}
                    className="group flex flex-col items-start gap-2.5 p-4 bg-tm-surface-2
                      border border-tm-border hover:border-tm-border-3 rounded-xl transition-all text-left
                      hover:bg-tm-surface-3"
                  >
                    <div className="w-8 h-8 rounded-lg bg-tm-surface-3 border border-tm-border
                      group-hover:border-tm-border-2 flex items-center justify-center flex-shrink-0 transition-all">
                      <Icon className="w-4 h-4 text-tm-muted group-hover:text-tm-text transition-colors" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-tm-text">{label}</p>
                      <p className="text-[10px] text-tm-subtle mt-0.5 leading-relaxed">{desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Not found */}
          {joinState === 'not_found' && (
            <div className="text-center py-4">
              <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-4">
                {isEffectivelyOnline
                  ? <Wifi className="w-5 h-5 text-red-400" />
                  : <WifiOff className="w-5 h-5 text-red-400" />}
              </div>
              <p className="text-sm font-semibold text-tm-text mb-1">Room Not Found</p>
              <p className="text-xs text-tm-subtle mb-6 leading-relaxed">
                {isEffectivelyOnline
                  ? `Room "${roomId}" tidak ditemukan di server.`
                  : 'Tidak ada koneksi internet. Hubungkan dan coba lagi.'
                }
              </p>
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => window.location.reload()}
                  className="flex items-center justify-center gap-2 w-full py-2.5 bg-tm-surface-2 hover:bg-tm-surface-3
                    border border-tm-border hover:border-tm-border-2 rounded-xl text-sm text-tm-muted hover:text-tm-text transition-all"
                >
                  <RefreshCw className="w-4 h-4" />
                  Try Again
                </button>
                <button
                  onClick={() => navigate('/')}
                  className="text-sm text-tm-subtle hover:text-tm-muted transition-colors py-2"
                >
                  Go Back
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-center gap-1.5 mt-4">
          <div className={`w-1.5 h-1.5 rounded-full ${isEffectivelyOnline ? 'bg-timer-green' : 'bg-timer-yellow'}`} />
          <span className="text-xs text-tm-subtle">
            {isEffectivelyOnline ? 'Online' : 'Offline mode'}
          </span>
        </div>
      </div>
    </div>
  )
}
