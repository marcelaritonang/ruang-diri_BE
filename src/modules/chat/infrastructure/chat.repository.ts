import { Injectable } from '@nestjs/common';
import {
  eq,
  and,
  desc,
  sql,
  or,
  inArray,
  asc,
  // getTableColumns   << BIG
} from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';

import { DrizzleService } from '@/common/drizzle/drizzle.service';

import { users } from '@/modules/users/domain/users.schema';
import { Role } from '@/modules/auth/decorators/roles.decorator';

import {
  chatSessions,
  chatMessages,
  chatUserPresence,
  type ChatSession,
  type CreateChatSession,
  type UpdateChatSession,
  type ChatMessage,
  type CreateChatMessage,
  type ChatUserPresence,
  type CreateChatUserPresence,
  type UpdateChatUserPresence,
} from '../domain/chat-sessions.schema';

import { toIsoUTCString } from '../../../common/utils/date.util';

@Injectable()
export class ChatRepository {
  constructor(private drizzle: DrizzleService) {}

  private get db() {
    return this.drizzle.db;
  }

  async createChatSession(data: CreateChatSession): Promise<ChatSession> {
    const [session] = await this.db
      .insert(chatSessions)
      .values(data)
      .returning();

    return session;
  }

  async getChatSessionById(sessionId: string): Promise<ChatSession | null> {
    const [session] = await this.db
      .select()
      .from(chatSessions)
      .where(eq(chatSessions.id, sessionId))
      .limit(1);

    return session || null;
  }

  async getChatSessionWithParticipants(sessionId: string) {
    const result = await this.db
      .select({
        session: chatSessions,
        client: {
          id: users.id,
          fullName: users.fullName,
          email: users.email,
          role: users.role,
        },
        psychologist: {
          id: users.id,
          fullName: users.fullName,
          email: users.email,
          role: users.role,
        },
      })
      .from(chatSessions)
      .leftJoin(users, eq(chatSessions.clientId, users.id))
      .leftJoin(users, eq(chatSessions.psychologistId, users.id))
      .where(eq(chatSessions.id, sessionId))
      .limit(1);

    return result[0] || null;
  }

  async updateChatSession(
    sessionId: string,
    data: Partial<UpdateChatSession>,
  ): Promise<ChatSession | null> {
    const [session] = await this.db
      .update(chatSessions)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(chatSessions.id, sessionId))
      .returning();

