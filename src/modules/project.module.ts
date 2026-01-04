import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProjectsController } from '../controllers/projects.controller';
import { ProjectManagementController } from '../controllers/project-management.controller';
import { SearchService } from '../services/search.service';
import { ProjectService } from '../services/project.service';
import { FilterService } from '../services/filter.service';
import { SortingService } from '../services/sorting.service';
import { SuggestionService } from '../services/suggestion.service';
import { ProjectViewTrackingService } from '../services/project-view-tracking.service';
import { ProjectStatusService } from '../services/project-status.service';
import { StudentOnboardingService } from '../services/student-onboarding.service';
import { CommonModule } from '../common/common.module';
import { Project } from '../entities/project.entity';
import { ProjectView } from '../entities/project-view.entity';
import { ProjectBookmark } from '../entities/project-bookmark.entity';
import { BookmarkCategory } from '../entities/bookmark-category.entity';
import { StudentProfile } from '../entities/student-profile.entity';
import { User } from '../entities/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Project,
      ProjectView,
      ProjectBookmark,
      BookmarkCategory,
      StudentProfile,
      User,
    ]),
    CommonModule,
  ],
  controllers: [ProjectsController, ProjectManagementController],
  providers: [
    SearchService,
    ProjectService,
    FilterService,
    SortingService,
    SuggestionService,
    ProjectViewTrackingService,
    ProjectStatusService,
    StudentOnboardingService,
  ],
  exports: [
    SearchService,
    ProjectService,
    ProjectViewTrackingService,
    StudentOnboardingService,
  ],
})
export class ProjectModule {}
