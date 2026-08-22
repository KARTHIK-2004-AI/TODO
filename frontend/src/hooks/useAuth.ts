import { useState } from 'react'
import { login, register } from '../api'
import type { AuthMode, User } from '../types'

export function useAuth(onLogoutCallback?: () => void) {
  const [authMode, setAuthMode] = useState<AuthMode>('login')
  const [authForm, setAuthForm] = useState<{ email: string; password?: string; name?: string }>({
    email: '',
    password: '',
    name: '',
  })
  const [authError, setAuthError] = useState('')
  const [loading, setLoading] = useState(false)
  const [user, setUser] = useState<User | null>(() => {
    const storedUser = localStorage.getItem('authUser') || sessionStorage.getItem('authUser')
    const storedToken = localStorage.getItem('authToken') || sessionStorage.getItem('authToken')
    if (storedUser && storedToken) {
      try {
        return JSON.parse(storedUser) as User
      } catch {
        return null
      }
    }
    return null
  })

  async function handleLogin(rememberMe = true) {
    setLoading(true)
    setAuthError('')
    try {
      const response = await login(authForm.email, authForm.password || '')
      const storage = rememberMe ? localStorage : sessionStorage
      storage.setItem('authToken', response.token)
      storage.setItem('authUser', JSON.stringify(response.user))
      setUser(response.user)
      setAuthForm({ email: '', password: '', name: '' })
      return response.user
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Authentication failed')
      throw error
    } finally {
      setLoading(false)
    }
  }

  async function handleRegister() {
    setLoading(true)
    setAuthError('')
    try {
      const email = authForm.email
      const password = authForm.password || ''
      const name = authForm.name || ''
      const res = await register(email, password, name)
      if (import.meta.env.DEV) {
        const loginRes = await login(email, password)
        localStorage.setItem('authToken', loginRes.token)
        localStorage.setItem('authUser', JSON.stringify(loginRes.user))
        setUser(loginRes.user)
        setAuthForm({ email: '', password: '', name: '' })
        return loginRes.user
      } else {
        setAuthForm({ email: '', password: '', name: '' })
        return res
      }
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Registration failed')
      throw error
    } finally {
      setLoading(false)
    }
  }

  function handleLogout() {
    localStorage.removeItem('authToken')
    localStorage.removeItem('authUser')
    sessionStorage.removeItem('authToken')
    sessionStorage.removeItem('authUser')
    setUser(null)
    if (onLogoutCallback) {
      onLogoutCallback()
    }
  }

  return {
    authMode,
    setAuthMode,
    authForm,
    setAuthForm,
    authError,
    setAuthError,
    user,
    setUser,
    loading,
    handleLogin,
    handleRegister,
    handleLogout,
  }
}
