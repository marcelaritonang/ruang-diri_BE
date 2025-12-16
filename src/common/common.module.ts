import { Global, Module } from '@nestjs/common';
import { ErrorHandlerUtil } from './utils/error-handler.util';
import { TransactionService } from './services/transaction.service';

@Global()
@Module({
  providers: [ErrorHandlerUtil, TransactionService],
  exports: [ErrorHandlerUtil, TransactionService],
})
export class CommonModule {}
