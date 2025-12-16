import { v4 as uuidv4 } from 'uuid';
import { asc, eq, and, sql, lt, gt, ne, or, exists, SQL } from 'drizzle-orm';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { DrizzleService } from '@common/drizzle/drizzle.service';
import { TransactionContext } from '@/common/services/transaction.service';
import {
  toUtcDateTime,
  formatUtcInUserTimezone,
  dateRangeToUtc,
} from '@/common/utils/date.util';

import {
  scheduleAttachments,
  schedules,
  SimplifiedSchedules,
  usersSchedules,
  type Schedules,
  type SchedulesAttachments,
} from '../domain/schedules.schema';
import { CreateScheduleDto } from '../domain/dto/create-schedule.dto';
import {
  ScheduleParamDto,
  ScheduleQueryDto,
} from '../domain/dto/schedule-response.dto';
import { IUserRequest } from '@/modules/auth/strategies/jwt.strategy';
import { UpdateScheduleDto } from '../domain/dto/update-schedule.dto';
import { Role } from '@/modules/auth/decorators/roles.decorator';
import { users } from '@/modules/users/domain/users.schema';
import { psychologistProfiles } from '@/modules/psychologists/psychologist-profile.schema';

export interface ICreateSchedules {
  id: string;
  startDateTime: Date;
  endDateTime: Date;
  agenda: string;
  location: CreateScheduleDto['location'];
  type: CreateScheduleDto['type'];
  isNew: boolean;
}

@Injectable()
export class SchedulesRepository {
  constructor(private drizzle: DrizzleService) {}

  private get db() {
    return this.drizzle.db;
  }

  async getUserTimezone(userId: string): Promise<string | null> {
    const userRecord = await this.db.query.users.findFirst({
      where: eq(users.id, userId),
      columns: { timezone: true },
    });
    return userRecord?.timezone || null;
  }

  async checkPsychologistAvailability(
    psychologistId: string,
    startDateTime: Date,
    endDateTime: Date,
    context?: TransactionContext,
    excludeScheduleId?: string,
  ): Promise<void> {
    const dbContext = context?.tx || this.db;

    // Get psychologist's concurrent session capacity
    const psychProfile = await dbContext
      .select({
        maxConcurrentSessions: psychologistProfiles.maxConcurrentSessions,
      })
      .from(psychologistProfiles)
      .where(eq(psychologistProfiles.userId, psychologistId))
      .limit(1);

    const maxConcurrentSessions = psychProfile[0]?.maxConcurrentSessions || 2;

    const whereConditions = [
      eq(usersSchedules.userId, psychologistId),
      lt(schedules.startDateTime, endDateTime),
      gt(schedules.endDateTime, startDateTime),
    ];

    if (excludeScheduleId) {
      whereConditions.push(ne(schedules.id, excludeScheduleId));
    }

    const concurrentSessions = await dbContext
      .select({
        scheduleId: schedules.id,
        start: schedules.startDateTime,
        end: schedules.endDateTime,
      })
      .from(usersSchedules)
      .innerJoin(schedules, eq(usersSchedules.scheduleId, schedules.id))
      .where(and(...whereConditions));

    if (concurrentSessions.length >= maxConcurrentSessions) {
      throw new BadRequestException(
        `Psychologist has reached maximum concurrent sessions (${maxConcurrentSessions}) from ${startDateTime.toISOString()} to ${endDateTime.toISOString()}.`,
      );
    }
  }

