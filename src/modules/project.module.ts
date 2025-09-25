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
import { CommonModule } from '../common/common.module';
import { Project } from '../entities/project.entity';
import { ProjectView } from '../entities/project-view.entity';
import { User } from '../entities/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Project, ProjectView, User]),
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
  ],
  exports: [SearchService, ProjectService, ProjectViewTrackingService],
})
export class ProjectModule {}
