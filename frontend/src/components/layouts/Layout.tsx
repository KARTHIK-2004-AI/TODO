import { type ReactNode, useState, useEffect } from 'react'
import type { User, WorkspaceSelection, Team } from '../../types'
import { NotificationCenter } from '../notifications/NotificationCenter'
import { Avatar } from '../shared/Avatar'
import { Dropdown } from '../shared/Dropdown'
import { Modal } from '../shared/Modal'

type ActiveView = 'tasks' | 'account' | 'calendar' | 'chat' | 'members' | 'files' | 'reports' | 'settings' | 'accept-invite'

interface LayoutProps {
  user: User | null
  activeView: ActiveView
  onViewChange: (view: ActiveView) => void
  onLogout: () => void
  children: ReactNode
  wsStatus?: 'connected' | 'disconnected' | 'reconnecting'

  // Workspace Switcher Sidebar Props
  workspace?: WorkspaceSelection
  setWorkspace?: (val: WorkspaceSelection) => void
  teams?: Team[]
  chatUnreadCounts?: Record<string, number>

  // Search Props
  query?: string
  setQuery?: (val: string) => void

  // Create Team Props
  teamForm?: { name: string; description: string; purpose: string }
  setTeamForm?: (val: any) => void
  onCreateTeam?: () => void
  teamError?: string
  teamMessage?: string
}

function NavItem({
  icon,
  label,
  isActive,
  onClick,
  badge,
}: {
  icon: React.ReactNode
  label: string
  isActive: boolean
  onClick: () => void
  badge?: number
}) {
  return (
    <button
      type="button"
      className={`sidebar-nav-item ${isActive ? 'active' : ''}`}
      onClick={onClick}
    >
      <span className="sidebar-icon">{icon}</span>
      <span className="sidebar-nav-label">{label}</span>
      {badge != null && badge > 0 && (
        <span className="sidebar-badge">{badge}</span>
      )}
    </button>
  )
}

// SVG icon primitives
const IconDashboard = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
    <rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
  </svg>
)
const IconTasks = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
  </svg>
)
const IconCalendar = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
  </svg>
)
const IconChat = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
  </svg>
)
const IconMembers = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
  </svg>
)
const IconFiles = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" />
  </svg>
)
const IconReports = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" />
  </svg>
)
const IconSettings = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
  </svg>
)
const IconAccount = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" />
  </svg>
)

