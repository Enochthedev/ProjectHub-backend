import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Project } from '../entities/project.entity';
import { ProjectBookmark } from '../entities/project-bookmark.entity';
import { BookmarkCategory } from '../entities/bookmark-category.entity';
import { StudentProfile } from '../entities/student-profile.entity';
import { ApprovalStatus, DifficultyLevel } from '../common/enums';

@Injectable()
export class StudentOnboardingService {
  private readonly logger = new Logger(StudentOnboardingService.name);

  constructor(
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
    @InjectRepository(ProjectBookmark)
    private readonly projectBookmarkRepository: Repository<ProjectBookmark>,
    @InjectRepository(BookmarkCategory)
    private readonly bookmarkCategoryRepository: Repository<BookmarkCategory>,
    @InjectRepository(StudentProfile)
    private readonly studentProfileRepository: Repository<StudentProfile>,
  ) {}

  /**
   * Initialize default projects and recommendations for a new student
   */
  async initializeStudentProjects(userId: string): Promise<void> {
    try {
      this.logger.log(`Initializing projects for new student: ${userId}`);

      // Get student profile to understand their interests
      const studentProfile = await this.studentProfileRepository.findOne({
        where: { user: { id: userId } },
      });

      if (!studentProfile) {
        this.logger.warn(
          `No student profile found for user ${userId}. Skipping project initialization.`,
        );
        return;
      }

      // Create default bookmark categories for the student
      const categories = await this.createDefaultCategories(userId);
      const recommendedCategory = categories.find(
        (c) => c.name === '⭐ Recommended for You',
      );

      // 1. Find and bookmark the onboarding project
      await this.bookmarkOnboardingProject(userId, recommendedCategory?.id);

      // 2. Find and bookmark projects matching student's interests and specializations
      await this.bookmarkRecommendedProjects(
        userId,
        studentProfile,
        recommendedCategory?.id,
      );

      this.logger.log(
        `Successfully initialized projects for student: ${userId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to initialize projects for student ${userId}:`,
        error,
      );
      // Don't throw error - this is a non-critical operation
    }
  }

  /**
   * Create default bookmark categories for new students
   */
  private async createDefaultCategories(
    userId: string,
  ): Promise<BookmarkCategory[]> {
    const defaultCategories = [
      {
        name: '⭐ Recommended for You',
        description: 'Projects recommended based on your interests and skills',
        color: '#FFD700',
      },
      {
        name: '📚 Reading List',
        description: 'Projects to review later',
        color: '#4ECDC4',
      },
      {
        name: '❤️ Favorites',
        description: 'Your favorite projects',
        color: '#FF6B6B',
      },
      {
        name: '🎯 Top Choices',
        description: 'Projects you want to apply to',
        color: '#45B7D1',
      },
    ];

    const createdCategories: BookmarkCategory[] = [];

    for (const categoryData of defaultCategories) {
      // Check if category already exists
      const existingCategory = await this.bookmarkCategoryRepository.findOne({
        where: {
          studentId: userId,
          name: categoryData.name,
        },
      });

      if (!existingCategory) {
        const category = this.bookmarkCategoryRepository.create({
          ...categoryData,
          studentId: userId,
        });
        const saved = await this.bookmarkCategoryRepository.save(category);
        createdCategories.push(saved);
        this.logger.log(
          `Created bookmark category: ${categoryData.name} for student ${userId}`,
        );
      } else {
        createdCategories.push(existingCategory);
      }
    }

    return createdCategories;
  }

  /**
   * Bookmark the onboarding project for new students
   */
  private async bookmarkOnboardingProject(
    userId: string,
    categoryId?: string,
  ): Promise<void> {
    // Find the onboarding project by title
    const onboardingProject = await this.projectRepository.findOne({
      where: {
        title: '🎓 Getting Started with ProjectHub - Your First Project',
        approvalStatus: ApprovalStatus.APPROVED,
      },
    });

    if (!onboardingProject) {
      this.logger.warn(
        'Onboarding project not found. Make sure to run seed:projects',
      );
      return;
    }

    // Check if already bookmarked
    const existingBookmark = await this.projectBookmarkRepository.findOne({
      where: {
        studentId: userId,
        projectId: onboardingProject.id,
      },
    });

    if (!existingBookmark) {
      const bookmark = this.projectBookmarkRepository.create({
        studentId: userId,
        projectId: onboardingProject.id,
        categoryId: categoryId || null,
      });

      await this.projectBookmarkRepository.save(bookmark);
      this.logger.log(
        `Bookmarked onboarding project for student: ${userId}`,
      );
    }
  }

