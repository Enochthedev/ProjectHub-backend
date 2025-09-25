import { Repository, DataSource } from 'typeorm';
import {
  User,
  StudentProfile,
  SupervisorProfile,
  Project,
  ProjectBookmark,
  ProjectView,
  BookmarkCategory,
} from '@/entities';
import { UserFixtures, ProjectFixtures } from '../fixtures';
import { Logger } from '@nestjs/common';

export class TestDataUtil {
  private static readonly logger = new Logger(TestDataUtil.name);
  private readonly logger = new Logger(TestDataUtil.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly userRepository: Repository<User>,
    private readonly studentProfileRepository: Repository<StudentProfile>,
    private readonly supervisorProfileRepository: Repository<SupervisorProfile>,
    private readonly projectRepository: Repository<Project>,
    private readonly projectBookmarkRepository: Repository<ProjectBookmark>,
    private readonly projectViewRepository: Repository<ProjectView>,
    private readonly bookmarkCategoryRepository: Repository<BookmarkCategory>,
  ) {}

  /**
   * Clean all test data from the database
   */
  async cleanupAllTestData(): Promise<void> {
    this.logger.log('Starting comprehensive test data cleanup...');

    try {
      // Delete in order to respect foreign key constraints
      await this.projectViewRepository.delete({});
      await this.projectBookmarkRepository.delete({});
      await this.bookmarkCategoryRepository.delete({});
      await this.projectRepository.delete({});
      await this.studentProfileRepository.delete({});
      await this.supervisorProfileRepository.delete({});
      await this.userRepository.delete({});

      this.logger.log('Test data cleanup completed successfully');
    } catch (error) {
      this.logger.error('Test data cleanup failed', error);
      throw error;
    }
  }

  /**
   * Clean only project-related test data
   */
  async cleanupProjectData(): Promise<void> {
    this.logger.log('Starting project data cleanup...');

    try {
      await this.projectViewRepository.delete({});
      await this.projectBookmarkRepository.delete({});
      await this.bookmarkCategoryRepository.delete({});
      await this.projectRepository.delete({});

      this.logger.log('Project data cleanup completed successfully');
    } catch (error) {
      this.logger.error('Project data cleanup failed', error);
      throw error;
    }
  }

  /**
   * Reset database to a clean state and seed basic test data
   */
  async resetToCleanState(): Promise<void> {
    this.logger.log('Resetting database to clean state...');

    await this.cleanupAllTestData();
    await this.seedBasicTestData();

    this.logger.log('Database reset completed successfully');
  }

  /**
   * Seed basic test data (users and profiles)
   */
  async seedBasicTestData(): Promise<{
    students: User[];
    supervisors: User[];
  }> {
    this.logger.log('Seeding basic test data...');

    // Create test supervisors
    const supervisorData = await Promise.all([
      UserFixtures.createTestSupervisor({
        email: 'test.supervisor1@ui.edu.ng',
      }),
      UserFixtures.createTestSupervisor({
        email: 'test.supervisor2@ui.edu.ng',
      }),
      UserFixtures.createTestSupervisor({
        email: 'test.supervisor3@ui.edu.ng',
      }),
    ]);

    const supervisors: User[] = [];
    for (const data of supervisorData) {
      const user = this.userRepository.create(data);
      const savedUser = await this.userRepository.save(user);

      const profileData = UserFixtures.createTestSupervisorProfile();
      const profile = this.supervisorProfileRepository.create({
        ...profileData,
        user: savedUser,
      });
      await this.supervisorProfileRepository.save(profile);

      supervisors.push(savedUser);
    }

    // Create test students
    const studentData = await Promise.all([
      UserFixtures.createTestStudent({ email: 'test.student1@ui.edu.ng' }),
      UserFixtures.createTestStudent({ email: 'test.student2@ui.edu.ng' }),
      UserFixtures.createTestStudent({ email: 'test.student3@ui.edu.ng' }),
      UserFixtures.createTestStudent({ email: 'test.student4@ui.edu.ng' }),
      UserFixtures.createTestStudent({ email: 'test.student5@ui.edu.ng' }),
    ]);

    const students: User[] = [];
    for (const data of studentData) {
      const user = this.userRepository.create(data);
      const savedUser = await this.userRepository.save(user);

      const profileData = UserFixtures.createTestStudentProfile();
      const profile = this.studentProfileRepository.create({
        ...profileData,
        user: savedUser,
      });
      await this.studentProfileRepository.save(profile);

      students.push(savedUser);
    }

    this.logger.log(
      `Created ${supervisors.length} supervisors and ${students.length} students`,
    );
    return { students, supervisors };
  }

