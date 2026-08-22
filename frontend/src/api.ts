import type {
  AcceptInviteResponse,
  AccountSettings,
  LoginResponse,
  ProfileData,
  RegisterResponse,
  Team,
  TeamInvite,
  TeamMember,
  TeamRole,
  Todo,
  Notification,
  ActivityResponse,
  TaskComment,
  TaskAttachment,
} from './types'

const API_BASE_URL = '/api'

function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('authToken')
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      ...getAuthHeaders(),
      ...(init?.headers ?? {}),
    },
  })

  if (!response.ok) {
    if (response.status === 401) {
      localStorage.removeItem('authToken')
      localStorage.removeItem('authUser')
      window.dispatchEvent(new Event('auth:unauthorized'))
    }

    const errorText = await response.text()
    let errorPayload: unknown = {}

    if (errorText) {
      try {
        errorPayload = JSON.parse(errorText)
      } catch {
        errorPayload = errorText
      }
    }

    if (typeof errorPayload === 'string') {
      throw new Error(errorPayload)
    }

    const payloadObj = errorPayload as { error?: string; message?: string }
    throw new Error(payloadObj.error || payloadObj.message || 'Request failed')
  }

  const text = await response.text()
  if (!text) return {} as T

  try {
    return JSON.parse(text) as T
  } catch {
    return text as T
  }
}

export async function login(email: string, password: string): Promise<LoginResponse> {
  return request<LoginResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
}

export async function register(email: string, password: string, name: string): Promise<RegisterResponse> {
  return request<RegisterResponse>('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password, name }),
  })
}

export async function fetchTodos(
  completed?: boolean,
  search?: string,
  teamId?: string,
  priority?: string,
  status?: string,
  assigneeId?: string
): Promise<Todo[]> {
  const params = new URLSearchParams()

  if (completed !== undefined) params.set('completed', String(completed))
  if (search) params.set('search', search)
  if (teamId) params.set('teamId', teamId)
  if (priority && priority !== 'all') params.set('priority', priority)
  if (status && status !== 'all') params.set('status', status)
  if (assigneeId && assigneeId !== 'all') params.set('assigneeId', assigneeId)

  const query = params.toString()
  return request<Todo[]>(`/todos${query ? `?${query}` : ''}`)
}

export async function getTodoById(id: string): Promise<Todo> {
  return request<Todo>(`/todos/${id}`)
}