  async createSchedule(
    dto: CreateScheduleDto,
    user: IUserRequest['user'],
    context?: TransactionContext,
  ): Promise<ICreateSchedules[]> {
    const createdSchedules: ICreateSchedules[] = [];

    const executeOperations = async (tx: any) => {
      const isPsychOwner = user.role === 'psychologist';

      const userRecord = await tx.query.users.findFirst({
        where: eq(users.id, user.id),
        columns: { timezone: true },
      });
      const userDefaultTimezone = userRecord?.timezone || 'UTC';

      for (const item of dto.dates) {
        const timezoneToUse = item.timezone || userDefaultTimezone;

        const startDateTime = toUtcDateTime(
          item.date,
          item.startTime,
          timezoneToUse,
        );
        const endDateTime = toUtcDateTime(
          item.date,
          item.endTime,
          timezoneToUse,
        );

        const existing = await tx.query.schedules.findFirst({
          where: and(
            isPsychOwner
              ? eq(schedules.psychologistId, user.id)
              : eq(schedules.organizationId, user.organizationId!),
            eq(schedules.startDateTime, startDateTime),
            eq(schedules.endDateTime, endDateTime),
            eq(schedules.type, dto.type),
          ),
        });

        const scheduleId = existing?.id ?? uuidv4();

        if (!existing && dto.participants?.psychologistId) {
          await this.checkPsychologistAvailability(
            dto.participants.psychologistId,
            startDateTime,
            endDateTime,
            { tx },
          );
        }

        if (!existing) {
          await tx.insert(schedules).values({
            id: scheduleId,
            startDateTime,
            endDateTime,
            originalTimezone: timezoneToUse,

            organizationId: isPsychOwner ? null : user.organizationId!,
            psychologistId: isPsychOwner ? user.id : null,

            agenda: dto.agenda,
            location: dto.location,
            description: dto.description,
            type: dto.type,
            createdBy: user.id,
            notificationOffset: dto.notificationOffset,
            customLocation: dto.customLocation,
          });
        }

        const participants: { scheduleId: string; userId: string }[] = [];

        if (dto.participants?.patientIds?.length) {
          for (const patientId of dto.participants.patientIds) {
            participants.push({ scheduleId, userId: patientId });
          }
        }

        if (dto.participants?.psychologistId) {
          participants.push({
            scheduleId,
            userId: dto.participants.psychologistId,
          });
        } else if (isPsychOwner) {
          participants.push({
            scheduleId,
            userId: user.id,
          });
        }

        if (dto.type === 'counseling' && participants.length === 0) {
          throw new BadRequestException(
            'At least one participant is required.',
          );
        }

        if (participants.length > 0) {
          await tx
            .insert(usersSchedules)
            .values(participants)
            .onConflictDoNothing({
              target: [usersSchedules.scheduleId, usersSchedules.userId],
            });
        }

        createdSchedules.push({
          id: scheduleId,
          startDateTime,
          endDateTime,
          agenda: dto.agenda,
          location: dto.location,
          type: dto.type,
          isNew: !existing,
        });
      }

      return createdSchedules;
    };

    if (context?.tx) {
      return await executeOperations(context.tx);
    } else {
      return await this.db.transaction(executeOperations);
    }
  }

  async getSchedulesWithinRange(
    dates: ScheduleQueryDto,
    user: IUserRequest['user'],
  ): Promise<SimplifiedSchedules[]> {
    const userRecord = await this.db.query.users.findFirst({
      where: eq(users.id, user.id),
      columns: { timezone: true },
    });
    const userTimezone = userRecord?.timezone || 'Asia/Jakarta';

    const { fromUtc, toUtc } = dateRangeToUtc(
      dates.from,
      dates.to,
      userTimezone,
    );

    const orScopes: SQL<unknown>[] = [
      eq(schedules.psychologistId, user.id),

      exists(
        this.db
          .select({ one: sql`1` })
          .from(usersSchedules)
          .where(
            and(
              eq(usersSchedules.scheduleId, schedules.id),
              eq(usersSchedules.userId, user.id),
            ),
          ),
      ),
    ];

    if (user.organizationId) {
      orScopes.push(eq(schedules.organizationId, user.organizationId));
    }

    const ownershipScope = or(...orScopes);

    const timeOverlap = and(
      lt(schedules.startDateTime, toUtc),
      gt(schedules.endDateTime, fromUtc),
    );

    const rows = await this.db.query.schedules.findMany({
      where: and(ownershipScope, timeOverlap),
      columns: {
        id: true,
        agenda: true,
        type: true,
        startDateTime: true,
        endDateTime: true,
        originalTimezone: true,
        location: true,
        customLocation: true,
      },
      orderBy: [asc(schedules.startDateTime)],
    });

    return rows.map((s) => ({
      ...s,
      displayStartDateTime: formatUtcInUserTimezone(
        s.startDateTime,
        userTimezone,
        'YYYY-MM-DD HH:mm',
      ),
      displayEndDateTime: formatUtcInUserTimezone(
        s.endDateTime,
        userTimezone,
        'YYYY-MM-DD HH:mm',
      ),
    }));
  }

