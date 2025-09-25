import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CacheModule } from '@nestjs/cache-manager';
import { ConfigModule } from '@nestjs/config';
import { AuditLog } from '../entities/audit-log.entity';
import { AuditService } from './services/audit.service';
import { InputSanitizationService } from './services/input-sanitization.service';
import { RateLimitingService } from './services/rate-limiting.service';
import { UniversityValidationService } from './services/university-validation.service';
import { IsUniversityEmailConstraint } from './validators/university-email.validator';

@Module({
  imports: [
    TypeOrmModule.forFeature([AuditLog]),
    CacheModule.register(),
    ConfigModule,
  ],
  providers: [
    AuditService,
    InputSanitizationService,
    RateLimitingService,
    UniversityValidationService,
    IsUniversityEmailConstraint,
  ],
  exports: [
    AuditService,
    InputSanitizationService,
    RateLimitingService,
    UniversityValidationService,
    IsUniversityEmailConstraint,
  ],
})
export class CommonModule { }
