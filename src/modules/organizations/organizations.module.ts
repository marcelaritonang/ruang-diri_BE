import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';

import { multerConfigFactory } from '@/config/multer.config';
import { CloudStorageModule } from '@/common/cloud-storage/cloud-storage.module';

import { UsersModule } from '@modules/users/users.module';
import { EmployeeProfilesModule } from '@/modules/employees/employees.module';
import { StudentProfilesModule } from '@/modules/students/student.module';

import { OrganizationsService } from './application/organizations.service';
import { OrganizationsRepository } from './infrastructure/organizations.repository';
import { OrganizationsController } from './interfaces/organizations.controller';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    MulterModule.register(multerConfigFactory('organizations')),
    UsersModule,
    EmployeeProfilesModule,
    StudentProfilesModule,
    NotificationsModule,
    CloudStorageModule,
  ],
  providers: [OrganizationsService, OrganizationsRepository],
  exports: [OrganizationsService],
  controllers: [OrganizationsController],
})
export class OrganizationsModule {}