  async deleteSchedule(id: string): Promise<void> {
    await this.db.transaction(async (tx) => {
      const currentSchedule = await tx.query.schedules.findFirst({
        where: eq(schedules.id, id),
      });

      if (!currentSchedule) {
        throw new NotFoundException(`Schedule with ID ${id} not found`);
      }

      await tx.delete(usersSchedules).where(eq(usersSchedules.scheduleId, id));
      await tx
        .delete(scheduleAttachments)
        .where(eq(scheduleAttachments.scheduleId, id));
      await tx.delete(schedules).where(eq(schedules.id, id));
    });
  }

  async updateSchedule(
    id: string,
    dto: UpdateScheduleDto,
    user?: IUserRequest['user'],
    context?: TransactionContext,
  ): Promise<Schedules[]> {
    const executeOperations = async (tx: any) => {
      const currentSchedule = await tx.query.schedules.findFirst({
        where: eq(schedules.id, id),
      });

      if (!currentSchedule) {
        throw new NotFoundException(`Schedule with ID ${id} not found`);
      }

      if (user) {
        const isOrgOwned = !!currentSchedule.organizationId;
        const isPsychOwned = !!currentSchedule.psychologistId;

        if (
          isOrgOwned &&
          currentSchedule.organizationId !== user.organizationId
        ) {
          throw new BadRequestException(
            'You do not have permission to update this schedule',
          );
        }
        if (isPsychOwned && currentSchedule.psychologistId !== user.id) {
          throw new BadRequestException(
            'You do not have permission to update this schedule',
          );
        }
      }

      const updatedSchedules: Schedules[] = [];

      if (dto.dates && dto.dates.length >= 1 && dto.dates.length <= 2) {
        const userRecord = await tx.query.users.findFirst({
          where: eq(users.id, user!.id),
          columns: { timezone: true },
        });
        const userDefaultTimezone = userRecord?.timezone || 'UTC';

        // Process each date
        for (let i = 0; i < dto.dates.length; i++) {
          const dateObj = dto.dates[i];
          const timezoneToUse = dateObj.timezone || userDefaultTimezone;

          const newStartDateTime = toUtcDateTime(
            dateObj.date,
            dateObj.startTime,
            timezoneToUse,
          );
          const newEndDateTime = toUtcDateTime(
            dateObj.date,
            dateObj.endTime,
            timezoneToUse,
          );

          const psychIdForCheck =
            dto.participants?.psychologistId ??
            currentSchedule.psychologistId ??
            null;

          if (psychIdForCheck) {
            await this.checkPsychologistAvailability(
              psychIdForCheck,
              newStartDateTime,
              newEndDateTime,
              { tx },
              i === 0 ? id : undefined, // Only exclude current schedule for first date (update)
            );
          }

          if (i === 0) {
            // Update the existing schedule with the first date
            let updatePayload: Partial<typeof schedules.$inferInsert> = {
              updatedAt: new Date(),
              startDateTime: newStartDateTime,
              endDateTime: newEndDateTime,
              originalTimezone: timezoneToUse,
            };

            if (user?.id) {
              updatePayload.updatedBy = user.id;
            }

            if (dto.agenda !== undefined) updatePayload.agenda = dto.agenda;
            if (dto.location !== undefined)
              updatePayload.location = dto.location;
            if (dto.description !== undefined)
              updatePayload.description = dto.description;
            if (dto.type !== undefined) updatePayload.type = dto.type;
            if (dto.notificationOffset !== undefined)
              updatePayload.notificationOffset = dto.notificationOffset;
            if (dto.customLocation !== undefined)
              updatePayload.customLocation = dto.customLocation;

            const [updatedSchedule] = await tx
              .update(schedules)
              .set(updatePayload)
              .where(eq(schedules.id, id))
              .returning();

            updatedSchedules.push(updatedSchedule);
          } else {
            // Create new schedule with the same content but different date
            const newScheduleId = uuidv4();

            await tx.insert(schedules).values({
              id: newScheduleId,
              startDateTime: newStartDateTime,
              endDateTime: newEndDateTime,
              originalTimezone: timezoneToUse,
              organizationId: currentSchedule.organizationId,
              psychologistId: currentSchedule.psychologistId,
              agenda:
                dto.agenda !== undefined ? dto.agenda : currentSchedule.agenda,
              location:
                dto.location !== undefined
                  ? dto.location
                  : currentSchedule.location,
              description:
                dto.description !== undefined
                  ? dto.description
                  : currentSchedule.description,
              type: dto.type !== undefined ? dto.type : currentSchedule.type,
              notificationOffset:
                dto.notificationOffset !== undefined
                  ? dto.notificationOffset
                  : currentSchedule.notificationOffset,
              customLocation:
                dto.customLocation !== undefined
                  ? dto.customLocation
                  : currentSchedule.customLocation,
              createdBy: user?.id || currentSchedule.createdBy,
              updatedBy: user?.id,
            });

            const [newSchedule] = await tx
              .select()
              .from(schedules)
              .where(eq(schedules.id, newScheduleId));

            updatedSchedules.push(newSchedule);

            // Copy participants to new schedule
            const existingParticipants = await tx.query.usersSchedules.findMany(
              {
                where: eq(usersSchedules.scheduleId, id),
              },
            );

            if (existingParticipants.length > 0) {
              const newParticipants = existingParticipants.map((p) => ({
                scheduleId: newScheduleId,
                userId: p.userId,
              }));

              await tx
                .insert(usersSchedules)
                .values(newParticipants)
                .onConflictDoNothing({
                  target: [usersSchedules.scheduleId, usersSchedules.userId],
                });
            }
          }
        }
      } else if (dto.dates && dto.dates.length > 2) {
        throw new BadRequestException(
          'Maximum of 2 dates allowed for update operation.',
        );
      } else {
        // No dates provided, just update other fields
        let updatePayload: Partial<typeof schedules.$inferInsert> = {
          updatedAt: new Date(),
        };

        if (user?.id) {
          updatePayload.updatedBy = user.id;
        }

        if (dto.agenda !== undefined) updatePayload.agenda = dto.agenda;
        if (dto.location !== undefined) updatePayload.location = dto.location;
        if (dto.description !== undefined)
          updatePayload.description = dto.description;
        if (dto.type !== undefined) updatePayload.type = dto.type;
        if (dto.notificationOffset !== undefined)
          updatePayload.notificationOffset = dto.notificationOffset;
        if (dto.customLocation !== undefined)
          updatePayload.customLocation = dto.customLocation;

        const [updatedSchedule] = await tx
          .update(schedules)
          .set(updatePayload)
          .where(eq(schedules.id, id))
          .returning();

        updatedSchedules.push(updatedSchedule);
      }

      // Handle participants update for the original schedule
      if (dto.participants) {
        await tx
          .delete(usersSchedules)
          .where(eq(usersSchedules.scheduleId, id));

        const participants: { scheduleId: string; userId: string }[] = [];

        if (dto.participants.patientIds?.length) {
          for (const patientId of dto.participants.patientIds.slice(0, 2)) {
            participants.push({ scheduleId: id, userId: patientId });
          }
        }

        if (dto.participants.psychologistId) {
          participants.push({
            scheduleId: id,
            userId: dto.participants.psychologistId,
          });
        } else if (currentSchedule.psychologistId) {
          participants.push({
            scheduleId: id,
            userId: currentSchedule.psychologistId,
          });
        }

        await tx
          .insert(usersSchedules)
          .values(participants)
          .onConflictDoNothing({
            target: [usersSchedules.scheduleId, usersSchedules.userId],
          });

        // Apply same participants to any newly created schedules
        if (updatedSchedules.length > 1) {
          for (let i = 1; i < updatedSchedules.length; i++) {
            const newScheduleParticipants = participants.map((p) => ({
              ...p,
              scheduleId: updatedSchedules[i].id,
            }));

            await tx
              .insert(usersSchedules)
              .values(newScheduleParticipants)
              .onConflictDoNothing({
                target: [usersSchedules.scheduleId, usersSchedules.userId],
              });
          }
        }
      }

      return updatedSchedules;
    };

    if (context?.tx) {
      return await executeOperations(context.tx);
    } else {
      return await this.db.transaction(executeOperations);
    }
  }

