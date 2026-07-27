/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useRef, useState } from 'react'
import {
  fetchNotifications,
  fetchUnreadCount,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
} from '../api'
import type { Notification } from '../types'

function formatTimestamp(isoString: string): string {
  const date = new Date(isoString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

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
        <span className="bell-icon">🔔</span>
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
                <span className="empty-icon">🎉</span>
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