  /**
   * Find and bookmark projects matching student's interests and specializations
   */
  private async bookmarkRecommendedProjects(
    userId: string,
    studentProfile: StudentProfile,
    categoryId?: string,
  ): Promise<void> {
    // Build query to find matching projects
    const queryBuilder = this.projectRepository
      .createQueryBuilder('project')
      .where('project.approvalStatus = :status', {
        status: ApprovalStatus.APPROVED,
      })
      .andWhere('project.studentId IS NULL') // Only available projects
      .andWhere(
        "project.title != '🎓 Getting Started with ProjectHub - Your First Project'",
      ); // Exclude onboarding

    // Filter by preferred specializations if available
    if (
      studentProfile.preferredSpecializations &&
      studentProfile.preferredSpecializations.length > 0
    ) {
      queryBuilder.andWhere('project.specialization IN (:...specs)', {
        specs: studentProfile.preferredSpecializations,
      });
    }

    // Prefer beginner and intermediate projects for new students
    queryBuilder.andWhere('project.difficultyLevel IN (:...levels)', {
      levels: [DifficultyLevel.BEGINNER, DifficultyLevel.INTERMEDIATE],
    });

    // Get top 5 recommended projects
    const recommendedProjects = await queryBuilder
      .orderBy('RANDOM()') // Random selection for variety
      .limit(5)
      .getMany();

    // Bookmark each recommended project
    for (const project of recommendedProjects) {
      const existingBookmark = await this.projectBookmarkRepository.findOne({
        where: {
          studentId: userId,
          projectId: project.id,
        },
      });

      if (!existingBookmark) {
        const bookmark = this.projectBookmarkRepository.create({
          studentId: userId,
          projectId: project.id,
          categoryId: categoryId || null,
        });

        await this.projectBookmarkRepository.save(bookmark);
        this.logger.log(
          `Bookmarked recommended project: ${project.title} for student ${userId}`,
        );
      }
    }

    // If no specialized projects found, bookmark some general beginner projects
    if (recommendedProjects.length === 0) {
      const generalProjects = await this.projectRepository.find({
        where: {
          approvalStatus: ApprovalStatus.APPROVED,
          studentId: null,
          difficultyLevel: DifficultyLevel.BEGINNER,
        },
        take: 3,
      });

      for (const project of generalProjects) {
        const existingBookmark = await this.projectBookmarkRepository.findOne({
          where: {
            studentId: userId,
            projectId: project.id,
          },
        });

        if (!existingBookmark) {
          const bookmark = this.projectBookmarkRepository.create({
            studentId: userId,
            projectId: project.id,
            categoryId: categoryId || null,
          });

          await this.projectBookmarkRepository.save(bookmark);
        }
      }
    }
  }

  /**
   * Get recommended projects for a student (can be called anytime)
   */
  async getRecommendedProjects(userId: string): Promise<Project[]> {
    const studentProfile = await this.studentProfileRepository.findOne({
      where: { user: { id: userId } },
    });

    if (!studentProfile) {
      return [];
    }

    const queryBuilder = this.projectRepository
      .createQueryBuilder('project')
      .leftJoinAndSelect('project.supervisor', 'supervisor')
      .leftJoinAndSelect('supervisor.supervisorProfile', 'supervisorProfile')
      .where('project.approvalStatus = :status', {
        status: ApprovalStatus.APPROVED,
      })
      .andWhere('project.studentId IS NULL');

    if (
      studentProfile.preferredSpecializations &&
      studentProfile.preferredSpecializations.length > 0
    ) {
      queryBuilder.andWhere('project.specialization IN (:...specs)', {
        specs: studentProfile.preferredSpecializations,
      });
    }

    return queryBuilder
      .orderBy('project.year', 'DESC')
      .addOrderBy('project.createdAt', 'DESC')
      .limit(10)
      .getMany();
  }
}
