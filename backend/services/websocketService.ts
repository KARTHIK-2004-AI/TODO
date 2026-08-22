import { WebSocketServer, WebSocket } from 'ws';
import http from 'http';
import jwt from 'jsonwebtoken';
import prisma from '../database/client';
import { logger } from '../middleware/logging';
import { eventEmitter } from './eventEmitter';

// JWT payload structure
interface JwtPayload {
  userId: string;
  email: string;
}

export interface AuthenticatedWebSocket extends WebSocket {
  userId?: string;
  workspaceId?: string;
  taskId?: string;
  lastHeartbeat?: { status: 'online' | 'away'; timestamp: number };
}

// Map of userId -> Set of open WebSocket connections (supports multiple tabs)
const activeConnections = new Map<string, Set<AuthenticatedWebSocket>>();

// Maps task ID -> Set of user IDs currently viewing/editing
const taskViewers = new Map<string, Set<string>>();

// Maps workspace ID -> Set of user IDs currently typing comments
const workspaceTyping = new Map<string, Set<string>>();

let wss: WebSocketServer;

export function initWebSocketServer(server: http.Server) {
  wss = new WebSocketServer({ noServer: true });

  // Periodic disconnect check sweep (disconnect detection)
  setInterval(() => {
    const now = Date.now();
    for (const ws of wss.clients) {
      const authWs = ws as AuthenticatedWebSocket;
      if (authWs.lastHeartbeat && now - authWs.lastHeartbeat.timestamp > 45000) {
        logger.info('Presence heartbeat timeout. Closing socket.');
        authWs.close();
      }
    }
  }, 10000);

  server.on('upgrade', (request, socket, head) => {
    const pathname = new URL(request.url || '', `http://${request.headers.host}`).pathname;

    if (pathname === '/socket') {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    } else {
      socket.destroy();
    }
  });

  wss.on('connection', (ws: WebSocket) => {
    const authWs = ws as AuthenticatedWebSocket;
    logger.info('WebSocket connection opened');

    authWs.on('message', async (messageStr: string) => {
      try {
        const message = JSON.parse(messageStr);
        await handleMessage(authWs, message);
      } catch (error) {
        logger.error('Error handling WebSocket message:', error);
      }
    });

    authWs.on('close', () => {
      logger.info('WebSocket connection closed');
      handleDisconnect(authWs);
    });

    authWs.on('error', (err) => {
      logger.error('WebSocket connection error:', err);
      handleDisconnect(authWs);
    });
  });
}

async function handleMessage(ws: AuthenticatedWebSocket, message: any) {
  switch (message.type) {
    case 'authenticate': {
      const { token } = message;
      if (!token) {
        ws.send(JSON.stringify({ type: 'error', message: 'Token required' }));
        return;
      }
      try {
        const secret = process.env.JWT_SECRET || 'dev-jwt-secret-key-change-in-production';
        const decoded = jwt.verify(token, secret) as JwtPayload;
        const userId = decoded.userId;

        // Register active socket connection
        ws.userId = userId;
        if (!activeConnections.has(userId)) {
          activeConnections.set(userId, new Set());
        }
        activeConnections.get(userId)!.add(ws);

        ws.send(JSON.stringify({ type: 'authenticated', userId }));
        logger.info(`WebSocket authenticated for user ${userId}`);

        // Broadcast presence change to online
        await broadcastPresence(userId, 'online');
      } catch (err) {
        ws.send(JSON.stringify({ type: 'error', message: 'Authentication failed' }));
      }
      break;
    }

    case 'join_workspace': {
      const userId = ws.userId;
      if (!userId) return;

      const { workspaceId } = message;
      if (workspaceId) {
        ws.workspaceId = workspaceId;
        logger.info(`User ${userId} joined workspace ${workspaceId}`);
      }
      break;
    }

    case 'leave_workspace': {
      delete ws.workspaceId;
      break;
    }

    case 'view_task': {
      const userId = ws.userId;
      if (!userId) return;

      const { taskId } = message;
      if (taskId) {
        ws.taskId = taskId;

        if (!taskViewers.has(taskId)) {
          taskViewers.set(taskId, new Set());
        }
        taskViewers.get(taskId)!.add(userId);

        logger.info(`User ${userId} started viewing task ${taskId}`);
        await broadcastTaskLockChange(taskId);
      }
      break;
    }

    case 'leave_task': {
      const userId = ws.userId;
      const taskId = ws.taskId;
      
      delete ws.taskId;

      if (userId && taskId && taskViewers.has(taskId)) {
        taskViewers.get(taskId)!.delete(userId);
        if (taskViewers.get(taskId)!.size === 0) {
          taskViewers.delete(taskId);
        }
        logger.info(`User ${userId} stopped viewing task ${taskId}`);
        await broadcastTaskLockChange(taskId);
      }
      break;
    }

    case 'typing': {
      const userId = ws.userId;
      if (!userId) return;

      const { workspaceId, taskId, isTyping } = message;
      if (!workspaceId || !taskId) return;

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { name: true },
      });
      const userName = user?.name || 'Someone';

      broadcastToWorkspace(workspaceId, {
        eventType: 'TYPING_UPDATED',
        workspaceId,
        userId,
        timestamp: new Date().toISOString(),
        payload: {
          taskId,
          userId,
          userName,
          isTyping,
        },
      }, ws); // Exclude the sender itself to prevent echo
      break;
    }

    case 'presence_heartbeat': {
      const userId = ws.userId;
      if (!userId) return;

      const { status } = message; // 'online' | 'away'
      const oldInfo = ws.lastHeartbeat;
      
      ws.lastHeartbeat = { status, timestamp: Date.now() };

      if (!oldInfo || oldInfo.status !== status) {
        logger.info(`User ${userId} presence status updated: ${status}`);
        await broadcastPresence(userId, status);
      }
      break;
    }

    default:
      ws.send(JSON.stringify({ type: 'error', message: 'Unknown message type' }));
  }
}