  async getScheduleById(
    id: string,
    user?: IUserRequest['user'],
    userTimezone?: string,
  ): Promise<
    Schedules & { displayStartDateTime?: string; displayEndDateTime?: string }
  > {
    const schedule = await this.db.query.schedules.findFirst({
      extras: (table, { sql }) => ({
        location: sql<string>`
        CASE
          WHEN ${table.location} = 'organization'
            THEN (
              SELECT u.address
              FROM users AS u
              WHERE u.organization_id = ${table.organizationId}
                AND u.role = 'organization'
              LIMIT 1
            )
          WHEN ${table.location} = 'offline'
            THEN (
              SELECT pp.location
              FROM users AS u
              JOIN users_schedules AS us ON us.user_id = u.id
              JOIN psychologist_profiles AS pp ON pp.user_id = u.id
              WHERE us.schedule_id = ${table.id}
                AND u.role = 'psychologist'
              LIMIT 1
            )
          WHEN ${table.location} = 'chat' THEN 'chat'
          ELSE 'online'
        END
      `.as('location'),
      }),
      where: eq(schedules.id, id),
      with: {
        attachments: true,
        usersSchedules: {
          columns: {
            userId: false,
            scheduleId: false,
          },
          with: {
            user: {
              columns: {
                lastPassword: false,
                password: false,
              },
            },
          },
        },
      },
    });

    if (!schedule) {
      throw new NotFoundException(`Schedule with ID ${id} not found`);
    }

    let displayTimezone = userTimezone;
    if (user && !userTimezone) {
      const userRecord = await this.db.query.users.findFirst({
        where: eq(users.id, user.id),
        columns: { timezone: true },
      });
      displayTimezone = userRecord?.timezone || 'UTC';
    }

    if (displayTimezone) {
      return {
        ...schedule,
        displayStartDateTime: formatUtcInUserTimezone(
          schedule.startDateTime,
          displayTimezone,
          'YYYY-MM-DD HH:mm',
        ),
        displayEndDateTime: formatUtcInUserTimezone(
          schedule.endDateTime,
          displayTimezone,
          'YYYY-MM-DD HH:mm',
        ),
      } as Schedules & {
        displayStartDateTime: string;
        displayEndDateTime: string;
      };
    }

    return schedule;
  }

