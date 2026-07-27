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
    const storedUser = localStorage.getItem('authUser')
    const storedToken = localStorage.getItem('authToken')
    if (storedUser && storedToken) {
      try {
        return JSON.parse(storedUser) as User
      } catch {
        return null
      }
    }
    return null
  })

  async function handleLogin() {
    setLoading(true)
    setAuthError('')
    try {
      const response = await login(authForm.email, authForm.password || '')
      localStorage.setItem('authToken', response.token)
      localStorage.setItem('authUser', JSON.stringify(response.user))
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
      await register(authForm.email, authForm.password || '', authForm.name || '')
      const response = await login(authForm.email, authForm.password || '')
      localStorage.setItem('authToken', response.token)
      localStorage.setItem('authUser', JSON.stringify(response.user))
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

  function handleLogout() {
    localStorage.removeItem('authToken')
    localStorage.removeItem('authUser')
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
