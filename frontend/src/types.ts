export type AuthMode = 'login' | 'register'

export type TeamRole = 'OWNER' | 'ADMIN' | 'MEMBER'
export type InviteStatus = 'PENDING' | 'ACCEPTED' | 'EXPIRED' | 'REVOKED' | 'REJECTED'

export interface User {
  id: string
  email: string
  name: string
  avatarUrl?: string
  isOnline?: boolean
  lastSeen?: string | null
}

export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE'

export interface TaskComment {
  id: string
  taskId: string
  userId: string
  message: string
  createdAt: string
  updatedAt: string
  user: User
  readStatuses?: Array<{
    commentId: string
    userId: string
    viewedAt: string
    user: { id: string; name: string }
  }>
}

export interface TaskAttachment {
  id: string
  taskId: string
  uploadedByUserId: string
  fileName: string
  fileType: string
  fileSize: number
  storagePath: string
  createdAt: string
  uploader: User
  isImportant?: boolean
}

export interface TaskHistory {
  id: string
  taskId: string
  performedBy: string
  action: string
  previousValue: string | null
  newValue: string | null
  createdAt: string
  performer: User
}

export interface Todo {
  id: string
  title: string
  description: string
  completed: boolean
  userId: string
  teamId?: string | null
  assignedToUserId?: string | null
  assignedUserId?: string | null // compatibility
  priority: TaskPriority
  status: TaskStatus
  startDate?: string | null
  dueDate?: string | null
  estimatedHours?: number | null
  completedAt?: string | null
  comments?: TaskComment[]
  attachments?: TaskAttachment[]
  histories?: TaskHistory[]
  archived?: boolean
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
  description?: string
  purpose?: string
  ownerId: string
  createdAt: string
  members?: TeamMember[]
  invites?: TeamInvite[]
  myRole?: TeamRole
  joinedAt?: string
  memberCount?: number
  stats?: {
    memberCount: number
    onlineMemberCount: number
    totalTasks: number
    completedTasks: number
    pendingTasks: number
  }
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

export type NotificationType =
  | 'TODO_CREATED'
  | 'TODO_COMPLETED'
  | 'TODO_UPDATED'
  | 'TODO_DELETED'
  | 'TEAM_RENAMED'
  | 'TEAM_DELETED'
  | 'TEAM_INVITE_RECEIVED'
  | 'TEAM_INVITE_ACCEPTED'
  | 'TEAM_MEMBER_REMOVED'
  | 'TEAM_ROLE_UPDATED'

export interface Notification {
  id: string
  userId: string
  title: string
  message: string
  type: NotificationType | string
  isRead: boolean
  metadata?: string | null
  createdAt: string
}

export interface ActivityLog {
  id: string
  teamId?: string | null
  userId: string
  action: string
  entityType: string
  entityId: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  metadata: any
  createdAt: string
  user?: User
}

export interface ActivityMeta {
  page: number
  limit: number
  totalCount: number
  totalPages: number
}

export interface ActivityResponse {
  data: ActivityLog[]
  meta: ActivityMeta
}

export type WorkspaceSelection =
  | { kind: 'private' }
  | { kind: 'team'; teamId: string }

export type InviteRoute =
  | { kind: 'tasks' }
  | { kind: 'account' }
  | { kind: 'accept-invite'; token?: string }
  | { kind: 'verify'; token?: string }
  | { kind: 'reset-password'; token?: string }
