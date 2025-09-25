import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BookmarkController } from '../controllers/bookmark.controller';
import { BookmarkService } from '../services/bookmark.service';
import { CommonModule } from '../common/common.module';
import { ProjectBookmark } from '../entities/project-bookmark.entity';
import { Project } from '../entities/project.entity';
import { BookmarkCategory } from '../entities/bookmark-category.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([ProjectBookmark, Project, BookmarkCategory]),
    CommonModule,
  ],
  controllers: [BookmarkController],
  providers: [BookmarkService],
  exports: [BookmarkService],
})
export class BookmarkModule {}
