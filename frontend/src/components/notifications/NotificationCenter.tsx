/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useRef, useState } from 'react'
import {
  fetchNotifications,
  fetchUnreadCount,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
} from '../../api'
import type { Notification } from '../../types'
import { formatTimestamp } from '../../utils/time'


export function NotificationCenter() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState<number>(0)
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const dropdownRef = useRef<HTMLDivElement>(null)

  const loadNotifications = async () => {
    setLoading(true)
    setError('')
    try {
      const data = await fetchNotifications()
      setNotifications(data)
      const countRes = await fetchUnreadCount()
      setUnreadCount(countRes.count)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load notifications')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const getInitialCount = async () => {
      try {
        const countRes = await fetchUnreadCount()
        setUnreadCount(countRes.count)
      } catch (err) {
        console.error('Error fetching unread count:', err)
      }
    }
    getInitialCount()

    // Poll every 30 seconds for updates
    const interval = setInterval(getInitialCount, 30000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const handleWsNotification = (event: Event) => {
      const customEvent = event as CustomEvent
      const wsMessage = customEvent.detail
      if (!wsMessage || wsMessage.eventType !== 'NOTIFICATION_CREATED') return

      const newNotification = wsMessage.payload

      setUnreadCount((prev) => prev + 1)
      setNotifications((prev) => {
        if (prev.some((n) => n.id === newNotification.id)) return prev
        return [newNotification, ...prev]
      })
    }

    window.addEventListener('ws:NOTIFICATION_CREATED', handleWsNotification)
    return () => window.removeEventListener('ws:NOTIFICATION_CREATED', handleWsNotification)
  }, [])

  useEffect(() => {
    if (isOpen) {
      void loadNotifications()
    }
  }, [isOpen])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleMarkAsRead = async (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    )
    setUnreadCount((prev) => Math.max(0, prev - 1))
    try {
      await markNotificationRead(id)
    } catch {
      void loadNotifications()
    }
  }

  const handleNotificationClick = (notif: Notification) => {
    if (!notif.isRead) {
      void handleMarkAsRead(notif.id)
    }
    if (notif.type === 'TEAM_INVITE_RECEIVED' && notif.metadata) {
      window.location.hash = `#/accept-invite?token=${notif.metadata}`
      setIsOpen(false)
    } else if (notif.type === 'TASK_ASSIGNED' && notif.metadata) {
      window.dispatchEvent(
        new CustomEvent('workspace:change', {
          detail: { kind: 'team', teamId: notif.metadata },
        })
      )
      setIsOpen(false)
    }
  }

  const handleMarkAllRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })))
    setUnreadCount(0)
    try {
      await markAllNotificationsRead()
    } catch {
      void loadNotifications()
    }
  }

  const handleDelete = async (id: string) => {
    const originalNotif = notifications.find((n) => n.id === id)
    setNotifications((prev) => prev.filter((n) => n.id !== id))
    if (originalNotif && !originalNotif.isRead) {
      setUnreadCount((prev) => Math.max(0, prev - 1))
    }
    try {
      await deleteNotification(id)
    } catch {
      void loadNotifications()
    }
  }

  return (
    <div className="notification-center-container" ref={dropdownRef}>
      <button
        type="button"
        className="notification-trigger"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Toggle notifications"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="bell-icon">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unreadCount > 0 && <span className="unread-badge">{unreadCount}</span>}
      </button>

      {isOpen && (
        <div className="notification-dropdown">
          <div className="dropdown-header">
            <h3>Notifications</h3>
            {unreadCount > 0 && (
              <button type="button" className="read-all-btn" onClick={handleMarkAllRead}>
                Mark all read
              </button>
            )}
          </div>

          <div className="dropdown-body">
            {error && <div className="dropdown-error">{error}</div>}
            {loading && <div className="dropdown-loading">Loading...</div>}

            {!loading && notifications.length === 0 && (
              <div className="dropdown-empty">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="empty-icon mx-auto opacity-40 mb-2">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
                <p>All caught up! No notifications.</p>
              </div>
            )}

            {!loading &&
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  className={`notification-item ${notif.isRead ? 'read' : 'unread'}`}
                >
                  <div
                    className="notification-content"
                    onClick={() => handleNotificationClick(notif)}
                    style={{ cursor: 'pointer' }}
                  >
                    <div className="notification-title-row">
                      <span className="notification-item-title">{notif.title}</span>
                      <span className="notification-time">
                        {formatTimestamp(notif.createdAt)}
                      </span>
                    </div>
                    <p className="notification-message">{notif.message}</p>
                  </div>
                  <div className="notification-actions">
                    {!notif.isRead && (
                      <button
                        type="button"
                        className="mark-read-btn"
                        onClick={() => handleMarkAsRead(notif.id)}
                        title="Mark as read"
                      >
                        ✓
                      </button>
                    )}
                    <button
                      type="button"
                      className="delete-notif-btn"
                      onClick={() => handleDelete(notif.id)}
                      title="Delete notification"
                    >
                      ×
                    </button>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  )
}
