import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Server, Socket } from 'socket.io';

import { url } from '@/common/constants/url.constant';

import {
  NotificationPayload,
  ChatNotificationPayload,
} from './notification.types';

@WebSocketGateway({
  namespace: '/notifications',
  cors: {
    origin: url.FRONTEND_URL,
    methods: ['GET', 'POST'],
  },
})
export class NotificationGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(NotificationGateway.name);

  constructor(private jwtService: JwtService) {}

  @WebSocketServer() io: Server;

  afterInit() {
    this.logger.log('Initialized');
  }

  private joinRoom(client: Socket, room: string, type: 'org' | 'user') {
    client.join(room);
    this.logger.log(`Client ${client.id} joined ${type} room '${room}'`);
  }

  handleConnection(client: Socket) {
    const token = client.handshake.auth?.token;

    this.logger.debug(`Client id: ${client.id} connected`, { token });

    if (!token) {
      this.logger.warn(`Client ${client.id} connected without token`);
      client.disconnect(true);
      return;
    }

    try {
      const decoded = this.jwtService.verify(token);

      const userId = decoded.sub;
      const orgId = decoded.organizationId;

      if (orgId) this.joinRoom(client, orgId, 'org');
      if (userId) this.joinRoom(client, userId, 'user');

      this.logger.debug(`Client ${client.id} connected via token`);
    } catch (err) {
      this.logger.error(`JWT validation failed for client ${client.id}:`, err);
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client id: ${client.id} disconnected`);
  }

  sendNotificationToOrg<T>(orgId: string, payload: NotificationPayload<T>) {
    this.io.to(orgId).emit(`notification:${payload.event}`, payload);
  }

  sendNotificationToUser<T>(userId: string, payload: NotificationPayload<T>) {
    this.io.to(userId).emit(`notification:${payload.event}`, payload);

    this.logger.log(`Notification sent to user ${userId}`);
  }

  sendChatNotification(
    participants: {
      clientId: string;
      psychologistId: string;
    },
    payload: ChatNotificationPayload,
  ) {
    this.io.to(participants.clientId).emit(`chat:${payload.event}`, payload);
    this.io
      .to(participants.psychologistId)
      .emit(`chat:${payload.event}`, payload);

    this.logger.log(
      `Chat notification sent to participants ${JSON.stringify(participants)}`,
    );
  }
}
