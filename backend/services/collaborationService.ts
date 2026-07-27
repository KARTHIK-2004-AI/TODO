import { InviteService } from './inviteService';
import { TeamService } from './teamService';
import { NotificationService } from './notificationService';
import { ActivityService } from './activityService';
import { TaskService, TaskFilterOptions } from './taskService';
import { Role } from '../prisma/client';

export class CollaborationService {
  // ----------------------------------------------------
  // Team Operations
  // ----------------------------------------------------
  static async createTeam(userId: string, name: string, description?: string, purpose?: string) {
    return TeamService.createTeam(userId, name, description, purpose);
  }

  static async getTeam(userId: string, teamId: string) {
    return TeamService.getTeam(userId, teamId);
  }

  static async listMyTeams(userId: string) {
    return TeamService.listMyTeams(userId);
  }

  static async renameTeam(actingUserId: string, teamId: string, name: string) {
    return TeamService.renameTeam(actingUserId, teamId, name);
  }

  static async updateTeamRole(
    actingUserId: string,
    teamId: string,
    targetUserId: string,
    newRole: Role
  ) {
    return TeamService.updateTeamRole(actingUserId, teamId, targetUserId, newRole);
  }

  static async removeMember(actingUserId: string, teamId: string, targetUserId: string) {
    return TeamService.removeMember(actingUserId, teamId, targetUserId);
  }

  static async deleteTeam(actingUserId: string, teamId: string) {
    return TeamService.deleteTeam(actingUserId, teamId);
  }

  // ----------------------------------------------------
  // Invitation Operations
  // ----------------------------------------------------
  static async inviteMember(actingUserId: string, teamId: string, email: string) {
    return InviteService.inviteMember(actingUserId, teamId, email);
  }

  static async acceptInvitation(userId: string, token: string) {
    return InviteService.acceptInvite(userId, token);
  }

  static async rejectInvitation(userId: string, token: string) {
    return InviteService.rejectInvite(userId, token);
  }

  static async revokeInvitation(actingUserId: string, teamId: string, inviteId: string) {
    return InviteService.revokeInvite(actingUserId, teamId, inviteId);
  }

  static async getInviteDetails(token: string) {
    return InviteService.getInviteDetails(token);
  }

  // ----------------------------------------------------
  // Task/Todo Operations
  // ----------------------------------------------------
  static async getTodos(userId: string, options: TaskFilterOptions) {
    return TaskService.getTodos(userId, options);
  }

  static async getTodoById(userId: string, todoId: string) {
    return TaskService.getTodoById(userId, todoId);
  }

  static async createTodo(
    userId: string,
    data: { title: string; description?: string; teamId?: string; assignedUserId?: string }
  ) {
    return TaskService.createTodo(userId, data);
  }

  static async updateTodo(
    userId: string,
    todoId: string,
    data: { title?: string; description?: string; completed?: boolean; assignedUserId?: string | null }
  ) {
    return TaskService.updateTodo(userId, todoId, data);
  }

  static async deleteTodo(userId: string, todoId: string) {
    return TaskService.deleteTodo(userId, todoId);
  }

  // ----------------------------------------------------
  // Notification Operations
  // ----------------------------------------------------
  static async createNotification(data: {
    userId: string;
    title: string;
    message: string;
    type: string;
    metadata?: string;
  }) {
    return NotificationService.createNotification(data);
  }

  static async markNotificationAsRead(userId: string, notificationId: string) {
    return NotificationService.markAsRead(userId, notificationId);
  }

  static async markAllNotificationsAsRead(userId: string) {
    return NotificationService.markAllAsRead(userId);
  }

  static async deleteNotification(userId: string, notificationId: string) {
    return NotificationService.deleteNotification(userId, notificationId);
  }

  static async getNotifications(userId: string) {
    return NotificationService.getNotifications(userId);
  }

  static async getUnreadNotificationsCount(userId: string) {
    return NotificationService.getUnreadCount(userId);
  }

  // ----------------------------------------------------
  // Activity Timeline Operations
  // ----------------------------------------------------
  static async createActivityEvent(data: {
    teamId?: string | null;
    userId: string;
    action: string;
    entityType: string;
    entityId: string;
    metadata?: any;
  }) {
    return ActivityService.createActivityEvent(data);
  }

  static async getTimeline(userId: string, options: any) {
    return ActivityService.getTimeline(userId, options);
  }

  static async getTeamTimeline(userId: string, teamId: string, options: any) {
    return ActivityService.getTeamTimeline(userId, teamId, options);
  }
}
export default CollaborationService;
