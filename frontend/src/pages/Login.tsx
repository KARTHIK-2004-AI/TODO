import { type FormEvent } from 'react'
import type { AuthMode } from '../types'

interface LoginProps {
  authMode: AuthMode
  setAuthMode: (val: AuthMode) => void
  authForm: { email: string; password?: string; name?: string }
  setAuthForm: (val: { email: string; password?: string; name?: string } | ((prev: { email: string; password?: string; name?: string }) => { email: string; password?: string; name?: string })) => void
  authError: string
  setAuthError: (val: string) => void
  loading: boolean
  onLogin: () => Promise<unknown>
  onRegister: () => Promise<unknown>
  onSuccess: () => void
}

export function Login({
  authMode,
  setAuthMode,
  authForm,
  setAuthForm,
  authError,
  setAuthError,
  loading,
  onLogin,
  onRegister,
  onSuccess,
}: LoginProps) {
  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    try {
      if (authMode === 'register') {
        await onRegister()
      } else {
        await onLogin()
      }
      onSuccess()
    } catch {
      // Error is set in the hooks
    }
  }

  return (
    <form className="auth-form" onSubmit={handleSubmit}>
      <div className="field-group">
        <label htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          required
          value={authForm.email}
          onChange={(event) => setAuthForm({ ...authForm, email: event.target.value })}
        />
      </div>
      <div className="field-group">
        <label htmlFor="password">Password</label>
        <input
          id="password"
          type="password"
          required
          minLength={8}
          value={authForm.password || ''}
          onChange={(event) => setAuthForm({ ...authForm, password: event.target.value })}
        />
      </div>
      {authMode === 'register' && (
        <div className="field-group">
          <label htmlFor="name">Name</label>
          <input
            id="name"
            type="text"
            required
            value={authForm.name || ''}
            onChange={(event) => setAuthForm({ ...authForm, name: event.target.value })}
          />
        </div>
      )}
      {authError ? <p className="error-text">{authError}</p> : null}
      <button type="submit" disabled={loading}>
        {loading ? 'Please wait…' : authMode === 'login' ? 'Log in' : 'Create account'}
      </button>
      <button
        type="button"
        className="secondary"
        onClick={() => {
          setAuthMode(authMode === 'login' ? 'register' : 'login')
          setAuthError('')
        }}
      >
        {authMode === 'login' ? 'Need an account?' : 'Back to login'}
      </button>
    </form>
  )
}
export default Login
