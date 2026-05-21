import { useState } from 'react'
import {
  Timer, ExternalLink, Copy, Check, Settings,
  Link2, X, Monitor, Users, List, Maximize2
} from 'lucide-react'
import { ConnectionStatus } from '@/components/shared/ConnectionStatus'
import { useRoomStore } from '@/store/useRoomStore'
import type { Room } from '@/types'

interface TopBarProps {
  room: Room
  onSettingsOpen: () => void
}

export function TopBar({ room, onSettingsOpen }: TopBarProps) {
  const { updateRoom } = useRoomStore()
  const [editingName, setEditingName] = useState(false)
  const [nameValue, setNameValue] = useState(room.name)
  const [copiedId, setCopiedId] = useState(false)
  const [linksOpen, setLinksOpen] = useState(false)
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null)

  const handleNameSave = () => {
    if (nameValue.trim()) updateRoom({ name: nameValue.trim() })
    setEditingName(false)
  }

  const handleCopyId = () => {
    navigator.clipboard.writeText(room.id)
    setCopiedId(true)
    setTimeout(() => setCopiedId(false), 2000)
  }

  const origin = window.location.origin
  const outputLinks = [
    { key: 'viewer',    label: 'Viewer',    desc: 'Main fullscreen display',     url: `${origin}/viewer/${room.id}`,    Icon: Monitor },
    { key: 'moderator', label: 'Moderator', desc: 'Moderator control view',      url: `${origin}/moderator/${room.id}`, Icon: Users },
    { key: 'operator',  label: 'Operator',  desc: 'Backstage operator controls', url: `${origin}/operator/${room.id}`,  Icon: Timer },
    { key: 'agenda',    label: 'Agenda',    desc: 'Session list for audience',   url: `${origin}/agenda/${room.id}`,    Icon: List },
    { key: 'focus',     label: 'Focus',     desc: 'Minimal fullscreen display',  url: `${origin}/focus/${room.id}`,     Icon: Maximize2 },
  ]

  const copyUrl = (url: string) => {
    navigator.clipboard.writeText(url)
    setCopiedUrl(url)
    setTimeout(() => setCopiedUrl(null), 2000)
  }

  return (
    <>
      <header className="h-12 bg-tm-darker border-b border-tm-border flex items-center px-4 gap-3 flex-shrink-0">

        {/* Logo */}
        <div className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0"
          style={{ background: 'linear-gradient(135deg, #00D4FF 0%, #A855F7 100%)' }}>
          <Timer className="w-3.5 h-3.5 text-white" />
        </div>

        {/* Room name — editable */}
        {editingName ? (
          <input
            autoFocus
            value={nameValue}
            onChange={(e) => setNameValue(e.target.value)}
            onBlur={handleNameSave}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleNameSave()
              if (e.key === 'Escape') setEditingName(false)
            }}
            className="bg-tm-surface border border-accent-cyan/40 rounded-lg px-2.5 py-1 text-sm
              font-semibold text-white focus:outline-none w-44"
          />
        ) : (
          <button
            onClick={() => setEditingName(true)}
            className="text-sm font-semibold text-tm-text hover:text-white transition-colors truncate max-w-[160px]"
            title="Click to rename"
          >
            {room.name}
          </button>
        )}

        {/* Room ID chip */}
        <button
          onClick={handleCopyId}
          className="flex items-center gap-1 font-mono text-[10px] text-tm-subtle
            bg-tm-surface border border-tm-border hover:border-tm-border-2 rounded-md px-2 py-0.5
            transition-all flex-shrink-0"
          title="Copy room ID"
        >
          {room.id}
          {copiedId ? <Check className="w-2.5 h-2.5 text-timer-green" /> : <Copy className="w-2.5 h-2.5" />}
        </button>

        {/* Plan badge */}
        <span className={`hidden xl:inline text-[10px] font-bold px-1.5 py-0.5 rounded-md flex-shrink-0 ${
          room.plan === 'premium' ? 'bg-accent-purple/15 text-accent-purple border border-accent-purple/20' :
          room.plan === 'pro' ? 'bg-timer-yellow/15 text-timer-yellow border border-timer-yellow/20' :
          'bg-tm-surface-2 text-tm-subtle border border-tm-border'
        }`}>
          {room.plan.toUpperCase()}
        </span>

        <div className="flex-1" />

        {/* Output links */}
        <button
          onClick={() => setLinksOpen(true)}
          className="flex items-center gap-1.5 text-[11px] text-tm-subtle hover:text-tm-muted
            bg-tm-surface border border-tm-border hover:border-tm-border-2 rounded-lg px-2.5 py-1.5
            transition-all flex-shrink-0"
          title="Output links"
        >
          <Link2 className="w-3 h-3" />
          <span className="hidden sm:inline">Links</span>
        </button>

        {/* Connection status */}
        <ConnectionStatus />

        {/* Settings */}
        <button
          onClick={onSettingsOpen}
          className="p-1.5 text-tm-subtle hover:text-tm-muted hover:bg-tm-surface rounded-lg transition-all flex-shrink-0"
          title="Settings"
        >
          <Settings className="w-4 h-4" />
        </button>
      </header>

      {/* Output links modal */}
      {linksOpen && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setLinksOpen(false)}
        >
          <div
            className="bg-tm-surface border border-tm-border rounded-2xl p-6 w-full max-w-md shadow-2xl"
            style={{ boxShadow: '0 24px 64px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-accent-cyan/10 border border-accent-cyan/20 flex items-center justify-center">
                  <Link2 className="w-4 h-4 text-accent-cyan" />
                </div>
                <div>
                  <h2 className="font-bold text-sm text-tm-text">Output Links</h2>
                  <p className="text-[10px] text-tm-subtle font-mono">{room.id}</p>
                </div>
              </div>
              <button
                onClick={() => setLinksOpen(false)}
                className="p-1.5 text-tm-subtle hover:text-tm-muted hover:bg-tm-surface-2 rounded-lg transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2">
              {outputLinks.map(({ key, label, desc, url, Icon }) => (
                <div key={key} className="flex items-center gap-3 p-3 rounded-xl bg-tm-surface-2 border border-tm-border hover:border-tm-border-2 transition-all">
                  <div className="w-7 h-7 rounded-lg bg-tm-surface-3 border border-tm-border flex items-center justify-center flex-shrink-0">
                    <Icon className="w-3.5 h-3.5 text-tm-muted" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-tm-text">{label}</p>
                    <p className="text-[10px] text-tm-subtle truncate">{url.replace(origin, '')}</p>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => copyUrl(url)}
                      className="p-1.5 rounded-lg text-tm-subtle hover:text-tm-muted hover:bg-tm-surface-3 transition-all"
                      title={`Copy ${label} link`}
                    >
                      {copiedUrl === url ? <Check className="w-3 h-3 text-timer-green" /> : <Copy className="w-3 h-3" />}
                    </button>
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 rounded-lg text-tm-subtle hover:text-tm-muted hover:bg-tm-surface-3 transition-all"
                      title={`Open ${label}`}
                    >
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              ))}
            </div>

            <p className="text-[10px] text-tm-subtle text-center mt-4 leading-relaxed">
              Share these links so others can view or control the session.<br />
              Use keyboard shortcuts: <span className="font-mono text-tm-muted">Space</span> play/pause · <span className="font-mono text-tm-muted">←→</span> nudge · <span className="font-mono text-tm-muted">N/P</span> next/prev
            </p>
          </div>
        </div>
      )}
    </>
  )
}
