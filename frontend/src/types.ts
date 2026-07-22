export type AuthMode = 'login' | 'register'

export interface User {
  id: string
  email: string
  name: string
}

export interface Todo {
  id: string
  title: string
  description: string
  completed: boolean
  createdAt: string
  updatedAt: string
}

export interface LoginResponse {
  token: string
  user: User
}

export interface RegisterResponse {
  message: string
  user: User
}