export function Layout({
  user,
  activeView,
  onViewChange,
  onLogout,
  children,
  wsStatus = 'disconnected',
  workspace = { kind: 'private' },
  setWorkspace = () => {},
  teams = [],
  chatUnreadCounts = {},
  query = '',
  setQuery = () => {},
  teamForm = { name: '', description: '', purpose: '' },
  setTeamForm = () => {},
  onCreateTeam = () => {},
  teamError = '',
  teamMessage: _teamMessage = '',
}: LayoutProps) {

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  useEffect(() => {
    const handleOpenCreateModal = () => setIsCreateModalOpen(true)
    window.addEventListener('open:create-team', handleOpenCreateModal)
    return () => window.removeEventListener('open:create-team', handleOpenCreateModal)
  }, [])

  const handleCreateTeamSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onCreateTeam()
    setIsCreateModalOpen(false)
  }

  // Deduplicate teams by normalized name + ID
  const uniqueTeams = Array.from(
    new Map(teams.map((t) => [t.name.trim().toLowerCase(), t])).values()
  )

  const activeWorkspaceName = workspace.kind === 'private'
    ? 'Personal Space'
    : uniqueTeams.find(t => t.id === workspace.teamId)?.name || teams.find(t => t.id === workspace.teamId)?.name || 'Team Workspace'

  const totalChatUnread = Object.values(chatUnreadCounts).reduce((a, b) => a + b, 0)
  const isTeamView = workspace.kind === 'team'

  const nav = (view: ActiveView) => () => {
    onViewChange(view)
    window.location.hash = `#/${view}`
    setIsMobileMenuOpen(false)
  }

  return (
    <div className="app-layout">
      {/* MOBILE OVERLAY */}
      {isMobileMenuOpen && (
        <div
          className="mobile-backdrop fixed inset-0 bg-black/60 z-40 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* 1. LEFT SIDEBAR */}
      {user && (
        <aside className={`sidebar ${isMobileMenuOpen ? 'mobile-open' : ''}`}>
          {/* Sidebar Top Logo */}
          <div className="sidebar-brand">
            <span className="brand-logo">C</span>
            <div>
              <h2 className="brand-name">TODO</h2>
              <span className="brand-tagline">Work Smart Together</span>
            </div>
          </div>

          {/* MAIN NAV */}
          <div className="sidebar-section">
            <h3 className="sidebar-section-title">Main</h3>
            <nav className="sidebar-nav">
              <NavItem icon={<IconDashboard />} label="Dashboard" isActive={activeView === 'tasks'} onClick={nav('tasks')} />
              <NavItem
                icon={<IconTasks />}
                label="My Tasks"
                isActive={workspace.kind === 'private' && activeView === 'tasks'}
                onClick={() => {
                  setWorkspace({ kind: 'private' })
                  onViewChange('tasks')
                  window.location.hash = '#/tasks'
                  setIsMobileMenuOpen(false)
                }}
              />
              <NavItem icon={<IconCalendar />} label="Calendar" isActive={activeView === 'calendar'} onClick={nav('calendar')} />
            </nav>
          </div>

          {/* COLLABORATION */}
          {isTeamView && (
            <div className="sidebar-section">
              <h3 className="sidebar-section-title">Team Workspace</h3>
              <nav className="sidebar-nav">
                <NavItem icon={<IconChat />} label="Team Chat" isActive={activeView === 'chat'} onClick={nav('chat')} badge={totalChatUnread} />
                <NavItem icon={<IconMembers />} label="Members & Invites" isActive={activeView === 'members'} onClick={nav('members')} />
                <NavItem icon={<IconFiles />} label="Files" isActive={activeView === 'files'} onClick={nav('files')} />
                <NavItem icon={<IconReports />} label="Reports" isActive={activeView === 'reports'} onClick={nav('reports')} />
                <NavItem icon={<IconSettings />} label="Workspace Settings" isActive={activeView === 'settings'} onClick={nav('settings')} />
              </nav>
            </div>
          )}

          {/* SETTINGS & ACCOUNT */}
          <div className="sidebar-section mt-auto">
            <h3 className="sidebar-section-title">Account</h3>
            <nav className="sidebar-nav">
              <NavItem icon={<IconAccount />} label="Account Settings" isActive={activeView === 'account'} onClick={nav('account')} />
            </nav>
          </div>

          {/* SIDEBAR FOOTER */}
          <div className="sidebar-footer">
            <Dropdown
              trigger={
                <button type="button" className="sidebar-profile-card">
                  <Avatar src={user.avatarUrl} name={user.name} size={36} />
                  <div className="profile-info">
                    <span className="profile-name truncate">{user.name}</span>
                    <span className="profile-email truncate">{user.email}</span>
                  </div>
                  <span className="profile-dropdown-arrow">▼</span>
                </button>
              }
              align="left"
              className="w-full"
            >
              <div className="profile-dropdown-menu">
                <button type="button" className="dropdown-item" onClick={nav('account')}>
                  Profile Settings
                </button>
                <div className="dropdown-divider"></div>
                <button type="button" className="dropdown-item text-primary" onClick={onLogout}>
                  Log Out
                </button>
              </div>
            </Dropdown>

            {/* Live Sync Status indicator */}
            <div className="sync-status">
              <span className={`sync-dot sync-status-${wsStatus}`}></span>
              <span className="sync-text">
                {wsStatus === 'connected' ? 'Live Sync' : wsStatus === 'reconnecting' ? 'Connecting...' : 'Offline'}
              </span>
            </div>
          </div>
        </aside>
      )}

      {/* 2. MAIN CONTAINER AREA */}
      <div className="main-viewport">
        {/* TOP NAVIGATION HEADER */}
        {user && (
          <header className="top-header">
            {/* Mobile Hamburger Toggle */}
            <button
              type="button"
              className="mobile-menu-btn md:hidden p-2 rounded-lg bg-surface border border-divider text-primary mr-2"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              title="Toggle Sidebar Menu"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>

            {/* Breadcrumbs / Workspace indicator */}
            <div className="header-breadcrumbs">
              <span className="breadcrumb-parent">Workspaces</span>
              <span className="breadcrumb-separator">/</span>
              <Dropdown
                trigger={
                  <button type="button" className="header-workspace-selector-btn">
                    <span className={`workspace-avatar ${workspace.kind === 'private' ? 'private-ws' : 'team-ws'}`}>
                      {workspace.kind === 'private' ? 'P' : activeWorkspaceName.charAt(0).toUpperCase()}
                    </span>
                    <span className="breadcrumb-current">{activeWorkspaceName}</span>
                    <span className="selector-arrow">▾</span>
                  </button>
                }
                align="left"
              >
                <div className="workspace-dropdown-menu">
                  <div className="dropdown-header">Select Workspace</div>
                  <button
                    type="button"
                    className={`dropdown-item ${workspace.kind === 'private' ? 'active' : ''}`}
                    onClick={() => {
                      setWorkspace({ kind: 'private' })
                      onViewChange('tasks')
                      window.location.hash = '#/tasks'
                    }}
                  >
                    <span className="workspace-avatar private-ws">P</span>
                    <span>Personal Space</span>
                  </button>
                  {uniqueTeams.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      className={`dropdown-item ${workspace.kind === 'team' && workspace.teamId === t.id ? 'active' : ''}`}
                      onClick={() => setWorkspace({ kind: 'team', teamId: t.id })}
                    >
                      <span className="workspace-avatar team-ws">{t.name.charAt(0).toUpperCase()}</span>
                      <span className="truncate">{t.name}</span>
                    </button>
                  ))}
                  <div className="dropdown-divider"></div>
                  <button
                    type="button"
                    className="dropdown-item text-primary font-bold"
                    onClick={() => setIsCreateModalOpen(true)}
                  >
                    + Create Workspace Team
                  </button>
                </div>
              </Dropdown>
            </div>

            {/* Search and Action items */}
            <div className="header-actions flex items-center gap-3">
              {/* Search tasks box */}
              {activeView === 'tasks' && (
                <div className="header-search-bar hidden sm:flex">
                  <span className="search-icon">🔍</span>
                  <input
                    type="text"
                    placeholder="Search tasks, projects, people..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                  <kbd className="search-shortcut">Ctrl K</kbd>
                </div>
              )}

              {/* Theme Mode Toggle Icon */}
              <button
                type="button"
                className="theme-toggle-icon-btn p-2.5 rounded-full bg-surface border border-divider text-primary hover:bg-hover transition-colors"
                title="Toggle Theme Mode"
                onClick={() => {
                  const isDark = document.documentElement.getAttribute('data-theme') === 'dark'
                  if (isDark) {
                    document.documentElement.removeAttribute('data-theme')
                  } else {
                    document.documentElement.setAttribute('data-theme', 'dark')
                  }
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                </svg>
              </button>

              {/* Notification Center */}
              <NotificationCenter />
            </div>
          </header>
        )}

        {/* PAGE CONTENT CONTAINER */}
        <main className={`page-content ${!user ? 'auth-view' : ''}`}>
          {children}
        </main>
      </div>

      {/* CREATE WORKSPACE TEAM MODAL */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Create New Workspace Team"
      >
        <form onSubmit={handleCreateTeamSubmit} className="flex flex-col gap-4">
          <div>
            <label className="text-xs font-bold text-secondary uppercase tracking-wider block mb-1">
              Workspace Team Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Operations Team, Marketing Hub"
              value={teamForm.name}
              onChange={(e) => setTeamForm({ ...teamForm, name: e.target.value })}
              className="form-field w-full text-sm p-3 border border-divider rounded-xl"
              autoFocus
            />
          </div>

          <div>
            <label className="text-xs font-bold text-secondary uppercase tracking-wider block mb-1">
              Description (Optional)
            </label>
            <textarea
              placeholder="Brief description of what this team workspace manages..."
              value={teamForm.description}
              onChange={(e) => setTeamForm({ ...teamForm, description: e.target.value })}
              className="form-field w-full text-sm p-3 border border-divider rounded-xl min-h-[80px]"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-secondary uppercase tracking-wider block mb-1">
              Purpose / Goal (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Q3 Deliverables, Customer Support"
              value={teamForm.purpose}
              onChange={(e) => setTeamForm({ ...teamForm, purpose: e.target.value })}
              className="form-field w-full text-sm p-3 border border-divider rounded-xl"
            />
          </div>

          {teamError && <p className="text-xs text-danger font-medium mt-1">{teamError}</p>}

          <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-divider">
            <button
              type="button"
              className="btn-secondary text-xs px-4 py-2 rounded-xl"
              onClick={() => setIsCreateModalOpen(false)}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary text-xs px-5 py-2 rounded-xl font-bold"
            >
              Create Workspace
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
