import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../entities/user.entity';
import { StudentProfile } from '../entities/student-profile.entity';
import { SupervisorProfile } from '../entities/supervisor-profile.entity';
import { AuditLog } from '../entities/audit-log.entity';
import { AdminAuditLog } from '../entities/admin-audit-log.entity';
import { RefreshToken } from '../entities/refresh-token.entity';
import { EmailDelivery } from '../entities/email-delivery.entity';
import { AuthController } from './auth.controller';
import { EmailTestController } from './controllers/email-test.controller';
import { AuthService } from './auth.service';
import { JwtTokenService } from './services/jwt.service';
import { PasswordService } from './services/password.service';
import { EmailService } from './services/email.service';
import { AuditService } from './services/audit.service';
import { TokenManagementService } from './services/token-management.service';
import { TokenCleanupService } from './services/token-cleanup.service';
import { AdminSessionService } from './services/admin-session.service';
import { AdminAuditService } from './services/admin-audit.service';
import { AdminSecurityService } from './services/admin-security.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { NotificationModule } from '../modules/notification.module';

@Module({
  imports: [
    ConfigModule,
    PassportModule,
    ScheduleModule.forRoot(),
    JwtModule.register({}), // Configuration will be handled by JwtTokenService
    TypeOrmModule.forFeature([User, StudentProfile, SupervisorProfile, AuditLog, AdminAuditLog, RefreshToken, EmailDelivery]),
    forwardRef(() => NotificationModule), // Forward reference to avoid circular dependency
  ],
  controllers: [AuthController, EmailTestController],
  providers: [
    AuthService,
    JwtTokenService,
    PasswordService,
    EmailService,
    AuditService,
    TokenManagementService,
    TokenCleanupService,
    AdminSessionService,
    AdminAuditService,
    AdminSecurityService,
    JwtStrategy,
  ],
  exports: [
    AuthService,
    JwtTokenService,
    PasswordService,
    EmailService,
    AuditService,
    TokenManagementService,
    AdminSessionService,
    AdminAuditService,
    AdminSecurityService,
  ],
})
export class AuthModule { }
