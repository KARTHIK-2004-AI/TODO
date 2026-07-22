import type { LoginResponse, RegisterResponse, Todo } from './types'

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
    const errorPayload = await response.json().catch(() => ({}))
    throw new Error((errorPayload as { message?: string }).message || 'Request failed')
  }

  return response.json() as Promise<T>
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

export async function fetchTodos(completed?: boolean, search?: string): Promise<Todo[]> {
  const params = new URLSearchParams()

  if (completed !== undefined) params.set('completed', String(completed))
  if (search) params.set('search', search)

  const query = params.toString()
  return request<Todo[]>(`/todos${query ? `?${query}` : ''}`)
}

export async function createTodo(title: string, description: string): Promise<Todo> {
  return request<Todo>('/todos', {
    method: 'POST',
    body: JSON.stringify({ title, description }),
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
