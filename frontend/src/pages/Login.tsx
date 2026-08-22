import { useState, type FormEvent, useEffect } from 'react'
import type { AuthMode, InviteRoute } from '../types'
import { verifyEmail, forgotPassword, resetPassword } from '../api'

interface LoginProps {
  authMode: AuthMode
  setAuthMode: (val: AuthMode) => void
  authForm: { email: string; password?: string; name?: string }
  setAuthForm: (val: { email: string; password?: string; name?: string } | ((prev: { email: string; password?: string; name?: string }) => { email: string; password?: string; name?: string })) => void
  authError: string
  setAuthError: (val: string) => void
  loading: boolean
  onLogin: (rememberMe: boolean) => Promise<unknown>
  onRegister: () => Promise<unknown>
  onSuccess: () => void
  route?: InviteRoute
  setRoute?: (val: InviteRoute) => void
}

type ExtendedMode = AuthMode | 'forgot-password' | 'reset-password' | 'success-verify-sent' | 'success-reset-sent' | 'verifying-email' | 'verified-success'

export function Login({
  authMode: initialAuthMode,
  setAuthMode: _setAuthMode,
  authForm,
  setAuthForm,
  authError,
  setAuthError,
  loading: authLoading,
  onLogin,
  onRegister,
  onSuccess,
  route,
  setRoute,
}: LoginProps) {
  const [mode, setMode] = useState<ExtendedMode>(initialAuthMode)
  const [confirmPassword, setConfirmPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(true)
  const [loading, setLoading] = useState(false)
  const [successEmail, setSuccessEmail] = useState('')

  // Password reset fields
  const [resetToken, setResetToken] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmResetPassword, setConfirmResetPassword] = useState('')

  // Synchronize route kinds
  useEffect(() => {
    if (route) {
      if (route.kind === 'verify' && route.token) {
        setMode('verifying-email')
        void handleVerifyEmailToken(route.token)
      } else if (route.kind === 'reset-password' && route.token) {
        setMode('reset-password')
        setResetToken(route.token)
      } else if (route.kind === 'tasks') {
        setMode('login')
      }
    }
  }, [route])

  // Email verification trigger
  const handleVerifyEmailToken = async (token: string) => {
    setLoading(true)
    setAuthError('')
    try {
      await verifyEmail(token)
      setMode('verified-success')
      if (setRoute) setRoute({ kind: 'tasks' })
      window.location.hash = '#/tasks'
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Email verification failed')
      setMode('login')
    } finally {
      setLoading(false)
    }
  }

  // Calculate password strength score (0 to 5)
  const calculateStrength = (password: string) => {
    let score = 0
    if (!password) return score
    if (password.length >= 8) score++
    if (/[A-Z]/.test(password)) score++
    if (/[a-z]/.test(password)) score++
    if (/[0-9]/.test(password)) score++
    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score++
    return score
  }

  const getStrengthLabel = (score: number) => {
    if (score === 0) return { label: 'None', color: '#e5e7eb', width: '0%' }
    if (score <= 2) return { label: 'Weak', color: '#ef4444', width: '33%' }
    if (score <= 4) return { label: 'Medium', color: '#f59e0b', width: '66%' }
    return { label: 'Strong', color: '#10b981', width: '100%' }
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setAuthError('')
    try {
      if (mode === 'register') {
        if (authForm.password !== confirmPassword) {
          setAuthError('Passwords do not match')
          return
        }
        if (calculateStrength(authForm.password || '') < 3) {
          setAuthError('Please choose a stronger password')
          return
        }
        setSuccessEmail(authForm.email)
        await onRegister()
        if (import.meta.env.DEV) {
          onSuccess()
        } else {
          setMode('success-verify-sent')
        }
      } else if (mode === 'login') {
        await onLogin(rememberMe)
        onSuccess()
      } else if (mode === 'forgot-password') {
        setLoading(true)
        setSuccessEmail(authForm.email)
        await forgotPassword(authForm.email)
        setMode('success-reset-sent')
      } else if (mode === 'reset-password') {
        if (newPassword !== confirmResetPassword) {
          setAuthError('Passwords do not match')
          return
        }
        if (calculateStrength(newPassword) < 3) {
          setAuthError('Please choose a stronger password')
          return
        }
        setLoading(true)
        await resetPassword(resetToken, newPassword)
        setMode('verified-success')
        // Clean hash URL
        if (setRoute) setRoute({ kind: 'tasks' })
        window.location.hash = '#/tasks'
      }
    } catch (err) {
      if (err instanceof Error) {
        setAuthError(err.message)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleModeChange = (newMode: ExtendedMode) => {
    setMode(newMode)
    setAuthError('')
    setConfirmPassword('')
    setNewPassword('')
    setConfirmResetPassword('')
  }

  const strength = calculateStrength(mode === 'reset-password' ? newPassword : (authForm.password || ''))
  const strengthDetails = getStrengthLabel(strength)

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-logo">
          <svg className="logo-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2L2 7L12 12L22 7L12 2Z" fill="url(#grad1)" />
            <path d="M2 17L12 22L22 17" stroke="url(#grad2)" strokeWidth="2" strokeLinecap="round" />
            <path d="M2 12L12 17L22 12" stroke="url(#grad2)" strokeWidth="2" strokeLinecap="round" />
            <defs>
              <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#818cf8" />
                <stop offset="100%" stopColor="#4f46e5" />
              </linearGradient>
              <linearGradient id="grad2" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#c084fc" />
                <stop offset="100%" stopColor="#818cf8" />
              </linearGradient>
            </defs>
          </svg>
          <h2>Antigravity</h2>
          <p className="auth-subtitle">Productive workspace for teams</p>
        </div>

        {mode === 'verifying-email' ? (
          <div className="auth-status-panel">
            <div className="spinner"></div>
            <p className="status-text">Verifying your email address...</p>
          </div>
        ) : mode === 'success-verify-sent' ? (
          <div className="auth-status-panel">
            <div className="success-icon">✓</div>
            <h3>Check Your Email</h3>
            <p className="status-desc">
              We sent a verification link to <strong>{successEmail}</strong>. Please check your inbox and verify your account to log in.
            </p>
            <button className="btn-primary w-full mt-6" onClick={() => handleModeChange('login')}>
              Back to Login
            </button>
          </div>
        ) : mode === 'success-reset-sent' ? (
          <div className="auth-status-panel">
            <div className="success-icon">✓</div>
            <h3>Email Sent</h3>
            <p className="status-desc">
              If an account is associated with <strong>{successEmail}</strong>, we have sent password reset instructions.
            </p>
            <button className="btn-primary w-full mt-6" onClick={() => handleModeChange('login')}>
              Back to Login
            </button>
          </div>
        ) : mode === 'verified-success' ? (
          <div className="auth-status-panel">
            <div className="success-icon">✓</div>
            <h3>Success!</h3>
            <p className="status-desc">
              Your account has been set up successfully. You can now log in with your credentials.
            </p>
            <button className="btn-primary w-full mt-6" onClick={() => handleModeChange('login')}>
              Log In Now
            </button>
          </div>
        ) : (
          <form className="auth-form" onSubmit={handleSubmit}>
            {mode === 'register' && (
              <div className="field-group">
                <label htmlFor="name">Full Name</label>
                <input
                  id="name"
                  type="text"
                  required
                  placeholder="John Doe"
                  value={authForm.name || ''}
                  onChange={(event) => setAuthForm({ ...authForm, name: event.target.value })}
                />
              </div>
            )}

            {mode !== 'reset-password' && (
              <div className="field-group">
                <label htmlFor="email">Email Address</label>
                <input
                  id="email"
                  type="email"
                  required
                  placeholder="name@company.com"
                  value={authForm.email}
                  onChange={(event) => setAuthForm({ ...authForm, email: event.target.value })}
                />
              </div>
            )}

            {mode === 'login' && (
              <div className="field-group">
                <div className="label-row">
                  <label htmlFor="password">Password</label>
                  <button type="button" className="link-btn" onClick={() => handleModeChange('forgot-password')}>
                    Forgot Password?
                  </button>
                </div>
                <input
                  id="password"
                  type="password"
                  required
                  placeholder="••••••••"
                  value={authForm.password || ''}
                  onChange={(event) => setAuthForm({ ...authForm, password: event.target.value })}
                />
              </div>
            )}

            {mode === 'register' && (
              <>
                <div className="field-group">
                  <label htmlFor="password">Password</label>
                  <input
                    id="password"
                    type="password"
                    required
                    placeholder="Create password"
                    minLength={8}
                    value={authForm.password || ''}
                    onChange={(event) => setAuthForm({ ...authForm, password: event.target.value })}
                  />
                  {authForm.password && (
                    <div className="password-strength-container">
                      <div className="strength-bar-bg">
                        <div
                          className="strength-bar"
                          style={{
                            width: strengthDetails.width,
                            backgroundColor: strengthDetails.color,
                          }}
                        ></div>
                      </div>
                      <span className="strength-label" style={{ color: strengthDetails.color }}>
                        Password Strength: {strengthDetails.label}
                      </span>
                    </div>
                  )}
                </div>
                <div className="field-group">
                  <label htmlFor="confirmPassword">Confirm Password</label>
                  <input
                    id="confirmPassword"
                    type="password"
                    required
                    placeholder="Verify password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                  />
                </div>
              </>
            )}

            {mode === 'reset-password' && (
              <>
                <div className="field-group">
                  <label htmlFor="newPassword">New Password</label>
                  <input
                    id="newPassword"
                    type="password"
                    required
                    placeholder="New password"
                    minLength={8}
                    value={newPassword}
                    onChange={(event) => setNewPassword(event.target.value)}
                  />
                  {newPassword && (
                    <div className="password-strength-container">
                      <div className="strength-bar-bg">
                        <div
                          className="strength-bar"
                          style={{
                            width: strengthDetails.width,
                            backgroundColor: strengthDetails.color,
                          }}
                        ></div>
                      </div>
                      <span className="strength-label" style={{ color: strengthDetails.color }}>
                        Password Strength: {strengthDetails.label}
                      </span>
                    </div>
                  )}
                </div>
                <div className="field-group">
                  <label htmlFor="confirmResetPassword">Confirm New Password</label>
                  <input
                    id="confirmResetPassword"
                    type="password"
                    required
                    placeholder="Confirm new password"
                    value={confirmResetPassword}
                    onChange={(event) => setConfirmResetPassword(event.target.value)}
                  />
                </div>
              </>
            )}

            {mode === 'login' && (
              <div className="checkbox-group">
                <input
                  id="rememberMe"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(event) => setRememberMe(event.target.checked)}
                />
                <label htmlFor="rememberMe">Remember me on this device</label>
              </div>
            )}

            {authError ? (
              <div className="auth-error-banner">
                <span className="error-icon">⚠</span>
                <p className="error-text">{authError}</p>
              </div>
            ) : null}

            <button type="submit" className="btn-primary w-full mt-4" disabled={authLoading || loading}>
              {authLoading || loading ? (
                <span className="flex items-center justify-center">
                  <span className="spinner-small mr-2"></span>
                  Processing...
                </span>
              ) : mode === 'login' ? (
                'Sign In'
              ) : mode === 'register' ? (
                'Create Account'
              ) : mode === 'forgot-password' ? (
                'Send Reset Link'
              ) : (
                'Reset Password'
              )}
            </button>

            <div className="auth-footer-links">
              {mode === 'login' && (
                <p>
                  Don't have an account?{' '}
                  <button type="button" className="link-btn font-semibold" onClick={() => handleModeChange('register')}>
                    Create one for free
                  </button>
                </p>
              )}
              {mode === 'register' && (
                <p>
                  Already have an account?{' '}
                  <button type="button" className="link-btn font-semibold" onClick={() => handleModeChange('login')}>
                    Sign In
                  </button>
                </p>
              )}
              {(mode === 'forgot-password' || mode === 'reset-password') && (
                <button type="button" className="link-btn font-semibold mx-auto block mt-2" onClick={() => handleModeChange('login')}>
                  Back to Sign In
                </button>
              )}
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

export default Login