  /**
   * Seed comprehensive project test data
   */
  async seedProjectTestData(supervisors?: User[]): Promise<{
    projects: Project[];
    bookmarks: ProjectBookmark[];
    views: ProjectView[];
    categories: BookmarkCategory[];
  }> {
    this.logger.log('Seeding project test data...');

    // Get supervisors if not provided
    if (!supervisors) {
      supervisors = await this.userRepository.find({
        where: { role: 'supervisor' as any },
      });
    }

    if (supervisors.length === 0) {
      throw new Error(
        'No supervisors found. Please seed basic test data first.',
      );
    }

    // Create test projects
    const projectsData = ProjectFixtures.createSearchTestProjects();
    const projects: Project[] = [];

    for (const projectData of projectsData) {
      const supervisor =
        supervisors[Math.floor(Math.random() * supervisors.length)];
      const project = this.projectRepository.create({
        ...projectData,
        supervisorId: supervisor.id,
      });
      const savedProject = await this.projectRepository.save(project);
      projects.push(savedProject);
    }

    // Get students for bookmarks and views
    const students = await this.userRepository.find({
      where: { role: 'student' as any },
    });

    // Create bookmark categories
    const categories: BookmarkCategory[] = [];
    if (students.length > 0) {
      const categoryData = [
        {
          name: 'Favorites',
          description: 'My favorite projects',
          color: '#FF6B6B',
        },
        {
          name: 'Research',
          description: 'Research-related projects',
          color: '#4ECDC4',
        },
        {
          name: 'Web Dev',
          description: 'Web development projects',
          color: '#45B7D1',
        },
      ];

      for (const student of students.slice(0, 2)) {
        // Create categories for first 2 students
        for (const catData of categoryData) {
          const category = this.bookmarkCategoryRepository.create({
            ...catData,
            studentId: student.id,
          });
          const savedCategory =
            await this.bookmarkCategoryRepository.save(category);
          categories.push(savedCategory);
        }
      }
    }

    // Create bookmarks
    const bookmarks: ProjectBookmark[] = [];
    if (students.length > 0 && projects.length > 0) {
      for (const student of students) {
        // Each student bookmarks 1-3 projects
        const bookmarkCount = Math.floor(Math.random() * 3) + 1;
        const shuffledProjects = [...projects].sort(() => 0.5 - Math.random());

        for (let i = 0; i < bookmarkCount && i < shuffledProjects.length; i++) {
          const bookmark = this.projectBookmarkRepository.create({
            studentId: student.id,
            projectId: shuffledProjects[i].id,
            categoryId: categories.length > 0 ? categories[0].id : null,
          });
          const savedBookmark =
            await this.projectBookmarkRepository.save(bookmark);
          bookmarks.push(savedBookmark);
        }
      }
    }

    // Create project views
    const views: ProjectView[] = [];
    const sampleIPs = ['192.168.1.100', '192.168.1.101', '10.0.0.50'];
    const sampleUserAgent = 'Mozilla/5.0 (Test) AppleWebKit/537.36';

    for (const project of projects) {
      // Each project gets 5-15 views
      const viewCount = Math.floor(Math.random() * 10) + 5;

      for (let i = 0; i < viewCount; i++) {
        const isAuthenticated = Math.random() > 0.3;
        const viewerId =
          isAuthenticated && students.length > 0
            ? students[Math.floor(Math.random() * students.length)].id
            : null;

        const view = this.projectViewRepository.create({
          projectId: project.id,
          viewerId,
          ipAddress: sampleIPs[Math.floor(Math.random() * sampleIPs.length)],
          userAgent: sampleUserAgent,
          viewedAt: new Date(
            Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000,
          ), // Last 30 days
        });
        const savedView = await this.projectViewRepository.save(view);
        views.push(savedView);
      }
    }

    this.logger.log(
      `Created ${projects.length} projects, ${bookmarks.length} bookmarks, ${views.length} views, ${categories.length} categories`,
    );
    return { projects, bookmarks, views, categories };
  }

