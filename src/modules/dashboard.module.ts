import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DashboardController } from '../controllers/dashboard.controller';
import { DashboardService } from '../services/dashboard.service';
import { StudentDashboardService } from '../services/student-dashboard.service';
import { SupervisorDashboardService } from '../services/supervisor-dashboard.service';
import { ProjectApplicationService } from '../services/project-application.service';
import { UserActivityService } from '../services/user-activity.service';
import { AnalyticsService } from '../services/analytics.service';
import { User } from '../entities/user.entity';
import { Project } from '../entities/project.entity';
import { Milestone } from '../entities/milestone.entity';
import { ProjectBookmark } from '../entities/project-bookmark.entity';
import { ProjectApplication } from '../entities/project-application.entity';
import { UserActivity } from '../entities/user-activity.entity';
import { Recommendation } from '../entities/recommendation.entity';
import { Conversation } from '../entities/conversation.entity';
import { ConversationMessage } from '../entities/conversation-message.entity';
import { PlatformAnalytics } from '../entities/platform-analytics.entity';

@Module({
    imports: [
        TypeOrmModule.forFeature([
            User,
            Project,
            Milestone,
            ProjectBookmark,
            ProjectApplication,
            UserActivity,
            Recommendation,
            Conversation,
            ConversationMessage,
            PlatformAnalytics,
        ]),
    ],
    controllers: [DashboardController],
    providers: [
        DashboardService,
        StudentDashboardService,
        SupervisorDashboardService,
        ProjectApplicationService,
        UserActivityService,
        AnalyticsService,
    ],
    exports: [
        DashboardService,
        StudentDashboardService,
        SupervisorDashboardService,
        ProjectApplicationService,
        UserActivityService,
    ],
})
export class DashboardModule { }