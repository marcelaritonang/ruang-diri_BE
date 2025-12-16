import { asc, desc, type SQL, sql, eq } from 'drizzle-orm';
import { PgColumn, PgSelect } from 'drizzle-orm/pg-core';

type ColumnConfig = {
  column: SQL<unknown>;
  nullCheck?: boolean;
};

export const months = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

export const totalCountQuery = sql`count(*) over()`.as('total_count');

export async function withPagination<T extends PgSelect>(
  qb: T,
  orderByColumns: (PgColumn | SQL | SQL.Aliased)[],
  page = 1,
  pageSize = 10,
): Promise<T> {
  return qb
    .orderBy(...orderByColumns)
    .limit(pageSize)
    .offset((page - 1) * pageSize);
}

export async function executePagedQuery<T>(
  baseQuery: PgSelect,
  orderByColumns: (PgColumn | SQL | SQL.Aliased)[],
  page = 1,
  limit = 10,
  genderCount = false,
): Promise<{
  data: T[];
  metadata: {
    totalData: number;
    totalPage: number;
    page: number;
    limit: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
    byGender?: Record<string, number>;
  };
}> {
  const paginatedQuery = await withPagination(
    baseQuery,
    orderByColumns,
    page,
    limit,
  );

  const totalCount =
    paginatedQuery.length > 0 ? Number(paginatedQuery[0].totalCount) : 0;
  const pageCount = Math.ceil(totalCount / limit);

  let genderTotal: Record<string, number> = {};

  if (genderCount && paginatedQuery.length > 0) {
    genderTotal.male = Number(paginatedQuery[0].totalMale) || 0;
    genderTotal.female = Number(paginatedQuery[0].totalFemale) || 0;
  }

  return {
    data: paginatedQuery.map(
      ({ totalCount: _, totalMale: __, totalFemale: ___, ...rest }) => rest,
    ) as T[],
    metadata: {
      totalData: totalCount,
      totalPage: pageCount,
      page: Number(page),
      limit: Number(limit),
      hasPreviousPage: page > 1,
      hasNextPage: page < pageCount,
      ...(genderCount && { byGender: genderTotal }),
    },
  };
}

export function getSortColumns(
  sortMapping: Record<string, SQL<unknown>[]>,
  sortKey: string | undefined,
  order: 'asc' | 'desc' | '',
): SQL<unknown>[] {
  const key = sortMapping.hasOwnProperty(sortKey || '') ? sortKey! : 'default';
  const columns = sortMapping[key];

  return key === 'default'
    ? columns
    : columns.map((col) => (order === 'desc' ? desc(col) : asc(col)));
}

export function buildWhereConditions<TFilters extends Record<string, any>>(
  filters: TFilters,
  columnMap: {
    [K in keyof TFilters]?: ColumnConfig;
  },
): SQL<unknown>[] {
  const conditions: SQL<unknown>[] = [];

  for (const key in filters) {
    const value = filters[key];
    const config = columnMap[key];

    if (value === undefined || value === null || value === '' || !config) {
      continue;
    }

    if (config.nullCheck) {
      if (value === true) {
        conditions.push(sql`${config.column} IS NOT NULL`);
      } else if (value === false) {
        conditions.push(sql`${config.column} IS NULL`);
      } else {
        conditions.push(eq(config.column, value));
      }
    } else {
      conditions.push(eq(config.column, value));
    }
  }

  return conditions;
}
