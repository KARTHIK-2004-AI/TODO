import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Login } from '../Login'

describe('Login Component', () => {
  it('renders login form with email and password inputs', () => {
    const mockSetAuthMode = vi.fn()
    const mockSetAuthForm = vi.fn()
    const mockSetAuthError = vi.fn()
    const mockOnLogin = vi.fn()
    const mockOnRegister = vi.fn()
    const mockOnSuccess = vi.fn()

    render(
      <Login
        authMode="login"
        setAuthMode={mockSetAuthMode}
        authForm={{ email: 'test@example.com' }}
        setAuthForm={mockSetAuthForm}
        authError=""
        setAuthError={mockSetAuthError}
        loading={false}
        onLogin={mockOnLogin}
        onRegister={mockOnRegister}
        onSuccess={mockOnSuccess}
      />
    )

    expect(screen.getByLabelText(/Email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Password/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Log in/i })).toBeInTheDocument()
  })

  it('renders register fields when authMode is register', () => {
    const mockSetAuthMode = vi.fn()
    const mockSetAuthForm = vi.fn()
    const mockSetAuthError = vi.fn()
    const mockOnLogin = vi.fn()
    const mockOnRegister = vi.fn()
    const mockOnSuccess = vi.fn()

    render(
      <Login
        authMode="register"
        setAuthMode={mockSetAuthMode}
        authForm={{ email: 'test@example.com', name: 'Test User' }}
        setAuthForm={mockSetAuthForm}
        authError=""
        setAuthError={mockSetAuthError}
        loading={false}
        onLogin={mockOnLogin}
        onRegister={mockOnRegister}
        onSuccess={mockOnSuccess}
      />
    )

    expect(screen.getByLabelText(/Name/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Create account/i })).toBeInTheDocument()
  })
})
