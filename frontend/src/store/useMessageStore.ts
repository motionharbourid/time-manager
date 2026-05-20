import { create } from 'zustand'
import type { Message, MessageCreateInput } from '@/types'
import { generateId, nowMs } from '@/lib/utils'
import { dbSaveMessage, dbGetMessages, dbDeleteMessage } from '@/lib/db'
import { dbAddPendingSync } from '@/lib/db'

interface MessageStore {
  messages: Message[]
  activeMessage: Message | null

  loadMessages: (roomId: string) => Promise<void>
  sendMessage: (roomId: string, input: MessageCreateInput) => Promise<Message>
  deleteMessage: (id: string) => Promise<void>
  setActiveMessage: (msg: Message | null) => void
  activateMessage: (roomId: string, msgId: string | null) => Promise<void>
  clearAllMessages: (roomId: string) => Promise<void>
}

export const useMessageStore = create<MessageStore>((set, get) => ({
  messages: [],
  activeMessage: null,

  loadMessages: async (roomId) => {
    const msgs = await dbGetMessages(roomId)
    set({ messages: msgs.sort((a, b) => b.createdAt - a.createdAt) })
  },

  sendMessage: async (roomId, input) => {
    const msg: Message = {
      id: generateId(),
      roomId,
      text: input.text,
      type: input.type ?? 'normal',
      backgroundColor: input.backgroundColor ?? '#1e293b',
      textColor: input.textColor ?? '#ffffff',
      emoji: input.emoji ?? '',
      isActive: false,
      flash: input.flash ?? false,
      createdAt: nowMs(),
      expiresAt: null,
      lastModified: nowMs(),
      syncStatus: 'offline'
    }
    await dbSaveMessage(msg)
    await dbAddPendingSync('message', msg)
    set((s) => ({ messages: [msg, ...s.messages] }))
    return msg
  },

  deleteMessage: async (id) => {
    await dbDeleteMessage(id)
    set((s) => ({
      messages: s.messages.filter(m => m.id !== id),
      activeMessage: s.activeMessage?.id === id ? null : s.activeMessage
    }))
  },

  setActiveMessage: (msg) => set({ activeMessage: msg }),

  // Persists isActive flag to DB + pending sync so Viewer can poll it
  activateMessage: async (roomId, msgId) => {
    const msgs = get().messages.filter(m => m.roomId === roomId)
    const now = nowMs()
    const updated = msgs.map(m => ({
      ...m,
      isActive: m.id === msgId,
      lastModified: now
    }))
    const activeMsg = updated.find(m => m.isActive) ?? null
    await Promise.all(updated.map(m => dbSaveMessage(m)))
    await Promise.all(updated.map(m => dbAddPendingSync('message', m)))
    set((s) => ({
      messages: s.messages.map(m => updated.find(u => u.id === m.id) ?? m),
      activeMessage: activeMsg
    }))
  },

  clearAllMessages: async (roomId) => {
    const msgs = get().messages.filter(m => m.roomId === roomId)
    await Promise.all(msgs.map(m => dbDeleteMessage(m.id)))
    set({ messages: [], activeMessage: null })
  }
}))