export async function createTodo(
  title: string,
  description: string,
  teamId?: string,
  assignedUserId?: string | null,
  dueDate?: string | null,
  priority?: string
): Promise<Todo> {
  const payload: Record<string, any> = { title, description }
  if (teamId) payload.teamId = teamId
  if (assignedUserId) payload.assignedUserId = assignedUserId
  if (dueDate) payload.dueDate = dueDate
  if (priority) payload.priority = priority

  return request<Todo>('/todos', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function updateTodo(id: string, payload: Partial<Todo>): Promise<Todo> {
  return request<Todo>(`/todos/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}

export async function deleteTodo(id: string): Promise<{ message: string }> {
  return request<{ message: string }>(`/todos/${id}`, {
    method: 'DELETE',
  })
}

export async function getProfile(): Promise<ProfileData> {
  return request<ProfileData>('/profile')
}

export async function updateProfile(payload: Partial<ProfileData>): Promise<ProfileData> {
  return request<ProfileData>('/profile', {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}

export async function changePassword(currentPassword: string, newPassword: string): Promise<{ message: string }> {
  return request<{ message: string }>('/change-password', {
    method: 'PUT',
    body: JSON.stringify({ currentPassword, newPassword }),
  })
}

export async function fetchAccountSettings(): Promise<AccountSettings> {
  return request<AccountSettings>('/account/settings')
}

export async function updateAccountSettings(payload: AccountSettings): Promise<AccountSettings> {
  return request<AccountSettings>('/account/settings', {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}

export async function deleteAccount(password?: string): Promise<{ message: string }> {
  return request<{ message: string }>('/account', {
    method: 'DELETE',
    ...(password ? { body: JSON.stringify({ password }) } : {}),
  })
}

export async function createTeam(name: string, description?: string, purpose?: string): Promise<Team> {
  return request<Team>('/teams', {
    method: 'POST',
    body: JSON.stringify({ name, description, purpose }),
  })
}

export async function fetchMyTeams(): Promise<Team[]> {
  return request<Team[]>('/teams')
}

export async function fetchTeamDetails(teamId: string): Promise<Team> {
  return request<Team>(`/teams/${teamId}`)
}

export async function renameTeam(teamId: string, name: string): Promise<Team> {
  return request<Team>(`/teams/${teamId}`, {
    method: 'PUT',
    body: JSON.stringify({ name }),
  })
}

export async function deleteTeam(teamId: string): Promise<{ message: string }> {
  return request<{ message: string }>(`/teams/${teamId}`, {
    method: 'DELETE',
  })
}

export async function inviteTeamMember(teamId: string, email: string): Promise<TeamInvite> {
  return request<TeamInvite>(`/teams/${teamId}/invites`, {
    method: 'POST',
    body: JSON.stringify({ email }),
  })
}

export async function revokeTeamInvite(teamId: string, inviteId: string): Promise<{ message: string }> {
  return request<{ message: string }>(`/teams/${teamId}/invites/${inviteId}`, {
    method: 'DELETE',
  })
}

export async function acceptTeamInvite(token: string): Promise<AcceptInviteResponse> {
  return request<AcceptInviteResponse>(`/invites/${token}/accept`, {
    method: 'POST',
  })
}

export async function rejectTeamInvite(token: string): Promise<{ message: string }> {
  return request<{ message: string }>(`/invites/${token}/reject`, {
    method: 'POST',
  })
}

export interface InviteDetails {
  id: string
  teamId: string
  teamName: string
  ownerName: string
  description: string
  purpose: string
  invitedBy: string
  members: Array<{
    id: string
    userId: string
    name: string
    role: TeamRole
    avatarUrl: string
  }>
  tasksCount: number
  recentActivity: Array<{
    id: string
    action: string
    userName: string
    createdAt: string
    metadata: any
  }>
  invitationDate: string
  expiresAt: string
  status: string
}

export async function fetchInviteDetails(token: string): Promise<InviteDetails> {
  return request<InviteDetails>(`/invites/${token}`)
}

export async function updateTeamMemberRole(teamId: string, userId: string, role: TeamRole): Promise<TeamMember> {
  return request<TeamMember>(`/teams/${teamId}/members/${userId}/role`, {
    method: 'PUT',
    body: JSON.stringify({ role }),
  })
}

export async function removeTeamMember(teamId: string, userId: string): Promise<{ message: string }> {
  return request<{ message: string }>(`/teams/${teamId}/members/${userId}`, {
    method: 'DELETE',
  })
}

export async function fetchNotifications(): Promise<Notification[]> {
  return request<Notification[]>('/notifications')
}

export async function fetchUnreadCount(): Promise<{ count: number }> {
  return request<{ count: number }>('/notifications/unread-count')
}

export async function markNotificationRead(id: string): Promise<Notification> {
  return request<Notification>(`/notifications/${id}/read`, {
    method: 'PUT',
  })
}

export async function markAllNotificationsRead(): Promise<{ message: string }> {
  return request<{ message: string }>('/notifications/read-all', {
    method: 'PUT',
  })
}

export async function deleteNotification(id: string): Promise<{ message: string }> {
  return request<{ message: string }>(`/notifications/${id}`, {
    method: 'DELETE',
  })
}

export async function fetchActivity(page = 1, limit = 10, type?: string): Promise<ActivityResponse> {
  const params = new URLSearchParams()
  params.set('page', String(page))
  params.set('limit', String(limit))
  if (type) params.set('type', type)
  return request<ActivityResponse>(`/activity?${params.toString()}`)
}

export async function fetchTeamActivity(teamId: string, page = 1, limit = 10, type?: string): Promise<ActivityResponse> {
  const params = new URLSearchParams()
  params.set('page', String(page))
  params.set('limit', String(limit))
  if (type) params.set('type', type)
  return request<ActivityResponse>(`/teams/${teamId}/activity?${params.toString()}`)
}

// Sprint 5 API additions
export async function fetchComments(taskId: string): Promise<TaskComment[]> {
  return request<TaskComment[]>(`/todos/${taskId}/comments`)
}

export async function addComment(taskId: string, message: string): Promise<TaskComment> {
  return request<TaskComment>(`/todos/${taskId}/comments`, {
    method: 'POST',
    body: JSON.stringify({ message }),
  })
}

export async function updateComment(commentId: string, message: string): Promise<TaskComment> {
  return request<TaskComment>(`/comments/${commentId}`, {
    method: 'PUT',
    body: JSON.stringify({ message }),
  })
}

export async function deleteComment(commentId: string): Promise<{ message: string }> {
  return request<{ message: string }>(`/comments/${commentId}`, {
    method: 'DELETE',
  })
}

export async function markCommentsAsRead(taskId: string): Promise<{ message: string; commentIds: string[] }> {
  return request<{ message: string; commentIds: string[] }>(`/todos/${taskId}/comments/read`, {
    method: 'POST',
  })
}

export async function fetchAttachments(taskId: string): Promise<TaskAttachment[]> {
  return request<TaskAttachment[]>(`/todos/${taskId}/attachments`)
}

export async function addAttachment(
  taskId: string,
  data: { fileName: string; fileType: string; fileSize: number; storagePath: string; isImportant?: boolean }
): Promise<TaskAttachment> {
  return request<TaskAttachment>(`/todos/${taskId}/attachments`, {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function deleteAttachment(attachmentId: string): Promise<{ message: string }> {
  return request<{ message: string }>(`/attachments/${attachmentId}`, {
    method: 'DELETE',
  })
}

export async function assignTask(taskId: string, assignedToUserId: string): Promise<Todo> {
  return request<Todo>(`/todos/${taskId}/assign`, {
    method: 'POST',
    body: JSON.stringify({ assignedToUserId }),
  })
}

export async function unassignTask(taskId: string): Promise<Todo> {
  return request<Todo>(`/todos/${taskId}/unassign`, {
    method: 'POST',
  })
}

export async function downloadAttachment(attachmentId: string, defaultFileName: string): Promise<void> {
  const token = localStorage.getItem('authToken')
  const response = await fetch(`${API_BASE_URL}/attachments/${attachmentId}/download`, {
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  })

  if (!response.ok) {
    throw new Error('Failed to download file')
  }

  const blob = await response.blob()
  const url = window.URL.createObjectURL(blob)

  let fileName = defaultFileName
  const disposition = response.headers.get('content-disposition')
  if (disposition && disposition.indexOf('attachment') !== -1) {
    const filenameRegex = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/
    const matches = filenameRegex.exec(disposition)
    if (matches != null && matches[1]) {
      fileName = decodeURIComponent(matches[1].replace(/['"]/g, ''))
    }
  }

  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  window.URL.revokeObjectURL(url)
}

export async function verifyEmail(token: string): Promise<{ message: string }> {
  return request<{ message: string }>(`/auth/verify?token=${encodeURIComponent(token)}`, {
    method: 'GET',
  })
}

export async function forgotPassword(email: string): Promise<{ message: string }> {
  return request<{ message: string }>('/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email }),
  })
}

export async function resetPassword(token: string, newPassword: string): Promise<{ message: string }> {
  return request<{ message: string }>('/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify({ token, password: newPassword }),
  })
}

export async function fetchChatMessages(teamId: string, page = 1, limit = 50, search?: string): Promise<{ messages: any[]; meta: any }> {
  const params = new URLSearchParams()
  params.set('page', String(page))
  params.set('limit', String(limit))
  if (search) params.set('search', search)
  return request<any>(`/teams/${teamId}/chat?${params.toString()}`)
}

export async function postChatMessage(teamId: string, message: string, metadata?: any): Promise<any> {
  return request<any>(`/teams/${teamId}/chat`, {
    method: 'POST',
    body: JSON.stringify({ message, metadata }),
  })
}

export async function markChatRead(teamId: string): Promise<{ success: boolean }> {
  return request<{ success: boolean }>(`/teams/${teamId}/chat/read`, {
    method: 'POST',
  })
}

export async function fetchChatUnreadCounts(): Promise<Array<{ teamId: string; count: number }>> {
  return request<Array<{ teamId: string; count: number }>>('/teams/chat/unread-counts')
}

export async function updateAttachment(attachmentId: string, payload: { isImportant: boolean }): Promise<any> {
  return request<any>(`/attachments/${attachmentId}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}
