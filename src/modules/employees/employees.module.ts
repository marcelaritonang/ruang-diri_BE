import { Module } from '@nestjs/common';
import { EmployeeProfilesRepository } from './infrastructure/employees.repository';
import { EmployeeProfilesService } from './application/employees.service';
import { EmployeeProfilesController } from './interfaces/employees.controller';

import { ExcelLib } from '@/common/libs/excel.lib';

@Module({
  controllers: [EmployeeProfilesController],
  providers: [EmployeeProfilesService, EmployeeProfilesRepository, ExcelLib],
  exports: [EmployeeProfilesService],
})
export class EmployeeProfilesModule {}
