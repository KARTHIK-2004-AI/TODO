import { useEffect, useRef, useState, type FormEvent } from 'react'
import type { TeamMember, User } from '../../types'
import { fetchChatMessages, postChatMessage, markChatRead } from '../../api'
import { Avatar } from '../shared/Avatar'

interface TeamChatProps {
  teamId: string
  currentUser: User
  teamMembers: TeamMember[]
  isEmbedded?: boolean
}

interface ChatMessage {
  id: string
  teamId: string
  userId: string
  message: string
  metadata: any
  createdAt: string
  user: {
    id: string
    name: string
    email: string
    avatarUrl?: string
  }
}

export function TeamChat({ teamId, currentUser, teamMembers, isEmbedded = false }: TeamChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputText, setInputText] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)

  // Mentions suggestions UI state
  const [showMentions, setShowMentions] = useState(false)
  const [mentionFilter, setMentionFilter] = useState('')
  const [mentionIndex, setMentionIndex] = useState(0)

  // Real-time typing indicators
  const [typingUsers, setTypingUsers] = useState<Record<string, { name: string; timestamp: number }>>({})

  const chatContainerRef = useRef<HTMLDivElement | null>(null)
  const typingTimerRef = useRef<any>(null)
  const isTypingRef = useRef(false)

  // Load chat messages
  const loadMessages = async (p = 1, append = false, query = '') => {
    setLoading(true)
    try {
      const res = await fetchChatMessages(teamId, p, 30, query)
      const formatted = res.messages.map((m: any) => ({
        ...m,
        user: m.user || { id: m.userId, name: 'Anonymous' },
      }))

      if (append) {
        setMessages((prev) => [...formatted, ...prev])
      } else {
        setMessages(formatted)
        scrollToBottom()
      }
      setHasMore(res.meta.page < res.meta.totalPages)
      setPage(res.meta.page)
    } catch (err) {
      console.error('Failed to load chat messages:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    setPage(1)
    setMessages([])
    void loadMessages(1, false, searchQuery)
    void markChatRead(teamId)
  }, [teamId, searchQuery])

  // Scroll to bottom
  const scrollToBottom = () => {
    setTimeout(() => {
      if (chatContainerRef.current) {
        chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight
      }
    }, 100)
  }

  // Handle incoming ws messages
  useEffect(() => {
    const handleWsEvent = (event: Event) => {
      const customEvent = event as CustomEvent
      const msg = customEvent.detail
      if (!msg) return

      if (msg.eventType === 'CHAT_MESSAGE_CREATED' && msg.workspaceId === teamId) {
        setMessages((prev) => {
          // Avoid duplicates
          if (prev.some((m) => m.id === msg.payload.id)) return prev
          return [...prev, msg.payload]
        })
        scrollToBottom()
        // If chat is open, auto mark as read
        void markChatRead(teamId)
      } else if (msg.eventType === 'TYPING_STATUS' && msg.workspaceId === teamId && !msg.taskId) {
        if (msg.userId === currentUser.id) return

        const member = teamMembers.find((m) => m.userId === msg.userId)
        const name = member?.user?.name || 'Someone'

        if (msg.isTyping) {
          setTypingUsers((prev) => ({
            ...prev,
            [msg.userId]: { name, timestamp: Date.now() },
          }))
        } else {
          setTypingUsers((prev) => {
            const next = { ...prev }
            delete next[msg.userId]
            return next
          })
        }
      }
    }

    window.addEventListener('ws:event', handleWsEvent)
    return () => window.removeEventListener('ws:event', handleWsEvent)
  }, [teamId, currentUser.id, teamMembers])

  // Clean up typing indicators that timed out
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now()
      setTypingUsers((prev) => {
        let changed = false
        const next = { ...prev }
        for (const [uid, data] of Object.entries(prev)) {
          if (now - data.timestamp > 5000) {
            delete next[uid]
            changed = true
          }
        }
        return changed ? next : prev
      })
    }, 2000)
    return () => clearInterval(interval)
  }, [])

  // Send message
  const handleSendMessage = async (e: FormEvent) => {
    e.preventDefault()
    if (!inputText.trim()) return

    const text = inputText
    setInputText('')
    setShowMentions(false)

    // Stop typing status
    sendLocalTyping(false)

    try {
      await postChatMessage(teamId, text)
      // Message is appended via WebSocket event
    } catch (err) {
      console.error('Failed to post chat message:', err)
    }
  }

  // Handle typing input triggers
  const handleInputChange = (text: string) => {
    setInputText(text)

    // Send typing notification
    sendLocalTyping(true)
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current)
    typingTimerRef.current = setTimeout(() => {
      sendLocalTyping(false)
    }, 3000)

    // Check for @mentions triggers
    const caretPos = text.lastIndexOf('@')
    if (caretPos !== -1 && (caretPos === 0 || text[caretPos - 1] === ' ')) {
      const query = text.substring(caretPos + 1)
      if (!query.includes(' ')) {
        setShowMentions(true)
        setMentionFilter(query.toLowerCase())
        setMentionIndex(0)
        return
      }
    }
    setShowMentions(false)
  }

  const sendLocalTyping = (isTyping: boolean) => {
    if (isTypingRef.current === isTyping) return
    isTypingRef.current = isTyping
    // Emit global websocket typing message for team general chat (taskId: null)
    const wsEvent = new CustomEvent('ws:typing_status_emit', {
      detail: { workspaceId: teamId, taskId: null, isTyping },
    })
    window.dispatchEvent(wsEvent)
  }

  // Select mention suggestion
  const insertMention = (memberName: string) => {
    const caretPos = inputText.lastIndexOf('@')
    if (caretPos !== -1) {
      const base = inputText.substring(0, caretPos)
      const formatted = `@${memberName.replace(/\s+/g, '')} `
      setInputText(base + formatted)
    }
    setShowMentions(false)
  }

  // Filter members for suggestions
  const mentionSuggestions = teamMembers
    .filter((m) => {
      const name = (m.user?.name || '').toLowerCase()
      const email = (m.user?.email || '').toLowerCase()
      return name.includes(mentionFilter) || email.includes(mentionFilter)
    })
    .slice(0, 5)

  // Format message text with HTML tags for mentions
  const renderMessageText = (text: string) => {
    const mentionRegex = /@([a-zA-Z0-9_\-\.]+)/g
    const parts = []
    let lastIndex = 0
    let match

    while ((match = mentionRegex.exec(text)) !== null) {
      const index = match.index
      const matchText = match[0]
      const name = match[1]

      // Push text before match
      if (index > lastIndex) {
        parts.push(text.substring(lastIndex, index))
      }

      // Check if this matches a member in the workspace
      const isRealMember = teamMembers.some((m) => {
        const formattedName = (m.user?.name || '').toLowerCase().replace(/\s+/g, '')
        const emailPrefix = (m.user?.email || '').split('@')[0].toLowerCase()
        return name.toLowerCase() === formattedName || name.toLowerCase() === emailPrefix
      })

      if (isRealMember) {
        parts.push(
          <span key={index} className="chat-text-mention">
            {matchText}
          </span>
        )
      } else {
        parts.push(matchText)
      }

      lastIndex = mentionRegex.lastIndex
    }

    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex))
    }

    return parts.length > 0 ? parts : text
  }

  const activeTypingCount = Object.keys(typingUsers).length
  const typingStatusText =
    activeTypingCount === 1
      ? `${Object.values(typingUsers)[0].name} is typing...`
      : activeTypingCount > 1
      ? 'Multiple members are typing...'
      : ''

  return (
    <div 
      className={`chat-room flex-col w-full overflow-hidden animated-fade-in ${
        isEmbedded ? 'border-none p-0 bg-transparent' : 'panel h-[550px]'
      }`}
      style={isEmbedded ? { height: '380px' } : undefined}
    >
      {/* Header & Search */}
      {isEmbedded ? (
        <div className="chat-header flex justify-between items-center pb-2.5 border-b border-divider">
          <div className="flex gap-2">
            <span className="bg-primary/10 text-primary px-3 py-1.5 rounded-full text-xs font-bold"># General</span>
          </div>
        </div>
      ) : (
        <div className="chat-header flex justify-between items-center pb-4 border-b border-divider">
          <div>
            <h3>Team Discussion</h3>
            <p className="eyebrow">{teamMembers.length} member(s) present</p>
          </div>
          <div className="chat-search">
            <input
              type="text"
              placeholder="Search discussion..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input-chat"
            />
          </div>
        </div>
      )}

      {/* Messages Window */}
      <div className="chat-messages-container flex-grow overflow-y-auto p-4 space-y-4" ref={chatContainerRef}>
        {hasMore && (
          <button className="btn-load-more w-full text-center py-2 text-xs" onClick={() => void loadMessages(page + 1, true, searchQuery)}>
            Load previous messages
          </button>
        )}

        {messages.length === 0 && !loading && (
          <div className="chat-empty-state text-center py-12">
            <span className="text-4xl">💬</span>
            <p className="mt-2 text-secondary">Start the conversation! Type a message below.</p>
          </div>
        )}

        {messages.map((msg) => {
          const isMe = msg.userId === currentUser.id
          return (
            <div key={msg.id} className={`chat-bubble-row flex ${isMe ? 'justify-end' : 'justify-start'}`}>
              {!isMe && (
                <div className="mr-2">
                  <Avatar src={msg.user?.avatarUrl} name={msg.user?.name || 'User'} size={32} />
                </div>
              )}
              <div className={`chat-bubble max-w-[70%] p-3 rounded-lg ${isMe ? 'bg-primary text-white rounded-br-none' : 'bg-surface text-foreground rounded-bl-none border border-divider'}`}>
                {!isMe && <div className="chat-bubble-author text-xs font-semibold text-accent mb-1">{msg.user?.name}</div>}
                <div className="chat-bubble-text text-sm break-words whitespace-pre-wrap">
                  {renderMessageText(msg.message)}
                </div>
                <div className={`chat-bubble-time text-[10px] text-right mt-1 ${isMe ? 'text-indigo-200' : 'text-secondary'}`}>
                  {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Typing notice */}
      {typingStatusText && (
        <div className="chat-typing-indicator px-4 py-1 text-xs text-secondary italic">
          {typingStatusText}
        </div>
      )}

      {/* Inputs panel */}
      <div className="chat-input-bar border-t border-divider p-3 bg-card relative">
        {showMentions && mentionSuggestions.length > 0 && (
          <div className="mentions-popover absolute bottom-full left-4 bg-surface border border-divider rounded-lg shadow-lg z-50 w-60 overflow-hidden mb-2">
            <div className="popover-header px-3 py-1.5 bg-background text-xs font-semibold text-secondary">
              Mention Member
            </div>
            <ul className="popover-list">
              {mentionSuggestions.map((member, i) => (
                <li
                  key={member.id}
                  className={`popover-item px-3 py-2 cursor-pointer flex items-center hover:bg-hover ${i === mentionIndex ? 'bg-hover' : ''}`}
                  onClick={() => insertMention(member.user?.name || '')}
                >
                  <Avatar src={member.user?.avatarUrl} name={member.user?.name || ''} size={24} />
                  <span className="ml-2 text-sm text-foreground truncate">{member.user?.name}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <form onSubmit={handleSendMessage} className="flex gap-2 w-full">
          <input
            type="text"
            value={inputText}
            onChange={(e) => handleInputChange(e.target.value)}
            placeholder="Type a message... use @ to mention someone"
            className="chat-compose-input flex-grow bg-background text-foreground border border-divider px-4 py-2 rounded-lg"
          />
          <button type="submit" className="btn-primary px-5 rounded-lg flex items-center justify-center">
            Send
          </button>
        </form>
      </div>
    </div>
  )
}