async function handleDisconnect(ws: AuthenticatedWebSocket) {
  const userId = ws.userId;
  
  // Clean up task lock viewing list
  const taskId = ws.taskId;
  if (userId && taskId && taskViewers.has(taskId)) {
    taskViewers.get(taskId)!.delete(userId);
    if (taskViewers.get(taskId)!.size === 0) {
      taskViewers.delete(taskId);
    }
    await broadcastTaskLockChange(taskId);
  }

  // Clean up user connections
  if (userId && activeConnections.has(userId)) {
    const connections = activeConnections.get(userId)!;
    connections.delete(ws);

    if (connections.size === 0) {
      activeConnections.delete(userId);
      logger.info(`User ${userId} went completely offline`);

      // Update lastSeen in database
      const now = new Date();
      await prisma.user.update({
        where: { id: userId },
        data: { lastSeen: now },
      }).catch((err) => {
        logger.error(`Failed to update lastSeen for user ${userId}:`, err);
      });

      // Broadcast offline presence
      await broadcastPresence(userId, 'offline', now);
    }
  }
}

// Broadcasters

async function broadcastPresence(userId: string, status: 'online' | 'away' | 'offline', lastSeen?: Date) {
  // Find all teams this user belongs to
  const memberships = await prisma.teamMember.findMany({
    where: { userId },
    select: { teamId: true },
  });

  const event = {
    eventType: 'PRESENCE_UPDATED',
    workspaceId: null as string | null,
    userId,
    timestamp: new Date().toISOString(),
    payload: {
      userId,
      status,
      lastSeen: lastSeen ? lastSeen.toISOString() : null,
    },
  };

  // Emit to all members of these teams
  for (const membership of memberships) {
    event.workspaceId = membership.teamId;
    broadcastToWorkspace(membership.teamId, event);
  }

  // Also emit to the user's private workspace
  event.workspaceId = 'private';
  sendToUser(userId, event);
}

async function broadcastTaskLockChange(taskId: string) {
  const todo = await prisma.todo.findUnique({
    where: { id: taskId },
    select: { teamId: true, userId: true },
  });
  if (!todo) return;

  const viewersSet = taskViewers.get(taskId) || new Set<string>();
  const viewersList: Array<{ id: string; name: string }> = [];

  for (const userId of viewersSet) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true },
    });
    if (user) {
      viewersList.push(user);
    }
  }

  const event = {
    eventType: 'TASK_LOCK_UPDATED',
    workspaceId: todo.teamId || 'private',
    userId: 'system',
    timestamp: new Date().toISOString(),
    payload: {
      taskId,
      viewers: viewersList,
    },
  };

  if (todo.teamId) {
    broadcastToWorkspace(todo.teamId, event);
  } else {
    sendToUser(todo.userId, event);
  }
}

// Public interface helper functions

export function broadcastToWorkspace(workspaceId: string, event: any, excludeSocket?: WebSocket) {
  if (!wss) return;
  // Find sockets subscribing to this workspace
  for (const client of wss.clients) {
    const authWs = client as AuthenticatedWebSocket;
    if (authWs.workspaceId === workspaceId && authWs !== excludeSocket && authWs.readyState === WebSocket.OPEN) {
      authWs.send(JSON.stringify(event));
    }
  }
}

export function sendToUser(userId: string, event: any) {
  const sockets = activeConnections.get(userId);
  if (sockets) {
    for (const socket of sockets) {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify(event));
      }
    }
  }
}

export function isUserOnline(userId: string): boolean {
  const sockets = activeConnections.get(userId);
  return !!sockets && sockets.size > 0;
}