    return session || null;
  }

  async getUserActiveSessions(userId: string, role: Role) {
    const psych = alias(users, 'psych');
    const client = alias(users, 'client');

    const base = this.db
      .select({
        id: chatSessions.id,
        status: chatSessions.status,
        isActive: chatSessions.isActive,
        createdAt: chatSessions.createdAt,
        updatedAt: chatSessions.updatedAt,
        psychologist: {
          id: psych.id,
          fullName: psych.fullName,
          profilePicture: psych.profilePicture,
        },
        client: {
          id: client.id,
          fullName: client.fullName,
          profilePicture: client.profilePicture,
        },
      })
      .from(chatSessions)
      .leftJoin(psych, eq(chatSessions.psychologistId, psych.id))
      .leftJoin(client, eq(chatSessions.clientId, client.id));

    const filters = [
      eq(chatSessions.isActive, true),
      eq(chatSessions.status, 'active'),
    ];

    if (role === 'client') {
      filters.push(eq(chatSessions.clientId, userId));
    } else if (role === 'psychologist') {
      filters.push(eq(chatSessions.psychologistId, userId));
    } else {
      filters.push(
        or(
          eq(chatSessions.clientId, userId),
          eq(chatSessions.psychologistId, userId),
        ) as any,
      );
    }

    return base.where(and(...filters)).orderBy(desc(chatSessions.createdAt));
  }

  async getPsychologistActiveSessions(
    psychologistId: string,
  ): Promise<ChatSession[]> {
    return this.db
      .select()
      .from(chatSessions)
      .where(
        and(
          eq(chatSessions.isActive, true),
          eq(chatSessions.status, 'active'),
          eq(chatSessions.psychologistId, psychologistId),
        ),
      )
      .orderBy(desc(chatSessions.createdAt));
  }

  async isUserParticipantInSession(
    userId: string,
    sessionId: string,
  ): Promise<boolean> {
    const [session] = await this.db
      .select()
      .from(chatSessions)
      .where(
        and(eq(chatSessions.id, sessionId), eq(chatSessions.clientId, userId)),
      )
      .limit(1);

    if (session) return true;

    const [psychSession] = await this.db
      .select()
      .from(chatSessions)
      .where(
        and(
          eq(chatSessions.id, sessionId),
          eq(chatSessions.psychologistId, userId),
        ),
      )
      .limit(1);

    return !!psychSession;
  }

  async addMessage(data: CreateChatMessage): Promise<ChatMessage> {
    const [message] = await this.db
      .insert(chatMessages)
      .values(data)
      .returning();

    return message;
  }

  async getChatHistory(sessionId: string, cursor?: string, limit: number = 20) {
    let whereConditions = [eq(chatMessages.sessionId, sessionId)];

    if (cursor) {
      whereConditions.push(sql`${chatMessages.createdAt} < ${cursor}`);
    }

    const messages = await this.db
      .select({
        id: chatMessages.id,
        sessionId: chatMessages.sessionId,
        senderId: chatMessages.senderId,
        message: chatMessages.message,
        messageType: chatMessages.messageType,
        isRead: chatMessages.isRead,
        attachmentUrl: chatMessages.attachmentUrl,
        attachmentType: chatMessages.attachmentType,
        attachmentName: chatMessages.attachmentName,
        attachmentSize: chatMessages.attachmentSize,
        createdAt: chatMessages.createdAt,
        sender: {
          id: users.id,
          fullName: users.fullName,
          role: users.role,
          profilePicture: users.profilePicture,
        },
      })
      .from(chatMessages)
      .leftJoin(users, eq(chatMessages.senderId, users.id))
      .where(and(...whereConditions))
      .orderBy(desc(chatMessages.createdAt))
      .limit(limit + 1);

    const hasNextPage = messages.length > limit;
    const data = hasNextPage ? messages.slice(0, limit) : messages;
    const nextCursor = hasNextPage
      ? data[data.length - 1].createdAt.toISOString()
      : null;

    return {
      data: data.reverse(),
      metadata: {
        hasNextPage,
        nextCursor,
        limit,
      },
    };
  }

  async markMessagesAsRead(sessionId: string, userId: string): Promise<void> {
    await this.db
      .update(chatMessages)
      .set({ isRead: true })
      .where(
        and(
          eq(chatMessages.sessionId, sessionId),
          sql`${chatMessages.senderId} != ${userId}`,
          eq(chatMessages.isRead, false),
        ),
      );
  }

  async markMessageAsRead(messageId: string, userId: string): Promise<boolean> {
    const result = await this.db
      .update(chatMessages)
      .set({ isRead: true })
      .where(
        and(
          eq(chatMessages.id, messageId),
          sql`${chatMessages.senderId} != ${userId}`,
          eq(chatMessages.isRead, false),
        ),
      )
      .returning({ id: chatMessages.id });

    return result.length > 0;
  }

  async markSpecificMessagesAsRead(
    messageIds: string[],
    userId: string,
  ): Promise<string[]> {
    if (messageIds.length === 0) return [];

    const result = await this.db
      .update(chatMessages)
      .set({ isRead: true })
      .where(
        and(
          inArray(chatMessages.id, messageIds),
          sql`${chatMessages.senderId} != ${userId}`,
          eq(chatMessages.isRead, false),
        ),
      )
      .returning({ id: chatMessages.id });

    return result.map((item) => item.id);
  }

  async getUnreadMessages(
    sessionId: string,
    userId: string,
  ): Promise<ChatMessage[]> {
    return this.db
      .select()
      .from(chatMessages)
      .where(
        and(
          eq(chatMessages.sessionId, sessionId),
          sql`${chatMessages.senderId} != ${userId}`,
          eq(chatMessages.isRead, false),
        ),
      )
      .orderBy(chatMessages.createdAt);
  }

  async getMessageReadStatus(
    sessionId: string,
    messageIds?: string[],
  ): Promise<Array<{ messageId: string; isRead: boolean; senderId: string }>> {
    const baseConditions = [eq(chatMessages.sessionId, sessionId)];

    if (messageIds && messageIds.length > 0) {
      baseConditions.push(inArray(chatMessages.id, messageIds));
    }

    return this.db
      .select({
        messageId: chatMessages.id,
        isRead: chatMessages.isRead,
        senderId: chatMessages.senderId,
      })
      .from(chatMessages)
      .where(and(...baseConditions))
      .orderBy(chatMessages.createdAt);
  }

  async findActiveSessionBetweenParticipants(
    clientId: string,
    psychologistId: string,
  ): Promise<ChatSession | null> {
    const [session] = await this.db
      .select()
      .from(chatSessions)
      .where(
        and(
          eq(chatSessions.clientId, clientId),
          eq(chatSessions.psychologistId, psychologistId),
          eq(chatSessions.isActive, true),
          eq(chatSessions.status, 'active'),
        ),
      )
      .limit(1);

    return session || null;
  }

  async findLastSessionBetweenParticipants(
    clientId: string,
    psychologistId: string,
  ): Promise<ChatSession | null> {
    const [session] = await this.db
      .select()
      .from(chatSessions)
      .where(
        and(
          eq(chatSessions.clientId, clientId),
          eq(chatSessions.psychologistId, psychologistId),
        ),
      )
      .orderBy(desc(chatSessions.createdAt))
      .limit(1);

    return session || null;
  }

  async getUnreadMessageCount(
    sessionId: string,
    userId: string,
  ): Promise<number> {
    const result = await this.db
      .select({
        count: sql<number>`count(*)`,
      })
      .from(chatMessages)
      .where(
        and(
          eq(chatMessages.sessionId, sessionId),
          sql`${chatMessages.senderId} != ${userId}`,
          eq(chatMessages.isRead, false),
        ),
      );

    return result[0]?.count || 0;
  }

  async getUnreadMessageCountsForUser(
    userId: string,
    role: Role,
  ): Promise<Record<string, number>> {
    const sessions = await this.getUserActiveSessions(userId, role);
    const sessionIds = sessions.map((session) => session.id);

    if (sessionIds.length === 0) {
      return {};
    }

    const unreadCounts = await this.db
      .select({
        sessionId: chatMessages.sessionId,
        count: sql<number>`count(*)`,
      })
      .from(chatMessages)
      .where(
        and(
          inArray(chatMessages.sessionId, sessionIds),
          sql`${chatMessages.senderId} != ${userId}`,
          eq(chatMessages.isRead, false),
        ),
      )
      .groupBy(chatMessages.sessionId);

    const countMap: Record<string, number> = {};
    unreadCounts.forEach((item) => {
      countMap[item.sessionId] = item.count;
    });

    return countMap;
  }

  async searchChatHistories(
    userId: string,
    searchQuery?: string,
    limit: number = 20,
    offset: number = 0,
  ): Promise<{ data: any[]; total: number }> {
    const clientUser = alias(users, 'clientUser');
    const psychUser = alias(users, 'psychUser');

    let baseQuery = this.db
      .select({
        sessionId: chatSessions.id,
        clientId: chatSessions.clientId,
        psychologistId: chatSessions.psychologistId,
        status: chatSessions.status,
        isActive: chatSessions.isActive,
        createdAt: chatSessions.createdAt,
        updatedAt: chatSessions.updatedAt,
        client: {
          id: clientUser.id,
          fullName: clientUser.fullName,
          profilePicture: clientUser.profilePicture,
        },
        psychologist: {
          id: psychUser.id,
          fullName: psychUser.fullName,
          profilePicture: psychUser.profilePicture,
        },
      })
      .from(chatSessions)
      .leftJoin(clientUser, eq(chatSessions.clientId, clientUser.id))
      .leftJoin(psychUser, eq(chatSessions.psychologistId, psychUser.id));

    const baseFilters = [
      or(
        eq(chatSessions.clientId, userId),
        eq(chatSessions.psychologistId, userId),
      ),
    ];

    if (searchQuery && searchQuery.trim()) {
      const searchTerm = `%${searchQuery.trim().toLowerCase()}%`;
      baseFilters.push(
        or(
          sql`LOWER(${clientUser.fullName}) LIKE ${searchTerm}`,
          sql`LOWER(${psychUser.fullName}) LIKE ${searchTerm}`,
        ),
      );
    }

    const countQuery = await this.db
      .select({
        count: sql<number>`COUNT(DISTINCT ${chatSessions.id})`,
      })
      .from(chatSessions)
      .leftJoin(clientUser, eq(chatSessions.clientId, clientUser.id))
      .leftJoin(psychUser, eq(chatSessions.psychologistId, psychUser.id))
      .where(and(...baseFilters));

    const total = countQuery[0]?.count || 0;

    let searchWhereClause = sql``;
    if (searchQuery && searchQuery.trim()) {
      const st = `%${searchQuery.trim().toLowerCase()}%`;
      searchWhereClause = sql`
      and (
        lower(cu.full_name) like ${st}
        or lower(pu.full_name) like ${st}
      )`;
    }

    const pageIdRows = await this.db.execute(sql`
with base as (
  select s.id as "sessionId", s.updated_at as "updatedAt", s.created_at as "createdAt"
  from chat_sessions s
  left join users cu on cu.id = s.client_id
  left join users pu on pu.id = s.psychologist_id
  where (s.client_id = ${userId} or s.psychologist_id = ${userId})
    ${searchWhereClause}
),
latest as (
  select m.session_id as session_id, max(m.created_at) as last_created_at
  from chat_messages m
  join base b on b."sessionId" = m.session_id
  where m.message_type not in ('automated','system','system_message')
  group by m.session_id
)
select
  b."sessionId" as id,
  l.last_created_at as "lastUserMessageAt",
  b."createdAt"     as "createdAt"
from base b
left join latest l on l.session_id = b."sessionId"
order by coalesce(l.last_created_at, b."createdAt") desc, b."sessionId" desc
limit ${limit} offset ${offset};
`);

    const lastUserAtMap = new Map<string, string | null>(
      pageIdRows.rows.map((r) => [
        (r as any).id,
        (r as any).lastUserMessageAt || null,
      ]),
    );

    const pageSessionIds: string[] = pageIdRows.rows.map((r) => (r as any).id);
    if (pageSessionIds.length === 0) {
      return { data: [], total };
    }

    const sessions = await baseQuery.where(
      and(...baseFilters, inArray(chatSessions.id, pageSessionIds)),
    );

    const orderIndex = new Map(pageSessionIds.map((id, i) => [id, i]));
    sessions.sort(
      (a, b) => orderIndex.get(a.sessionId)! - orderIndex.get(b.sessionId)!,
    );

    const sessionIds = sessions.map((s) => s.sessionId);

    const lastMessages =
      sessionIds.length > 0
        ? await this.db
            .select({
              sessionId: chatMessages.sessionId,
              id: chatMessages.id,
              message: chatMessages.message,
              messageType: chatMessages.messageType,
              attachmentName: chatMessages.attachmentName,
              createdAt: chatMessages.createdAt,
              senderId: chatMessages.senderId,
              senderFullName: users.fullName,
              senderProfilePicture: users.profilePicture,
              isRead: chatMessages.isRead,
              attachmentUrl: chatMessages.attachmentUrl,
              attachmentType: chatMessages.attachmentType,
            })
            .from(chatMessages)
            .leftJoin(users, eq(chatMessages.senderId, users.id))
            .where(
              and(
                inArray(chatMessages.sessionId, sessionIds),
                sql`${chatMessages.messageType} not in ('automated','system', 'system_message')`,
              ),
            )
            .orderBy(desc(chatMessages.createdAt), desc(chatMessages.id))
        : [];

    // normalize and pick the latest per session
    const lastMessageMap = new Map<string, any>();
    for (const m of lastMessages) {
      if (!lastMessageMap.has(m.sessionId)) {
        lastMessageMap.set(m.sessionId, {
          ...m,
          createdAt: toIsoUTCString(m.createdAt),
        });
      }
    }

    // ---------- unread counts excluding automated and system ----------
    const unreadCounts: Record<string, number> = {};
    if (sessionIds.length > 0) {
      const counts = await this.db
        .select({
          sessionId: chatMessages.sessionId,
          count: sql<number>`count(*)`,
        })
        .from(chatMessages)
        .where(
          and(
            inArray(chatMessages.sessionId, sessionIds),
            sql`${chatMessages.senderId} <> ${userId}`,
            eq(chatMessages.isRead, false),
            sql`${chatMessages.messageType} not in ('automated','system', 'system_message')`,
          ),
        )
        .groupBy(chatMessages.sessionId);

      counts.forEach((item) => {
        unreadCounts[item.sessionId] = item.count;
      });
    }

    const result = sessions.map((session) => ({
      ...session,
      createdAt: toIsoUTCString(session.createdAt),
      updatedAt: toIsoUTCString(session.updatedAt),
      lastMessage: lastMessageMap.get(session.sessionId) || null,
      unreadCount: Number(unreadCounts[session.sessionId]) || 0,
      lastUserMessageAt: toIsoUTCString(lastUserAtMap.get(session.sessionId)),
    }));

    return {
      data: result,
      total,
    };
  }

  async findOverduePendingSessions(currentTime: Date): Promise<ChatSession[]> {
    const sessions = await this.db
      .select()
      .from(chatSessions)
      .where(
        and(
          eq(chatSessions.status, 'pending'),
          eq(chatSessions.isActive, false),
          sql`${chatSessions.scheduledAt} <= ${currentTime}`,
        ),
      );

    return sessions;
  }

  async getAttachmentsBySessionId(sessionId: string): Promise<ChatMessage[]> {
    return this.db
      .select()
      .from(chatMessages)
      .where(
        and(
          eq(chatMessages.sessionId, sessionId),
          inArray(chatMessages.messageType, ['file', 'image']),
        ),
      )
      .orderBy(asc(chatMessages.createdAt));
  }

  async getAttachmentsWithSenderInfo(sessionId: string): Promise<any[]> {
    return this.db
      .select({
        id: chatMessages.id,
        sessionId: chatMessages.sessionId,
        senderId: chatMessages.senderId,
        message: chatMessages.message,
        messageType: chatMessages.messageType,
        attachmentUrl: chatMessages.attachmentUrl,
        attachmentType: chatMessages.attachmentType,
        attachmentName: chatMessages.attachmentName,
        attachmentSize: chatMessages.attachmentSize,
        createdAt: chatMessages.createdAt,
        sender: {
          id: users.id,
          fullName: users.fullName,
          profilePicture: users.profilePicture,
        },
      })
      .from(chatMessages)
      .leftJoin(users, eq(chatMessages.senderId, users.id))
      .where(
        and(
          eq(chatMessages.sessionId, sessionId),
          inArray(chatMessages.messageType, ['file', 'image']),
        ),
      )
      .orderBy(asc(chatMessages.createdAt));
  }

  // Presence tracking methods
  async updateUserPresence(
    sessionId: string,
    userId: string,
    status: 'present' | 'away',
  ): Promise<ChatUserPresence> {
    // Try to update existing presence record
    const [existingPresence] = await this.db
      .update(chatUserPresence)
      .set({
        status,
        lastSeen: new Date(),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(chatUserPresence.sessionId, sessionId),
          eq(chatUserPresence.userId, userId),
        ),
      )
      .returning();

    // If no existing record, create a new one
    if (!existingPresence) {
      const [newPresence] = await this.db
        .insert(chatUserPresence)
        .values({
          sessionId,
          userId,
          status,
          lastSeen: new Date(),
        })
        .returning();

      return newPresence;
    }

    return existingPresence;
  }

  async getUserPresence(
    sessionId: string,
    userId: string,
  ): Promise<ChatUserPresence | null> {
    const [presence] = await this.db
      .select()
      .from(chatUserPresence)
      .where(
        and(
          eq(chatUserPresence.sessionId, sessionId),
          eq(chatUserPresence.userId, userId),
        ),
      )
      .limit(1);

    return presence || null;
  }

  async getOtherParticipantPresence(
    sessionId: string,
    currentUserId: string,
  ): Promise<ChatUserPresence | null> {
    const session = await this.getChatSessionById(sessionId);
    if (!session) return null;

    const otherParticipantId =
      session.clientId === currentUserId
        ? session.psychologistId
        : session.clientId;

    return this.getUserPresence(sessionId, otherParticipantId);
  }
}
