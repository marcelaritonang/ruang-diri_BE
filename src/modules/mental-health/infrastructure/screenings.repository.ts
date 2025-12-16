import { Injectable, Logger } from '@nestjs/common';
import { eq, and, desc, gte, lte, count, avg, sql } from 'drizzle-orm';

import { DrizzleService } from '@/common/drizzle/drizzle.service';
import { users, screenings } from '@/common/database/database-schema';

import type {
  GetScreeningsQuery,
  ScreeningAnalytics,
} from '../domain/screenings/dto/screening.dto';
import type {
  Screenings,
  CreateScreenings,
} from '../domain/screenings/screenings.schema';

@Injectable()
export class ScreeningsRepository {
  private readonly logger = new Logger(ScreeningsRepository.name);

  constructor(private readonly drizzleService: DrizzleService) {}

  async createScreening(
    data: Omit<CreateScreenings, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<Omit<Screenings, 'id' | 'createdAt' | 'updatedAt' | 'userId'>> {
    this.logger.log(`Creating screening for user: ${data.userId}`);

    const [screening] = await this.drizzleService.db
      .insert(screenings)
      .values({
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    const { id, userId, createdAt, updatedAt, ...rest } = screening;

    return rest;
  }

  async getScreeningById(id: string): Promise<Screenings | null> {
    this.logger.log(`Fetching screening by ID: ${id}`);

    const [screening] = await this.drizzleService.db
      .select()
      .from(screenings)
      .where(eq(screenings.id, id))
      .limit(1);

    return screening || null;
  }

  async getUserScreenings(
    userId: string,
    query: GetScreeningsQuery,
  ): Promise<{
    data: Screenings[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> {
    this.logger.log(`Fetching screenings for user: ${userId}`);

    const offset = (query.page - 1) * query.limit;
    const whereConditions = [eq(screenings.userId, userId)];

    if (query.dateFrom) {
      whereConditions.push(gte(screenings.date, new Date(query.dateFrom)));
    }
    if (query.dateTo) {
      whereConditions.push(lte(screenings.date, new Date(query.dateTo)));
    }

    if (query.status && query.status !== 'not_screened') {
      whereConditions.push(
        eq(
          screenings.screeningStatus,
          query.status as 'stable' | 'at_risk' | 'monitored',
        ),
      );
    }

    if (query.riskLevel) {
      whereConditions.push(eq(screenings.overallRisk, query.riskLevel));
    }

    const [{ count: total }] = await this.drizzleService.db
      .select({ count: count() })
      .from(screenings)
      .where(and(...whereConditions));

    const data = await this.drizzleService.db
      .select()
      .from(screenings)
      .where(and(...whereConditions))
      .orderBy(desc(screenings.createdAt))
      .limit(query.limit)
      .offset(offset);

    return {
      data,
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }

  async getOrganizationScreenings(
    organizationId: string,
    query: GetScreeningsQuery,
  ): Promise<{
    data: any[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> {
    this.logger.log(`Fetching screenings for organization: ${organizationId}`);

    const offset = (query.page - 1) * query.limit;
    const whereConditions = [eq(users.organizationId, organizationId)];

    if (query.dateFrom) {
      whereConditions.push(gte(screenings.date, new Date(query.dateFrom)));
    }
    if (query.dateTo) {
      whereConditions.push(lte(screenings.date, new Date(query.dateTo)));
    }

    if (query.status && query.status !== 'not_screened') {
      whereConditions.push(
        eq(
          screenings.screeningStatus,
          query.status as 'stable' | 'at_risk' | 'monitored',
        ),
      );
    }

    if (query.riskLevel) {
      whereConditions.push(eq(screenings.overallRisk, query.riskLevel));
    }

    if (query.userId) {
      whereConditions.push(eq(screenings.userId, query.userId));
    }

    const [{ count: total }] = await this.drizzleService.db
      .select({ count: count() })
      .from(screenings)
      .innerJoin(users, eq(screenings.userId, users.id))
      .where(and(...whereConditions));

    const data = await this.drizzleService.db
      .select({
        id: screenings.id,
        userId: screenings.userId,
        date: screenings.date,
        screeningStatus: screenings.screeningStatus,
        depressionScore: screenings.depressionScore,
        anxietyScore: screenings.anxietyScore,
        stressScore: screenings.stressScore,
        depressionCategory: screenings.depressionCategory,
        anxietyCategory: screenings.anxietyCategory,
        stressCategory: screenings.stressCategory,
        overallRisk: screenings.overallRisk,
        answers: screenings.answers,
        notes: screenings.notes,
        createdAt: screenings.createdAt,
        updatedAt: screenings.updatedAt,
        user: {
          fullName: users.fullName,
          email: users.email,
          role: users.role,
        },
      })
      .from(screenings)
      .innerJoin(users, eq(screenings.userId, users.id))
      .where(and(...whereConditions))
      .orderBy(desc(screenings.createdAt))
      .limit(query.limit)
      .offset(offset);

    return {
      data,
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }

  async getScreeningAnalytics(
    organizationId: string,
    timeframe?: { from: Date; to: Date },
  ): Promise<ScreeningAnalytics> {
    this.logger.log(
      `Generating screening analytics for organization: ${organizationId}`,
    );

    const whereConditions = [eq(users.organizationId, organizationId)];

    if (timeframe) {
      whereConditions.push(
        gte(screenings.date, timeframe.from),
        lte(screenings.date, timeframe.to),
      );
    }

    const [{ count: totalScreenings }] = await this.drizzleService.db
      .select({ count: count() })
      .from(screenings)
      .innerJoin(users, eq(screenings.userId, users.id))
      .where(and(...whereConditions));

    const riskDistribution = await this.drizzleService.db
      .select({
        status: screenings.screeningStatus,
        count: count(),
      })
      .from(screenings)
      .innerJoin(users, eq(screenings.userId, users.id))
      .where(and(...whereConditions))
      .groupBy(screenings.screeningStatus);

    const [categoryAverages] = await this.drizzleService.db
      .select({
        depression: avg(screenings.depressionScore),
        anxiety: avg(screenings.anxietyScore),
        stress: avg(screenings.stressScore),
      })
      .from(screenings)
      .innerJoin(users, eq(screenings.userId, users.id))
      .where(and(...whereConditions));

    const monthlyTrends = await this.drizzleService.db
      .select({
        month: sql<string>`TO_CHAR(${screenings.date}, 'YYYY-MM')`,
        count: count(),
        averageRisk: sql<number>`
          AVG(CASE 
            WHEN ${screenings.overallRisk} = 'Stabil' THEN 1
            WHEN ${screenings.overallRisk} = 'Ringan' THEN 2
            WHEN ${screenings.overallRisk} = 'Sedang' THEN 3
            WHEN ${screenings.overallRisk} = 'Mengkhawatirkan' THEN 4
            WHEN ${screenings.overallRisk} = 'Sangat Mengkhawatirkan' THEN 5
            ELSE 1
          END)
        `,
      })
      .from(screenings)
      .innerJoin(users, eq(screenings.userId, users.id))
      .where(and(...whereConditions))
      .groupBy(sql`TO_CHAR(${screenings.date}, 'YYYY-MM')`)
      .orderBy(sql`TO_CHAR(${screenings.date}, 'YYYY-MM') DESC`)
      .limit(12);

    const riskDistObj = {
      stable: 0,
      atRisk: 0,
      monitored: 0,
    };

    riskDistribution.forEach(({ status, count }) => {
      switch (status) {
        case 'stable':
          riskDistObj.stable = count;
          break;
        case 'at_risk':
          riskDistObj.atRisk = count;
          break;
        case 'monitored':
          riskDistObj.monitored = count;
          break;
      }
    });

    return {
      totalScreenings,
      riskDistribution: riskDistObj,
      categoryAverages: {
        depression: Number(categoryAverages?.depression) || 0,
        anxiety: Number(categoryAverages?.anxiety) || 0,
        stress: Number(categoryAverages?.stress) || 0,
      },
      monthlyTrends: monthlyTrends.map((trend) => ({
        month: trend.month,
        count: trend.count,
        averageRisk: Number(trend.averageRisk) || 0,
      })),
    };
  }
}
