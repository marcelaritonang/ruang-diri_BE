import { Injectable } from '@nestjs/common';
import { DrizzleService } from '@common/drizzle/drizzle.service';

export interface TransactionContext {
  tx: any;
}

@Injectable()
export class TransactionService {
  constructor(private readonly drizzleService: DrizzleService) {}

  async executeTransaction<T>(
    operations: (context: TransactionContext) => Promise<T>,
  ): Promise<T> {
    return await this.drizzleService.db.transaction(async (tx) => {
      const context: TransactionContext = { tx };
      return await operations(context);
    });
  }
}
