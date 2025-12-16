import { eq, sql, type SQL } from 'drizzle-orm';
import { Injectable } from '@nestjs/common';

import { users, type CreateUser } from '@/modules/users/domain/users.schema';
import { EmployeeProfileUploadDto } from '@modules/employees/domain/dto/create-employee.dto';

import { DrizzleService } from '@common/drizzle/drizzle.service';
import { getCurrentMonth } from '@common/utils/date.util';
import { months } from '@/common/utils/query-helper.util';

import { employeeProfiles } from '../domain/employees.schema';

@Injectable()
export class EmployeeProfilesRepository {
  constructor(private readonly drizzle: DrizzleService) {}

  private get db() {
    return this.drizzle.db;
  }

  async getEmployeeById(userId: string): Promise<any> {
    return await this.db.query.users.findFirst({
      where: eq(users.id, userId),
      with: {
        employeeProfile: {
          columns: {
            userId: false,
          },
        },
        screenings: {
          columns: {
            userId: false,
            actorType: false,
          },
        },
        counselings: {
          columns: {
            userId: false,
          },
        },
      },
      columns: {
        password: false,
        passwordChangedAt: false,
        createdAt: false,
        lastPassword: false,
        updatedAt: false,
        organizationId: false,
        isActive: false,
      },
    });
  }

  async getEmployeesRoles(organizationId: string): Promise<{
    departments: (string | null)[];
    positions: (string | null)[];
  }> {
    const departments = await this.db
      .selectDistinct({ department: employeeProfiles.department })
      .from(employeeProfiles)
      .innerJoin(users, eq(employeeProfiles.userId, users.id))
      .where(eq(users.organizationId, organizationId));

    const positions = await this.db
      .selectDistinct({ position: employeeProfiles.position })
      .from(employeeProfiles)
      .innerJoin(users, eq(employeeProfiles.userId, users.id))
      .where(eq(users.organizationId, organizationId));

    return {
      departments: departments.map((d) => d.department),
      positions: positions.map((p) => p.position),
    };
  }

  async getMonthlyMentalHealthStats(orgId: string): Promise<any> {
    const monthNumber = getCurrentMonth();

    const currentMonthResult = await this.db.execute(sql`
      WITH employees AS (
      SELECT id
      FROM users
      WHERE role = 'employee'
      AND organization_id = ${orgId}
      ),
      latest_screening AS (
      SELECT DISTINCT ON (s.user_id)
        s.user_id,
        s.screening_status
      FROM screenings s
      INNER JOIN employees u ON s.user_id = u.id
      WHERE EXTRACT(MONTH FROM s.date) = ${monthNumber}
      ORDER BY s.user_id, s.date DESC
      ),
      latest_counseling AS (
      SELECT DISTINCT ON (c.user_id)
        c.user_id,
        c.status
      FROM counselings c
      INNER JOIN employees u ON c.user_id = u.id
      WHERE EXTRACT(MONTH FROM c.date) = ${monthNumber}
      ORDER BY c.user_id, c.date DESC
      ),
      not_counseled AS (
      SELECT s.user_id
      FROM latest_screening s
      LEFT JOIN latest_counseling c ON s.user_id = c.user_id
      WHERE s.screening_status = 'at_risk'
        AND (c.user_id IS NULL OR c.status = 'scheduled')
      ),
      not_screened AS (
      SELECT u.id AS user_id
      FROM employees u
      LEFT JOIN latest_screening s ON u.id = s.user_id
      WHERE s.user_id IS NULL OR s.screening_status = 'not_screened'
      ),
      status_counts AS (
      SELECT
        screening_status AS status,
        COUNT(*) AS status_count
      FROM latest_screening
      GROUP BY screening_status
      )
      SELECT
      (SELECT COUNT(*) FROM latest_screening WHERE screening_status != 'not_screened') AS screened,
      (SELECT COUNT(*) FROM latest_counseling) AS counseled,
      (SELECT COUNT(*) FROM not_counseled) AS not_counseled,
      (SELECT COUNT(*) FROM not_screened) AS not_screened,
      (SELECT COUNT(*) FROM employees) AS total_employees,
      json_agg(json_build_object('status', status, 'count', status_count)) AS statuses
      FROM status_counts;
    `);

    const row = currentMonthResult.rows[0];

    const summary = {
      atRisk: {
        count: 0,
        total: Number(row.screened || 0),
      },
      notScreened: {
        count: Number(row.not_screened || 0),
        total: Number(row.total_employees || 0),
      },
      notCounseled: {
        count: Number(row.not_counseled || 0),
        total: 0,
      },
    };

    const overall = {
      atRisk: 0,
      monitored: 0,
      stable: 0,
      notScreened: 0,
    };

    if (Array.isArray(row.statuses)) {
      for (const status of row.statuses) {
        if (status.status === 'at_risk') {
          overall.atRisk = Number(status.count);
          summary.atRisk.count = Number(status.count);
          summary.notCounseled.total = Number(overall.atRisk);
        } else if (status.status === 'monitored') {
          overall.monitored = Number(status.count);
        } else if (status.status === 'stable') {
          overall.stable = Number(status.count);
        } else if (status.status === 'not_screened') {
          overall.notScreened = Number(status.count);
        }
      }
    }

    const status = {
      screening: {
        completed: Number(row.screened || 0),
        notCompleted: Number(row.not_screened || 0),
      },
      counseling: {
        completed: Number(row.counseled || 0),
        notCompleted: Number(row.not_counseled || 0),
      },
    };

    return {
      summary,
      status,
      overall,
    };
  }

