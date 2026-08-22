import { useEffect, useRef, useState } from 'react'

export type WebSocketStatus = 'connected' | 'disconnected' | 'reconnecting'

export function useWebSocket(
  token: string | null,
  activeWorkspaceId: string | null,
  activeWorkspaceKind: 'private' | 'team'
) {
  const [status, setStatus] = useState<WebSocketStatus>('disconnected')
  const socketRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<any>(null)
  const isAuthenticatedRef = useRef(false)

  const sendMessage = (msg: any) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify(msg))
    }
  }

  useEffect(() => {
    if (!token) {
      if (socketRef.current) {
        socketRef.current.close()
        socketRef.current = null
      }
      setStatus('disconnected')
      isAuthenticatedRef.current = false
      return
    }

    const connect = () => {
      const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws'
      const host = window.location.host
      const socketUrl = `${protocol}://${host}/socket`

      setStatus(socketRef.current ? 'reconnecting' : 'disconnected')
      const ws = new WebSocket(socketUrl)
      socketRef.current = ws

      ws.onopen = () => {
        ws.send(JSON.stringify({ type: 'authenticate', token }))
      }

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data)

          if (message.type === 'authenticated') {
            setStatus('connected')
            isAuthenticatedRef.current = true

            // Join workspace on authentication success
            const wsId = activeWorkspaceKind === 'team' ? activeWorkspaceId : 'private'
            ws.send(JSON.stringify({ type: 'join_workspace', workspaceId: wsId }))
          } else if (message.type === 'error') {
            console.error('[WS Error]:', message.message)
          } else if (message.eventType) {
            // Dispatch global events for hooks / components to process
            window.dispatchEvent(
              new CustomEvent('ws:event', { detail: message })
            )
            window.dispatchEvent(
              new CustomEvent(`ws:${message.eventType}`, { detail: message })
            )
          }
        } catch (err) {
          console.error('[WS Parse Error]:', err)
        }
      }

      ws.onclose = () => {
        isAuthenticatedRef.current = false
        setStatus('disconnected')

        if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current)
        reconnectTimeoutRef.current = setTimeout(() => {
          connect()
        }, 3000)
      }

      ws.onerror = (err) => {
        console.error('[WS Socket Error]:', err)
        ws.close()
      }
    }

    connect()

    return () => {
      if (socketRef.current) {
        socketRef.current.close()
        socketRef.current = null
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
    }
  }, [token])

  // Join workspace whenever workspace changes or connection goes live
  useEffect(() => {
    if (status === 'connected' && isAuthenticatedRef.current) {
      const wsId = activeWorkspaceKind === 'team' ? activeWorkspaceId : 'private'
      sendMessage({ type: 'join_workspace', workspaceId: wsId })
    }
  }, [activeWorkspaceId, activeWorkspaceKind, status])

  const sendTypingStatus = (taskId: string, isTyping: boolean) => {
    const wsId = activeWorkspaceKind === 'team' ? activeWorkspaceId : 'private'
    sendMessage({ type: 'typing', workspaceId: wsId, taskId, isTyping })
  }

  // Periodic presence heartbeat (30s interval)
  useEffect(() => {
    if (status !== 'connected' || !isAuthenticatedRef.current) return

    const interval = setInterval(() => {
      sendMessage({ type: 'presence_heartbeat', status: 'online' })
    }, 30000)

    sendMessage({ type: 'presence_heartbeat', status: 'online' })

    return () => clearInterval(interval)
  }, [status])

  useEffect(() => {
    const handleEmitTyping = (event: Event) => {
      const customEvent = event as CustomEvent<{ workspaceId: string; taskId: string | null; isTyping: boolean }>
      if (customEvent.detail) {
        const { workspaceId, taskId, isTyping } = customEvent.detail
        sendMessage({ type: 'typing', workspaceId, taskId, isTyping })
      }
    }
    window.addEventListener('ws:typing_status_emit', handleEmitTyping)
    return () => window.removeEventListener('ws:typing_status_emit', handleEmitTyping)
  }, [status])

  const sendTaskDrawerState = (taskId: string, open: boolean) => {
    if (open) {
      sendMessage({ type: 'view_task', taskId })
    } else {
      sendMessage({ type: 'leave_task' })
    }
  }

  return {
    status,
    sendTypingStatus,
    sendTaskDrawerState,
  }
}
