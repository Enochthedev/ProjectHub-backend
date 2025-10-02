import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { NotificationService } from '../services/notification.service';
import { MilestoneTeamNotificationService } from '../services/milestone-team-notification.service';
import { Notification } from '../entities/notification.entity';
import { NotificationPreference } from '../entities/notification-preference.entity';
import { MilestoneTeamNotification } from '../entities/milestone-team-notification.entity';
import { SharedMilestone } from '../entities/shared-milestone.entity';
import { User } from '../entities/user.entity';
import { Milestone } from '../entities/milestone.entity';
import { AuthModule } from '../auth/auth.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([
            Notification,
            NotificationPreference,
            MilestoneTeamNotification,
            SharedMilestone,
            User,
            Milestone,
        ]),
        ScheduleModule.forRoot(),
        forwardRef(() => AuthModule), // Forward reference to avoid circular dependency
    ],
    providers: [
        NotificationService,
        MilestoneTeamNotificationService,
    ],
    exports: [
        NotificationService,
        MilestoneTeamNotificationService,
    ],
})
export class NotificationModule { }