  async getYearlyMentalHealthStats(
    year: number,
    department?: string,
    orgId?: string,
  ): Promise<any> {
    const conditions: SQL<unknown>[] = [
      sql`EXTRACT(YEAR FROM s.date) = ${year}`,
      sql`u.role = 'employee'`,
      sql`u.organization_id = ${orgId}`,
    ];

    if (department) conditions.push(sql`ep.department = ${department}`);

    const result = await this.db.execute(sql`
    WITH latest_screening AS (
      SELECT DISTINCT ON (s.user_id, EXTRACT(MONTH FROM s.date))
        s.user_id,
        s.screening_status,
        EXTRACT(MONTH FROM s.date) AS month
      FROM screenings s
      INNER JOIN employee_profiles ep ON s.user_id = ep.user_id
      INNER JOIN users u ON s.user_id = u.id
      WHERE ${sql.join(conditions, sql` AND `)}
      ORDER BY s.user_id, EXTRACT(MONTH FROM s.date), s.date DESC
    ),
    monthly_counts AS (
      SELECT
        month,
        screening_status,
        COUNT(*) AS count
      FROM latest_screening
      GROUP BY month, screening_status
    ),
    monthly_totals AS (
      SELECT
        month,
        SUM(CASE WHEN screening_status = 'at_risk' THEN count ELSE 0 END) AS at_risk,
        SUM(CASE WHEN screening_status = 'monitored' THEN count ELSE 0 END) AS monitored,
        SUM(CASE WHEN screening_status = 'stable' THEN count ELSE 0 END) AS stable
      FROM monthly_counts
      GROUP BY month
    )
    SELECT
      COALESCE(json_agg(json_build_object(
        'month', month,
        'atRisk', at_risk,
        'monitored', monitored,
        'stable', stable
      )), '[]') AS monthly_stats
    FROM monthly_totals
  `);

    const monthlyStats = Array.isArray(result.rows[0]?.monthly_stats)
      ? result.rows[0].monthly_stats
      : [];

    return monthlyStats.map((stat) => ({
      month: months[stat.month - 1],
      atRisk: stat.atRisk ?? 0,
      monitored: stat.monitored ?? 0,
      stable: stat.stable ?? 0,
    }));
  }

  async bulkCreateEmployees(
    usersData: Array<CreateUser>,
    profilesData: Array<EmployeeProfileUploadDto>,
  ): Promise<void> {
    await this.db.transaction(async (tx) => {
      await tx.insert(users).values(usersData);
      await tx.insert(employeeProfiles).values(profilesData);
    });
  }
}
