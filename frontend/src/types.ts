export type AuthMode = 'login' | 'register'

export type TeamRole = 'OWNER' | 'ADMIN' | 'MEMBER'
export type InviteStatus = 'PENDING' | 'ACCEPTED' | 'EXPIRED' | 'REVOKED'

export interface User {
  id: string
  email: string
  name: string
  avatarUrl?: string
}

export interface Todo {
  id: string
  title: string
  description: string
  completed: boolean
  userId: string
  teamId?: string | null
  createdAt: string
  updatedAt: string
}

export interface ProfileData {
  id: string
  name: string
  email: string
  bio?: string
  phoneNumber?: string
  avatarUrl?: string
  timezone?: string
  createdAt?: string
  updatedAt?: string
}

export interface AccountSettings {
  theme?: 'light' | 'dark' | 'system'
  notifications?: boolean
  emailAlerts?: boolean
  language?: string
}

export interface TeamMember {
  id: string
  teamId: string
  userId: string
  role: TeamRole
  joinedAt: string
  user?: User
}

export interface TeamInvite {
  id: string
  teamId: string
  email: string
  invitedByUserId: string
  token: string
  status: InviteStatus
  createdAt: string
  expiresAt: string
}

export interface Team {
  id: string
  name: string
  ownerId: string
  createdAt: string
  members?: TeamMember[]
  invites?: TeamInvite[]
  myRole?: TeamRole
  joinedAt?: string
  memberCount?: number
}

export interface LoginResponse {
  token: string
  user: User
}

export interface RegisterResponse {
  message: string
  user: User
}

export interface AcceptInviteResponse {
  message: string
  teamMember: TeamMember
}
