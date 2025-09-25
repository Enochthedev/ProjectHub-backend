import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../entities/user.entity';
import { StudentProfile } from '../entities/student-profile.entity';
import { SupervisorProfile } from '../entities/supervisor-profile.entity';
import { RefreshToken } from '../entities/refresh-token.entity';
import { AdminAuditLog } from '../entities/admin-audit-log.entity';
import { AuditLog } from '../entities/audit-log.entity';
import { UsersController } from './users.controller';
import { AdminController } from './admin.controller';
import { AdminUserManagementController } from '../controllers/admin-user-management.controller';
import { AdminBulkOperationsController } from '../controllers/admin-bulk-operations.controller';
import { AdminUserAnalyticsController } from '../controllers/admin-user-analytics.controller';
import { StudentProfileService } from './student-profile.service';
import { SupervisorProfileService } from './supervisor-profile.service';
import { AdminService } from './admin.service';
import { AdminUserManagementService } from '../services/admin-user-management.service';
import { AdminBulkOperationsService } from '../services/admin-bulk-operations.service';
import { AdminUserAnalyticsService } from '../services/admin-user-analytics.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      StudentProfile,
      SupervisorProfile,
      RefreshToken,
      AdminAuditLog,
      AuditLog,
    ]),
    AuthModule,
  ],
  controllers: [
    UsersController,
    AdminController,
    AdminUserManagementController,
    AdminBulkOperationsController,
    AdminUserAnalyticsController,
  ],
  providers: [
    StudentProfileService,
    SupervisorProfileService,
    AdminService,
    AdminUserManagementService,
    AdminBulkOperationsService,
    AdminUserAnalyticsService,
  ],
  exports: [
    StudentProfileService,
    SupervisorProfileService,
    AdminService,
    AdminUserManagementService,
    AdminBulkOperationsService,
    AdminUserAnalyticsService,
  ],
})
export class UsersModule {}
