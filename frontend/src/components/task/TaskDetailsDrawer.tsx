import React, { useState, useEffect, useRef } from 'react'
import {
  getTodoById,
  updateTodo,
  addComment,
  updateComment,
  deleteComment,
  addAttachment,
  deleteAttachment,
  downloadAttachment,
  markCommentsAsRead,
  updateAttachment,
} from '../../api'
import type {
  Todo,
  User,
  TeamMember,
  TaskComment,
  TaskAttachment,
  TaskHistory,
  TaskPriority,
  TaskStatus,
} from '../../types'
import { Avatar } from '../shared/Avatar'

interface TaskDetailsDrawerProps {
  todoId: string
  currentUser: User
  teamMembers: TeamMember[]
  teamRole?: 'OWNER' | 'ADMIN' | 'MEMBER'
  onClose: () => void
  onTaskUpdated: (updated: Todo) => void
  sendTypingStatus?: (taskId: string, isTyping: boolean) => void
  sendTaskDrawerState?: (taskId: string, open: boolean) => void
}

export function TaskDetailsDrawer({
  todoId,
  currentUser,
  teamMembers,
  teamRole = 'MEMBER',
  onClose,
  onTaskUpdated,
  sendTypingStatus,
  sendTaskDrawerState,
}: TaskDetailsDrawerProps) {
  const [todo, setTodo] = useState<Todo | null>(null)
  const [comments, setComments] = useState<TaskComment[]>([])
  const [attachments, setAttachments] = useState<TaskAttachment[]>([])
  const [histories, setHistories] = useState<TaskHistory[]>([])
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  // WebSocket real-time states
  const [viewingUsers, setViewingUsers] = useState<Array<{ id: string; name: string }>>([])
  const [typingUsers, setTypingUsers] = useState<Array<{ id: string; name: string }>>([])

  // Comments state
  const [newComment, setNewComment] = useState('')
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null)
  const [editingCommentText, setEditingCommentText] = useState('')

  // Attachment state
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [markImportantUpload, setMarkImportantUpload] = useState(false)

  const typingTimeoutRef = useRef<any>(null)

  // Load task details, comments, and attachments
  const loadTaskDetails = async () => {
    try {
      setLoading(true)
      const data = await getTodoById(todoId)
      setTodo(data)
      setComments(data.comments || [])
      setAttachments(data.attachments || [])
      setHistories(data.histories || [])
      setErrorMsg('')

      // Mark comments as read once task details are loaded
      void markCommentsAsRead(todoId).catch(() => {})
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to load task details')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadTaskDetails()
  }, [todoId])

  // Lifecycle for WebSocket drawer state & real-time update listeners
  useEffect(() => {
    if (sendTaskDrawerState) {
      sendTaskDrawerState(todoId, true)
    }

    const handleWsEvent = (event: Event) => {
      const customEvent = event as CustomEvent
      const wsMessage = customEvent.detail
      if (!msg || !wsMessage.eventType) return

      const { eventType, payload } = wsMessage

      if (eventType === 'TASK_LOCK_UPDATED' && payload.taskId === todoId) {
        setViewingUsers(payload.viewingUsers || [])
      } else if (eventType === 'TYPING_UPDATED' && payload.taskId === todoId) {
        setTypingUsers(payload.typingUsers || [])
      } else if (eventType === 'TASK_UPDATED' && payload.id === todoId) {
        setTodo((prev) => (prev ? { ...prev, ...payload } : payload))
      } else if (eventType === 'COMMENT_CREATED' && payload.taskId === todoId) {
        setComments((prev) => {
          if (prev.some((c) => c.id === payload.id)) return prev
          return [...prev, payload]
        })
        // Auto-mark new comments as read
        void markCommentsAsRead(todoId).catch(() => {})
      } else if (eventType === 'COMMENT_UPDATED' && payload.taskId === todoId) {
        setComments((prev) => prev.map((c) => (c.id === payload.id ? payload : c)))
      } else if (eventType === 'COMMENT_DELETED' && payload.taskId === todoId) {
        setComments((prev) => prev.filter((c) => c.id !== payload.id))
      } else if (eventType === 'COMMENT_READ' && payload.taskId === todoId) {
        setComments((prev) =>
          prev.map((c) => {
            if (payload.commentIds.includes(c.id)) {
              const hasStatus = (c.readStatuses || []).some((s) => s.userId === payload.userId)
              if (hasStatus) return c
              return {
                ...c,
                readStatuses: [
                  ...(c.readStatuses || []),
                  {
                    commentId: c.id,
                    userId: payload.userId,
                    viewedAt: payload.viewedAt,
                    user: { id: payload.userId, name: payload.userName },
                  },
                ],
              }
            }
            return c
          })
        )
      } else if (eventType === 'ATTACHMENT_UPLOADED' && payload.taskId === todoId) {
        setAttachments((prev) => {
          if (prev.some((a) => a.id === payload.id)) return prev
          return [...prev, payload]
        })
      }
    }

    const msg = true
    window.addEventListener('ws:event', handleWsEvent)

    return () => {
      if (sendTaskDrawerState) {
        sendTaskDrawerState(todoId, false)
      }
      if (sendTypingStatus) {
        sendTypingStatus(todoId, false)
      }
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }
      window.removeEventListener('ws:event', handleWsEvent)
    }
  }, [todoId, sendTaskDrawerState, sendTypingStatus])

  const handleCommentInputChange = (val: string) => {
    setNewComment(val)
    if (sendTypingStatus) {
      sendTypingStatus(todoId, true)
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
      typingTimeoutRef.current = setTimeout(() => {
        sendTypingStatus(todoId, false)
      }, 3000)
    }
  }

  // Handles updating general fields
  const handleFieldChange = async (fields: Partial<Todo>) => {
    if (!todo) return
    setErrorMsg('')
    setSuccessMsg('')
    try {
      const updated = await updateTodo(todo.id, fields)
      setTodo(updated)
      onTaskUpdated(updated)
      setSuccessMsg('Task updated successfully')
      
      // Reload details to get new history logs
      const freshData = await getTodoById(todo.id)
      setHistories(freshData.histories || [])
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to update task')
    }
  }

  // Handle date validation and updates
  const handleDateChange = async (startDateStr: string | null, dueDateStr: string | null) => {
    if (!todo) return
    setErrorMsg('')
    setSuccessMsg('')

    const start = startDateStr !== undefined ? startDateStr : todo.startDate
    const due = dueDateStr !== undefined ? dueDateStr : todo.dueDate

    if (start && due && new Date(due) <= new Date(start)) {
      setErrorMsg('Due date must be after start date')
      return
    }

    try {
      const updated = await updateTodo(todo.id, {
        startDate: startDateStr,
        dueDate: dueDateStr,
      })
      setTodo(updated)
      onTaskUpdated(updated)
      setSuccessMsg('Dates updated')
      const freshData = await getTodoById(todo.id)
      setHistories(freshData.histories || [])
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to update task dates')
    }
  }

  // Comments CRUD
  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newComment.trim() || !todo) return
    setErrorMsg('')
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
    if (sendTypingStatus) sendTypingStatus(todoId, false)
    try {
      const comment = await addComment(todo.id, newComment.trim())
      setComments((prev) => {
        if (prev.some((c) => c.id === comment.id)) return prev
        return [...prev, comment]
      })
      setNewComment('')
      const freshData = await getTodoById(todo.id)
      setHistories(freshData.histories || [])
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to add comment')
    }
  }

  const handleEditComment = async (commentId: string) => {
    if (!editingCommentText.trim()) return
    setErrorMsg('')
    try {
      const updated = await updateComment(commentId, editingCommentText.trim())
      setComments((prev) => prev.map((c) => (c.id === commentId ? updated : c)))
      setEditingCommentId(null)
      setEditingCommentText('')
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to edit comment')
    }
  }

  const handleDeleteComment = async (commentId: string) => {
    if (!window.confirm('Delete this comment?')) return
    setErrorMsg('')
    try {
      await deleteComment(commentId)
      setComments((prev) => prev.filter((c) => c.id !== commentId))
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to delete comment')
    }
  }

  // File attachments metadata upload simulation
  const handleFileUploadSimulated = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !todo) return
    setErrorMsg('')
    setUploading(true)
    try {
      // Simulate file upload metadata creation
      const attachment = await addAttachment(todo.id, {
        fileName: file.name,
        fileType: file.type || 'application/octet-stream',
        fileSize: file.size,
        storagePath: `/uploads/${file.name}`,
        isImportant: markImportantUpload,
      })
      setAttachments((prev) => {
        if (prev.some((a) => a.id === attachment.id)) return prev
        return [attachment, ...prev]
      })
      setMarkImportantUpload(false)
      const freshData = await getTodoById(todo.id)
      setHistories(freshData.histories || [])
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to add attachment')
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleToggleImportant = async (id: string, isImportant: boolean) => {
    setErrorMsg('')
    try {
      const updated = await updateAttachment(id, { isImportant })
      setAttachments((prev) => prev.map((a) => (a.id === id ? { ...a, isImportant: updated.isImportant } : a)))
    } catch (err) {
      setErrorMsg('Failed to update file importance')
    }
  }

  const handleDeleteAttachment = async (attachmentId: string) => {
    if (!window.confirm('Delete this attachment?')) return
    setErrorMsg('')
    try {
      await deleteAttachment(attachmentId)
      setAttachments((prev) => prev.filter((a) => a.id !== attachmentId))
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to delete attachment')
    }
  }

  if (loading) {
    return (
      <div className="drawer-overlay" onClick={onClose}>
        <div className="drawer-container" onClick={(e) => e.stopPropagation()}>
          <div className="drawer-header">
            <h3>Loading task details…</h3>
            <button className="close-btn" onClick={onClose}>&times;</button>
          </div>
        </div>
      </div>
    )
  }

  if (!todo) return null

  // Format friendly due dates
  const formatFriendlyDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return 'Not set'
    const d = new Date(dateStr)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const target = new Date(d)
    target.setHours(0, 0, 0, 0)

    const diffTime = target.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Tomorrow'
    if (diffDays === -1) return 'Overdue (Yesterday)'
    if (diffDays < -1) return `Overdue (${Math.abs(diffDays)} days ago)`
    if (diffDays > 1 && diffDays <= 3) return `${diffDays} days left`
    return d.toLocaleDateString()
  }

  // Format file size
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  return (
    <div className="drawer-overlay animated-fade-in" onClick={onClose}>
      <div className="drawer-container" onClick={(e) => e.stopPropagation()}>
        <div className="drawer-header" style={{ display: 'flex', flexDirection: 'column', alignItems: 'stretch', gap: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
            <div className="drawer-title-area" style={{ display: 'flex', alignItems: 'center', gap: '8px', flexGrow: 1 }}>
              <span className={`badge-status badge-status-${todo.status.toLowerCase()}`}>
                {todo.status.replace('_', ' ')}
              </span>
              {todo.archived && (
                <span className="badge-status badge-status-archived" style={{ background: '#f97316', color: '#fff', fontSize: '0.75rem', fontWeight: 'bold', padding: '2px 6px', borderRadius: '4px' }}>
                  📦 Archived
                </span>
              )}
              <input
                type="text"
                className="drawer-title-input text-foreground bg-transparent"
                value={todo.title}
                onChange={(e) => handleFieldChange({ title: e.target.value })}
                onBlur={(e) => handleFieldChange({ title: e.target.value })}
              />
            </div>
            <button className="close-btn text-foreground" type="button" onClick={onClose} style={{ marginLeft: 'auto', background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer' }}>
              &times;
            </button>
          </div>

          {/* Active collaborators list */}
          {viewingUsers.filter(u => u.id !== currentUser.id).length > 0 && (
            <div className="active-collaborators flex items-center gap-1.5 pt-2 border-t border-divider">
              <span className="text-[11px] text-secondary font-medium">Currently viewing:</span>
              <div className="flex gap-1">
                {viewingUsers.filter(u => u.id !== currentUser.id).map((u) => (
                  <div key={u.id} className="relative group" title={u.name}>
                    <Avatar name={u.name} size={24} />
                    <span className="absolute bottom-0 right-0 w-2 h-2 bg-green-500 rounded-full border border-white"></span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {errorMsg ? <div className="error-banner">{errorMsg}</div> : null}
        {successMsg ? <div className="success-banner">{successMsg}</div> : null}

        {viewingUsers.filter((u) => u.id !== currentUser.id).length > 0 && (
          <div className="warning-banner" style={{
            background: 'rgba(245, 158, 11, 0.1)',
            color: '#f59e0b',
            border: '1px solid rgba(245, 158, 11, 0.2)',
            padding: '8px 16px',
            fontSize: '0.85rem',
            fontWeight: '500',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            ⚠️ {viewingUsers.filter((u) => u.id !== currentUser.id).map((u) => u.name).join(', ')} is currently viewing/editing this task.
          </div>
        )}

        <div className="drawer-body-grid">
          {/* Main Info (Left Column) */}
          <div className="drawer-main-content">
            {/* Description */}
            <div className="drawer-section">
              <h4>Description</h4>
              <textarea
                className="drawer-desc-textarea text-foreground bg-transparent border border-divider rounded-xl p-2"
                value={todo.description}
                onChange={(e) => setTodo({ ...todo, description: e.target.value })}
                onBlur={(e) => handleFieldChange({ description: e.target.value })}
                placeholder="Add detail description for this task..."
              />
            </div>
            {/* Simulated Attachment Upload */}
            <div className="drawer-section">
              <div className="section-heading" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h4>Attachments</h4>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginLeft: 'auto' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                    <input
                      type="checkbox"
                      checked={markImportantUpload}
                      onChange={(e) => setMarkImportantUpload(e.target.checked)}
                    />
                    Mark Important
                  </label>
                  <button
                    type="button"
                    className="secondary-sm bg-surface border border-divider px-2.5 py-1 text-xs rounded-lg text-foreground hover:bg-hover"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                  >
                    {uploading ? 'Adding...' : 'Attach File'}
                  </button>
                </div>
                <input
                  type="file"
                  ref={fileInputRef}
                  style={{ display: 'none' }}
                  onChange={handleFileUploadSimulated}
                />
              </div>

              <div className="attachments-list">
                {/* 1. Important Attachments Section */}
                {attachments.filter(a => a.isImportant).length > 0 && (
                  <div className="important-attachments-sub-list mb-3">
                    <h5 className="text-xs font-bold text-accent mb-2 flex items-center gap-1">⭐ Prominent Files (Important)</h5>
                    {attachments.filter(a => a.isImportant).map((attach) => (
                      <div key={attach.id} className="attachment-item important-highlight bg-surface/50 p-2.5 rounded-lg mb-2 flex justify-between items-center" style={{ borderLeft: '3px solid var(--accent)' }}>
                        <div className="attach-meta">
                          <span className="attach-name font-semibold text-xs text-foreground block">{attach.fileName}</span>
                          <span className="attach-info text-[10px] text-secondary">
                            ({formatBytes(attach.fileSize)}) • Uploaded by {attach.uploader?.name || 'User'}
                          </span>
                        </div>
                        <div className="attach-actions flex gap-2">
                          <button
                            type="button"
                            onClick={() => handleToggleImportant(attach.id, false)}
                            className="star-btn text-xs"
                            style={{ background: 'none', border: 'none', cursor: 'pointer' }}
                            title="Unmark Important"
                          >
                            ⭐
                          </button>
                          <a
                            href="#"
                            onClick={async (e) => {
                              e.preventDefault()
                              try {
                                await downloadAttachment(attach.id, attach.fileName)
                              } catch (err) {
                                alert('Failed to download attachment')
                              }
                            }}
                            className="attach-link text-xs text-accent font-semibold"
                          >
                            Download
                          </a>
                          {(attach.uploadedByUserId === currentUser.id ||
                            teamRole === 'OWNER' ||
                            teamRole === 'ADMIN') && (
                            <button
                              type="button"
                              onClick={() => handleDeleteAttachment(attach.id)}
                              className="delete-btn-sm text-xs text-danger"
                              style={{ background: 'none', border: 'none', cursor: 'pointer' }}
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* 2. Regular Attachments Section */}
                {attachments.filter(a => !a.isImportant).length > 0 && (
                  <div className="regular-attachments-sub-list">
                    {attachments.filter(a => !a.isImportant).map((attach) => (
                      <div key={attach.id} className="attachment-item bg-surface/30 p-2 rounded-lg mb-2 flex justify-between items-center">
                        <div className="attach-meta">
                          <span className="attach-name text-xs text-foreground block">{attach.fileName}</span>
                          <span className="attach-info text-[10px] text-secondary">
                            ({formatBytes(attach.fileSize)}) • Uploaded by {attach.uploader?.name || 'User'}
                          </span>
                        </div>
                        <div className="attach-actions flex gap-2">
                          <button
                            type="button"
                            onClick={() => handleToggleImportant(attach.id, true)}
                            className="star-btn text-xs"
                            style={{ background: 'none', border: 'none', cursor: 'pointer' }}
                            title="Mark Important"
                          >
                            ☆
                          </button>
                          <a
                            href="#"
                            onClick={async (e) => {
                              e.preventDefault()
                              try {
                                await downloadAttachment(attach.id, attach.fileName)
                              } catch (err) {
                                alert('Failed to download attachment')
                              }
                            }}
                            className="attach-link text-xs text-accent font-semibold"
                          >
                            Download
                          </a>
                          {(attach.uploadedByUserId === currentUser.id ||
                            teamRole === 'OWNER' ||
                            teamRole === 'ADMIN') && (
                            <button
                              type="button"
                              onClick={() => handleDeleteAttachment(attach.id)}
                              className="delete-btn-sm text-xs text-danger"
                              style={{ background: 'none', border: 'none', cursor: 'pointer' }}
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {attachments.length === 0 && (
                  <p className="empty-section-text text-xs text-secondary italic">No attachments linked to this task.</p>
                )}
              </div>
            </div>

            {/* Comments discussions thread */}
            <div className="drawer-section">
              <h4>Discussions</h4>
              <div className="comments-thread space-y-3">
                {comments.map((comm) => (
                  <div key={comm.id} className="comment-bubble bg-surface/30 border border-divider p-3 rounded-xl">
                    <div className="comment-header flex justify-between items-center text-xs text-secondary mb-1">
                      <span className="comment-author font-semibold text-foreground">{comm.user?.name || 'User'}</span>
                      <span className="comment-time">
                        {new Date(comm.createdAt).toLocaleString()}
                      </span>
                    </div>
                    {editingCommentId === comm.id ? (
                      <div className="comment-edit-box flex flex-col gap-2 mt-1">
                        <textarea
                          className="comment-edit-textarea w-full p-2 border border-divider rounded-lg bg-card text-foreground"
                          value={editingCommentText}
                          onChange={(e) => setEditingCommentText(e.target.value)}
                        />
                        <div className="comment-edit-actions flex gap-2">
                          <button
                            type="button"
                            className="btn-primary py-1 px-2.5 text-xs rounded"
                            onClick={() => handleEditComment(comm.id)}
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            className="btn-secondary py-1 px-2.5 text-xs rounded"
                            onClick={() => {
                              setEditingCommentId(null)
                              setEditingCommentText('')
                            }}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p className="comment-body text-sm text-foreground break-words">{comm.message}</p>
                    )}
                    {comm.userId === currentUser.id && editingCommentId !== comm.id && (
                      <div className="comment-actions flex gap-2 mt-1.5 text-xs">
                        <button
                          type="button"
                          className="text-accent bg-transparent border-none cursor-pointer p-0 font-medium"
                          onClick={() => {
                            setEditingCommentId(comm.id)
                            setEditingCommentText(comm.message)
                          }}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="text-danger bg-transparent border-none cursor-pointer p-0 font-medium"
                          onClick={() => handleDeleteComment(comm.id)}
                        >
                          Delete
                        </button>
                      </div>
                    )}
                    {comm.readStatuses && comm.readStatuses.filter((s) => s.userId !== currentUser.id).length > 0 && (
                      <div className="comment-read-status text-[9px] text-success text-right mt-1 font-semibold">
                        <span>✓✓ Read by {comm.readStatuses.filter((s) => s.userId !== currentUser.id).map((s) => s.user?.name || 'Someone').join(', ')}</span>
                      </div>
                    )}
                  </div>
                ))}
                {comments.length === 0 && (
                  <p className="empty-section-text text-xs text-secondary italic mb-2">
                    No messages. Start the discussion below.
                  </p>
                )}
              </div>

              {typingUsers.filter((u) => u.id !== currentUser.id).length > 0 && (
                <div className="typing-indicator text-xs text-secondary italic py-1 flex items-center gap-1.5">
                  <span className="dot-pulse-typing flex gap-1">
                    <span className="w-1 h-1 rounded-full bg-secondary animate-bounce"></span>
                    <span className="w-1 h-1 rounded-full bg-secondary animate-bounce delay-75"></span>
                    <span className="w-1 h-1 rounded-full bg-secondary animate-bounce delay-150"></span>
                  </span>
                  {typingUsers.filter((u) => u.id !== currentUser.id).map((u) => u.name).join(', ')} is typing...
                </div>
              )}

              <form onSubmit={handleAddComment} className="comment-form mt-3 flex gap-2">
                <input
                  type="text"
                  placeholder="Ask a question or post updates..."
                  value={newComment}
                  onChange={(e) => handleCommentInputChange(e.target.value)}
                  className="form-field flex-grow px-3 py-2 border border-divider rounded-xl bg-card text-foreground"
                />
                <button type="submit" className="btn-primary py-2 px-4 rounded-xl text-xs font-semibold">
                  Send
                </button>
              </form>
            </div>
          </div>

          {/* Sidebar Attributes (Right Column) */}
          <div className="drawer-sidebar-attributes border-l border-divider/50 pl-4 space-y-4">
            {/* Status Selector */}
            <div className="attr-group flex flex-col gap-1">
              <label className="text-xs font-bold text-secondary">Status</label>
              <select
                value={todo.status}
                onChange={(e) => handleFieldChange({ status: e.target.value as TaskStatus })}
                className="form-field bg-card border border-divider rounded-lg p-2 text-sm text-foreground focus:outline-none"
              >
                <option value="TODO">To Do</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="IN_REVIEW">In Review</option>
                <option value="DONE">Done</option>
              </select>
            </div>

            {/* Archived State Toggle */}
            <div className="attr-group flex flex-col gap-1">
              <label className="text-xs font-bold text-secondary">Archived State</label>
              <button
                type="button"
                className={`archive-toggle-btn w-full py-2 px-3 rounded-lg text-xs font-semibold transition-all ${
                  todo.archived 
                    ? 'bg-surface border border-primary text-primary' 
                    : 'bg-surface hover:bg-hover text-foreground border border-divider'
                }`}
                onClick={() => handleFieldChange({ archived: !todo.archived })}
              >
                {todo.archived ? '📦 Archived (Unarchive)' : '📦 Archive Task'}
              </button>
            </div>

            {/* Review Workflow Approve/Reject Panel */}
            {todo.status === 'IN_REVIEW' && (
              <div className="review-workflow-panel bg-surface p-3 rounded-xl border border-divider">
                <h5 className="text-xs font-bold text-foreground mb-1.5">Review Workflow</h5>
                {teamRole === 'OWNER' || teamRole === 'ADMIN' ? (
                  <div className="review-actions flex gap-2">
                    <button
                      type="button"
                      className="approve-btn bg-foreground text-background py-1 px-2.5 rounded text-[11px] font-bold"
                      onClick={() => handleFieldChange({ status: 'DONE' })}
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      className="reject-btn bg-danger text-white py-1 px-2.5 rounded text-[11px] font-bold"
                      onClick={() => handleFieldChange({ status: 'IN_PROGRESS' })}
                    >
                      Reject
                    </button>
                  </div>
                ) : (
                  <div className="review-badge-waiting text-xs text-secondary italic">Waiting for review...</div>
                )}
              </div>
            )}

            {/* Priority Selector */}
            <div className="attr-group flex flex-col gap-1">
              <label className="text-xs font-bold text-secondary">Priority</label>
              <select
                value={todo.priority}
                onChange={(e) => handleFieldChange({ priority: e.target.value as TaskPriority })}
                className="form-field bg-card border border-divider rounded-lg p-2 text-sm text-foreground focus:outline-none"
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent</option>
              </select>
            </div>

            {/* Assignee Selector */}
            {todo.teamId && (
              <div className="attr-group flex flex-col gap-1">
                <label className="text-xs font-bold text-secondary">Assignee</label>
                <select
                  value={todo.assignedToUserId || ''}
                  onChange={(e) => {
                    const val = e.target.value ? e.target.value : null
                    handleFieldChange({ assignedToUserId: val })
                  }}
                  disabled={teamRole === 'MEMBER' && todo.assignedToUserId !== currentUser.id}
                  className="form-field bg-card border border-divider rounded-lg p-2 text-sm text-foreground focus:outline-none"
                >
                  <option value="">Unassigned</option>
                  {teamMembers.map((m) => (
                    <option key={m.user?.id} value={m.user?.id}>
                      {m.user?.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Start Date */}
            <div className="attr-group flex flex-col gap-1">
              <label className="text-xs font-bold text-secondary">Start Date</label>
              <input
                type="date"
                value={todo.startDate ? todo.startDate.split('T')[0] : ''}
                onChange={(e) => handleDateChange(e.target.value ? e.target.value : null, todo.dueDate || null)}
                className="form-field bg-card border border-divider rounded-lg p-2 text-xs text-foreground focus:outline-none"
              />
            </div>

            {/* Due Date */}
            <div className="attr-group flex flex-col gap-1">
              <label className="text-xs font-bold text-secondary">Due Date</label>
              <input
                type="date"
                value={todo.dueDate ? todo.dueDate.split('T')[0] : ''}
                onChange={(e) => handleDateChange(todo.startDate || null, e.target.value ? e.target.value : null)}
                className="form-field bg-card border border-divider rounded-lg p-2 text-xs text-foreground focus:outline-none"
              />
              <span className="due-date-friendly text-[10px] text-secondary mt-0.5">
                ({formatFriendlyDate(todo.dueDate)})
              </span>
            </div>

            {/* Estimated Hours */}
            <div className="attr-group flex flex-col gap-1">
              <label className="text-xs font-bold text-secondary">Estimated Effort (Hours)</label>
              <input
                type="number"
                min="0"
                value={todo.estimatedHours ?? ''}
                onChange={(e) =>
                  handleFieldChange({
                    estimatedHours: e.target.value ? parseInt(e.target.value, 10) : null,
                  })
                }
                className="form-field bg-card border border-divider rounded-lg p-2 text-xs text-foreground focus:outline-none"
              />
            </div>

            {/* Timeline Audit Logs */}
            <div className="attr-group timeline-section flex flex-col gap-1">
              <label className="text-xs font-bold text-secondary">Activity Logs Timeline</label>
              <div className="history-timeline space-y-2 mt-1">
                {histories.map((h) => (
                  <div key={h.id} className="timeline-event flex items-start gap-2 text-[10px] text-secondary">
                    <span className="timeline-dot w-1.5 h-1.5 rounded-full bg-accent mt-1 flex-shrink-0" />
                    <div className="timeline-event-content">
                      <span className="timeline-event-title font-semibold text-foreground block">
                        {h.action.replace('_', ' ')}
                      </span>
                      <span className="timeline-event-desc">
                        {h.performer?.name || 'System'} • {new Date(h.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                ))}
                {histories.length === 0 && (
                  <p className="empty-section-text text-[10px] text-secondary italic">No timeline history recorded.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
