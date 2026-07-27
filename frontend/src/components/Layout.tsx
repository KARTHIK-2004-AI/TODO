import type { ReactNode } from 'react'
import type { User } from '../types'
import { NotificationCenter } from './NotificationCenter'

interface LayoutProps {
  user: User | null
  activeView: 'tasks' | 'account' | 'accept-invite' | 'activity'
  onViewChange: (view: 'tasks' | 'account' | 'activity') => void
  onLogout: () => void
  children: ReactNode
}

export function Layout({ user, activeView, onViewChange, onLogout, children }: LayoutProps) {
  return (
    <div className="app-shell">
      <header className="hero-panel">
        <div>
          <p className="eyebrow">Frontend product</p>
          <h1>Stay on top of every task</h1>
          <p className="hero-copy">
            A polished todo workspace for managing auth, creating tasks, filtering progress, and keeping the experience responsive.
          </p>
        </div>
        <div className="hero-card">
          <h2>{user ? `Welcome, ${user.name}` : 'Secure access'}</h2>
          <p>
            {user
              ? 'Switch between private work and shared team workspaces.'
              : 'Login or create an account to begin.'}
          </p>
          {user && (
            <div className="user-actions" style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <div className="view-switcher">
                <button
                  type="button"
                  className={activeView === 'tasks' ? 'active' : 'secondary'}
                  onClick={() => onViewChange('tasks')}
                >
                  Tasks
                </button>
                <button
                  type="button"
                  className={activeView === 'activity' ? 'active' : 'secondary'}
                  onClick={() => onViewChange('activity')}
                >
                  Activity
                </button>
                <button
                  type="button"
                  className={activeView === 'account' ? 'active' : 'secondary'}
                  onClick={() => onViewChange('account')}
                >
                  Account
                </button>
              </div>
              <NotificationCenter />
              <button type="button" className="secondary" onClick={onLogout}>
                Log out
              </button>
            </div>
          )}
        </div>
      </header>
      {children}
    </div>
  )
}
