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

export async function fetchTodos(completed?: boolean, search?: string, teamId?: string): Promise<Todo[]> {
  const params = new URLSearchParams()

  if (completed !== undefined) params.set('completed', String(completed))
  if (search) params.set('search', search)
  if (teamId) params.set('teamId', teamId)

  const query = params.toString()
  return request<Todo[]>(`/todos${query ? `?${query}` : ''}`)
}

export async function getTodoById(id: string): Promise<Todo> {
  return request<Todo>(`/todos/${id}`)
}

export async function createTodo(title: string, description: string, teamId?: string): Promise<Todo> {
  const payload: { title: string; description: string; teamId?: string } = { title, description }
  if (teamId) payload.teamId = teamId

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

export async function createTeam(name: string): Promise<Team> {
  return request<Team>('/teams', {
    method: 'POST',
    body: JSON.stringify({ name }),
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