  async insertAttachments(attachments: SchedulesAttachments[]): Promise<void> {
    await this.db.transaction(async (tx) => {
      await tx.insert(scheduleAttachments).values(attachments);
    });
  }

  async getParticipantsByScheduleId(
    scheduleId: ScheduleParamDto['id'],
  ): Promise<{ id: string; fullName: string | null; role: Role }[]> {
    const participants: any = await this.db.query.usersSchedules.findMany({
      where: eq(usersSchedules.scheduleId, scheduleId),
      with: {
        user: {
          columns: {
            id: true,
            fullName: true,
            role: true,
          },
        },
      },
    });

    if (!participants) {
      throw new NotFoundException(
        `Participants for schedule with ID ${scheduleId} not found`,
      );
    }

    if (participants.length === 0) {
      return [];
    }

    return participants.map((p) => ({
      id: p.user.id,
      fullName: p.user.fullName,
      role: p.user.role,
    }));
  }

  async deleteAttachment(
    attachmentId: string,
    scheduleId?: string,
  ): Promise<void> {
    const whereClause = scheduleId
      ? and(
          eq(scheduleAttachments.id, attachmentId),
          eq(scheduleAttachments.scheduleId, scheduleId),
        )
      : eq(scheduleAttachments.id, attachmentId);

    const attachment = await this.db.query.scheduleAttachments.findFirst({
      where: whereClause,
    });

    if (!attachment) {
      const errorMessage = scheduleId
        ? `Attachment with ID ${attachmentId} not found in schedule ${scheduleId}`
        : `Attachment with ID ${attachmentId} not found`;
      throw new NotFoundException(errorMessage);
    }

    await this.db
      .delete(scheduleAttachments)
      .where(eq(scheduleAttachments.id, attachmentId));
  }
}