  /**
   * Seed performance test data with large datasets
   */
  async seedPerformanceTestData(
    options: {
      projectCount?: number;
      userCount?: number;
      viewsPerProject?: number;
      bookmarksPerUser?: number;
    } = {},
  ): Promise<void> {
    const {
      projectCount = 1000,
      userCount = 100,
      viewsPerProject = 50,
      bookmarksPerUser = 10,
    } = options;

    this.logger.log(
      `Seeding performance test data: ${projectCount} projects, ${userCount} users...`,
    );

    // Clean existing data first
    await this.cleanupAllTestData();

    // Create users in batches
    const batchSize = 50;
    const supervisors: User[] = [];
    const students: User[] = [];

    // Create supervisors (10% of users)
    const supervisorCount = Math.floor(userCount * 0.1);
    const supervisorBatches = Math.ceil(supervisorCount / batchSize);

    for (let batch = 0; batch < supervisorBatches; batch++) {
      const batchStart = batch * batchSize;
      const batchEnd = Math.min(batchStart + batchSize, supervisorCount);
      const batchUsers = await UserFixtures.createMultipleSupervisors(
        batchEnd - batchStart,
      );

      for (const userData of batchUsers) {
        const user = this.userRepository.create(userData);
        const savedUser = await this.userRepository.save(user);
        supervisors.push(savedUser);
      }
    }

    // Create students (90% of users)
    const studentCount = userCount - supervisorCount;
    const studentBatches = Math.ceil(studentCount / batchSize);

    for (let batch = 0; batch < studentBatches; batch++) {
      const batchStart = batch * batchSize;
      const batchEnd = Math.min(batchStart + batchSize, studentCount);
      const batchUsers = await UserFixtures.createMultipleStudents(
        batchEnd - batchStart,
      );

      for (const userData of batchUsers) {
        const user = this.userRepository.create(userData);
        const savedUser = await this.userRepository.save(user);
        students.push(savedUser);
      }
    }

    // Create projects in batches
    const projects: Project[] = [];
    const projectBatches = Math.ceil(projectCount / batchSize);

    for (let batch = 0; batch < projectBatches; batch++) {
      const batchStart = batch * batchSize;
      const batchEnd = Math.min(batchStart + batchSize, projectCount);
      const batchProjects = ProjectFixtures.createMultipleProjects(
        batchEnd - batchStart,
      );

      for (const projectData of batchProjects) {
        const supervisor =
          supervisors[Math.floor(Math.random() * supervisors.length)];
        const project = this.projectRepository.create({
          ...projectData,
          supervisorId: supervisor.id,
        });
        const savedProject = await this.projectRepository.save(project);
        projects.push(savedProject);
      }
    }

    // Create views in batches
    const viewBatchSize = 100;
    for (const project of projects) {
      const views = ProjectFixtures.createMultipleProjectViews(
        [project.id],
        students.map((s) => s.id),
      ).slice(0, viewsPerProject);

      const viewBatches = Math.ceil(views.length / viewBatchSize);
      for (let batch = 0; batch < viewBatches; batch++) {
        const batchStart = batch * viewBatchSize;
        const batchEnd = Math.min(batchStart + viewBatchSize, views.length);
        const batchViews = views.slice(batchStart, batchEnd);

        for (const viewData of batchViews) {
          const view = this.projectViewRepository.create(viewData);
          await this.projectViewRepository.save(view);
        }
      }
    }

    // Create bookmarks in batches
    const bookmarkBatchSize = 100;
    for (const student of students) {
      const shuffledProjects = [...projects].sort(() => 0.5 - Math.random());
      const projectsToBookmark = shuffledProjects.slice(0, bookmarksPerUser);

      const bookmarks = projectsToBookmark.map((project) => ({
        studentId: student.id,
        projectId: project.id,
        categoryId: null,
      }));

      const bookmarkBatches = Math.ceil(bookmarks.length / bookmarkBatchSize);
      for (let batch = 0; batch < bookmarkBatches; batch++) {
        const batchStart = batch * bookmarkBatchSize;
        const batchEnd = Math.min(
          batchStart + bookmarkBatchSize,
          bookmarks.length,
        );
        const batchBookmarks = bookmarks.slice(batchStart, batchEnd);

        for (const bookmarkData of batchBookmarks) {
          const bookmark = this.projectBookmarkRepository.create(bookmarkData);
          await this.projectBookmarkRepository.save(bookmark);
        }
      }
    }

    this.logger.log('Performance test data seeding completed successfully');
  }

  /**
   * Create a transaction for test isolation
   */
  async withTransaction<T>(
    callback: (queryRunner: any) => Promise<T>,
  ): Promise<T> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const result = await callback(queryRunner);
      await queryRunner.commitTransaction();
      return result;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Get database statistics for monitoring
   */
  async getDatabaseStats(): Promise<{
    users: number;
    projects: number;
    bookmarks: number;
    views: number;
    categories: number;
  }> {
    const [users, projects, bookmarks, views, categories] = await Promise.all([
      this.userRepository.count(),
      this.projectRepository.count(),
      this.projectBookmarkRepository.count(),
      this.projectViewRepository.count(),
      this.bookmarkCategoryRepository.count(),
    ]);

    return { users, projects, bookmarks, views, categories };
  }
}
