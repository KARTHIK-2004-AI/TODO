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
} from '../api'
import type {
  Todo,
  User,
  TeamMember,
  TaskComment,
  TaskAttachment,
  TaskHistory,
  TaskPriority,
  TaskStatus,
} from '../types'

interface TaskDetailsDrawerProps {
  todoId: string
  currentUser: User
  teamMembers: TeamMember[]
  teamRole?: 'OWNER' | 'ADMIN' | 'MEMBER'
  onClose: () => void
  onTaskUpdated: (updated: Todo) => void
}

export function TaskDetailsDrawer({
  todoId,
  currentUser,
  teamMembers,
  teamRole = 'MEMBER',
  onClose,
  onTaskUpdated,
}: TaskDetailsDrawerProps) {
  const [todo, setTodo] = useState<Todo | null>(null)
  const [comments, setComments] = useState<TaskComment[]>([])
  const [attachments, setAttachments] = useState<TaskAttachment[]>([])
  const [histories, setHistories] = useState<TaskHistory[]>([])
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  // Comments state
  const [newComment, setNewComment] = useState('')
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null)
  const [editingCommentText, setEditingCommentText] = useState('')

  // Attachment state
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)

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
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to load task details')
    } finally {
      setLoading(false)
    }
  };

  useEffect(() => {
    loadTaskDetails()
  }, [todoId])

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
    try {
      const comment = await addComment(todo.id, newComment.trim())
      setComments((prev) => [...prev, comment])
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
      })
      setAttachments((prev) => [attachment, ...prev])
      const freshData = await getTodoById(todo.id)
      setHistories(freshData.histories || [])
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to add attachment')
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
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
    <div className="drawer-overlay" onClick={onClose}>
      <div className="drawer-container" onClick={(e) => e.stopPropagation()}>
        <div className="drawer-header">
          <div className="drawer-title-area">
            <span className={`badge-status badge-status-${todo.status.toLowerCase()}`}>
              {todo.status.replace('_', ' ')}
            </span>
            <input
              type="text"
              className="drawer-title-input"
              value={todo.title}
              onChange={(e) => handleFieldChange({ title: e.target.value })}
              onBlur={(e) => handleFieldChange({ title: e.target.value })}
            />
          </div>
          <button className="close-btn" type="button" onClick={onClose}>
            &times;
          </button>
        </div>

        {errorMsg ? <div className="error-banner">{errorMsg}</div> : null}
        {successMsg ? <div className="success-banner">{successMsg}</div> : null}

        <div className="drawer-body-grid">
          {/* Main Info (Left Column) */}
          <div className="drawer-main-content">
            {/* Description */}
            <div className="drawer-section">
              <h4>Description</h4>
              <textarea
                className="drawer-desc-textarea"
                value={todo.description}
                onChange={(e) => setTodo({ ...todo, description: e.target.value })}
                onBlur={(e) => handleFieldChange({ description: e.target.value })}
                placeholder="Add detail description for this task..."
              />
            </div>

            {/* Simulated Attachment Upload */}
            <div className="drawer-section">
              <div className="section-heading">
                <h4>Attachments</h4>
                <button
                  type="button"
                  className="secondary-sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  {uploading ? 'Adding...' : 'Attach File'}
                </button>
                <input
                  type="file"
                  ref={fileInputRef}
                  style={{ display: 'none' }}
                  onChange={handleFileUploadSimulated}
                />
              </div>

              <div className="attachments-list">
                {attachments.map((attach) => (
                  <div key={attach.id} className="attachment-item">
                    <div className="attach-meta">
                      <span className="attach-name">{attach.fileName}</span>
                      <span className="attach-info">
                        ({formatBytes(attach.fileSize)}) • Uploaded by {attach.uploader?.name || 'User'}
                      </span>
                    </div>
                    <div className="attach-actions">
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
                        className="attach-link"
                      >
                        Download
                      </a>
                      {(attach.uploadedByUserId === currentUser.id ||
                        teamRole === 'OWNER' ||
                        teamRole === 'ADMIN') && (
                        <button
                          type="button"
                          onClick={() => handleDeleteAttachment(attach.id)}
                          className="delete-btn-sm"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                {attachments.length === 0 && (
                  <p className="empty-section-text">No attachments linked to this task.</p>
                )}
              </div>
            </div>

            {/* Comments discussions thread */}
            <div className="drawer-section">
              <h4>Discussions</h4>
              <div className="comments-thread">
                {comments.map((comm) => (
                  <div key={comm.id} className="comment-bubble">
                    <div className="comment-header">
                      <span className="comment-author">{comm.user?.name || 'User'}</span>
                      <span className="comment-time">
                        {new Date(comm.createdAt).toLocaleString()}
                      </span>
                    </div>
                    {editingCommentId === comm.id ? (
                      <div className="comment-edit-box">
                        <textarea
                          className="comment-edit-textarea"
                          value={editingCommentText}
                          onChange={(e) => setEditingCommentText(e.target.value)}
                        />
                        <div className="comment-edit-actions">
                          <button
                            type="button"
                            className="primary-sm"
                            onClick={() => handleEditComment(comm.id)}
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            className="secondary-sm"
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
                      <p className="comment-body">{comm.message}</p>
                    )}
                    {comm.userId === currentUser.id && editingCommentId !== comm.id && (
                      <div className="comment-actions">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingCommentId(comm.id)
                            setEditingCommentText(comm.message)
                          }}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="delete-comment-btn"
                          onClick={() => handleDeleteComment(comm.id)}
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                ))}
                {comments.length === 0 && (
                  <p className="empty-section-text" style={{ marginBottom: '1rem' }}>
                    No messages. Start the discussion below.
                  </p>
                )}
              </div>

              <form onSubmit={handleAddComment} className="comment-form">
                <input
                  type="text"
                  placeholder="Ask a question or post progress updates..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                />
                <button type="submit">Send</button>
              </form>
            </div>
          </div>

          {/* Sidebar Attributes (Right Column) */}
          <div className="drawer-sidebar-attributes">
            {/* Status Selector */}
            <div className="attr-group">
              <label>Status</label>
              <select
                value={todo.status}
                onChange={(e) => handleFieldChange({ status: e.target.value as TaskStatus })}
              >
                <option value="TODO">To Do</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="IN_REVIEW">In Review</option>
                <option value="DONE">Done</option>
              </select>
            </div>

            {/* Review Workflow Approve/Reject Panel */}
            {todo.status === 'IN_REVIEW' && (
              <div className="review-workflow-panel">
                <h5>Review Workflow</h5>
                {teamRole === 'OWNER' || teamRole === 'ADMIN' ? (
                  <div className="review-actions">
                    <button
                      type="button"
                      className="approve-btn"
                      onClick={() => handleFieldChange({ status: 'DONE' })}
                    >
                      Approve Review
                    </button>
                    <button
                      type="button"
                      className="reject-btn"
                      onClick={() => handleFieldChange({ status: 'IN_PROGRESS' })}
                    >
                      Reject Review
                    </button>
                  </div>
                ) : (
                  <div className="review-badge-waiting">Waiting for Review</div>
                )}
              </div>
            )}

            {/* Priority Selector */}
            <div className="attr-group">
              <label>Priority</label>
              <select
                value={todo.priority}
                onChange={(e) => handleFieldChange({ priority: e.target.value as TaskPriority })}
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent</option>
              </select>
            </div>

            {/* Assignee Selector */}
            {todo.teamId && (
              <div className="attr-group">
                <label>Assignee</label>
                <select
                  value={todo.assignedToUserId || ''}
                  onChange={(e) => {
                    const val = e.target.value ? e.target.value : null
                    handleFieldChange({ assignedToUserId: val })
                  }}
                  disabled={teamRole === 'MEMBER' && todo.assignedToUserId !== currentUser.id}
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
            <div className="attr-group">
              <label>Start Date</label>
              <input
                type="date"
                value={todo.startDate ? todo.startDate.split('T')[0] : ''}
                onChange={(e) => handleDateChange(e.target.value ? e.target.value : null, todo.dueDate || null)}
              />
            </div>

            {/* Due Date */}
            <div className="attr-group">
              <label>Due Date</label>
              <input
                type="date"
                value={todo.dueDate ? todo.dueDate.split('T')[0] : ''}
                onChange={(e) => handleDateChange(todo.startDate || null, e.target.value ? e.target.value : null)}
              />
              <span className="due-date-friendly">
                ({formatFriendlyDate(todo.dueDate)})
              </span>
            </div>

            {/* Estimated Hours */}
            <div className="attr-group">
              <label>Estimated Effort (Hours)</label>
              <input
                type="number"
                min="0"
                value={todo.estimatedHours ?? ''}
                onChange={(e) =>
                  handleFieldChange({
                    estimatedHours: e.target.value ? parseInt(e.target.value, 10) : null,
                  })
                }
              />
            </div>

            {/* Timeline Audit Logs */}
            <div className="attr-group timeline-section">
              <label>Activity Logs Timeline</label>
              <div className="history-timeline">
                {histories.map((h) => (
                  <div key={h.id} className="timeline-event">
                    <span className="timeline-dot" />
                    <div className="timeline-event-content">
                      <span className="timeline-event-title">
                        {h.action.replace('_', ' ')}
                      </span>
                      <span className="timeline-event-desc">
                        {h.performer?.name || 'System'} • {new Date(h.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                ))}
                {histories.length === 0 && (
                  <p className="empty-section-text">No timeline history recorded.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
