import { Module } from '@nestjs/common';
import { StudentProfilesController } from './interfaces/student.controller';
import { StudentProfilesService } from './application/student.service';
import { StudentsRepository } from './infrastructure/student.repository';
import { ExcelLib } from '@/common/libs/excel.lib';

@Module({
  controllers: [StudentProfilesController],
  providers: [StudentProfilesService, StudentsRepository, ExcelLib],
  exports: [StudentProfilesService],
})
export class StudentProfilesModule {}
