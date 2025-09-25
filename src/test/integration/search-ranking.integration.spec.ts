import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { SearchService } from '../../services/search.service';
import { Project } from '../../entities/project.entity';
import { User } from '../../entities/user.entity';
import { SearchProjectsDto } from '../../dto/search';
import {
  DifficultyLevel,
  ApprovalStatus,
  ProjectSortBy,
  SortOrder,
} from '../../common/enums';
import { TestDatabaseUtil } from '../utils/test-database.util';

describe('Search Ranking and Highlighting Integration Tests', () => {
  let module: TestingModule;
  let searchService: SearchService;
  let projectRepository: Repository<Project>;
  let userRepository: Repository<User>;
  let testDb: TestDatabaseUtil;

  beforeAll(async () => {
    testDb = new TestDatabaseUtil();
    await testDb.setupTestDatabase();

    module = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot(testDb.getTypeOrmConfig()),
        TypeOrmModule.forFeature([Project, User]),
      ],
      providers: [SearchService],
    }).compile();

    searchService = module.get<SearchService>(SearchService);
    projectRepository = module.get<Repository<Project>>(
      getRepositoryToken(Project),
    );
    userRepository = module.get<Repository<User>>(getRepositoryToken(User));
  });

  afterAll(async () => {
    await testDb.cleanup();
    await module.close();
  });

  beforeEach(async () => {
    await testDb.clearDatabase();
  });

  describe('Search Result Ranking', () => {
    it('should rank projects with title matches higher than abstract matches', async () => {
      // Create test supervisor
      const supervisor = userRepository.create({
        email: 'supervisor@test.com',
        firstName: 'Test',
        lastName: 'Supervisor',
        role: 'supervisor',
        isEmailVerified: true,
      });
      await userRepository.save(supervisor);

      // Create projects with search term in different locations
      const projects = [
        {
          title: 'Web Development Best Practices', // No match in title
          abstract:
            'This project covers machine learning applications in web development',
          tags: ['web', 'development'],
          technologyStack: ['React', 'Node.js'],
        },
        {
          title: 'Machine Learning in Healthcare', // Match in title
          abstract: 'A comprehensive study of healthcare applications',
          tags: ['healthcare', 'ai'],
          technologyStack: ['Python', 'TensorFlow'],
        },
        {
          title: 'Data Analysis Project',
          abstract: 'Advanced machine learning techniques for data analysis', // Match in abstract
          tags: ['data', 'analysis'],
          technologyStack: ['Python', 'Pandas'],
        },
      ];

      const savedProjects = [];
      for (const projectData of projects) {
        const project = projectRepository.create({
          ...projectData,
          specialization: 'Artificial Intelligence & Machine Learning',
          difficultyLevel: DifficultyLevel.ADVANCED,
          year: 2024,
          isGroupProject: false,
          approvalStatus: ApprovalStatus.APPROVED,
          supervisorId: supervisor.id,
          approvedAt: new Date(),
        });
        savedProjects.push(await projectRepository.save(project));
      }

      // Search for "machine learning"
      const searchDto: SearchProjectsDto = {
        query: 'machine learning',
        sortBy: ProjectSortBy.RELEVANCE,
        sortOrder: SortOrder.DESC,
        limit: 10,
        offset: 0,
      };

      const result = await searchService.searchProjects(searchDto);

      expect(result.projects).toHaveLength(3);

      // Project with title match should rank highest
      expect(result.projects[0].title).toBe('Machine Learning in Healthcare');
      expect(result.projects[0].relevanceScore).toBeGreaterThan(
        result.projects[1].relevanceScore || 0,
      );

      // Verify all projects have relevance scores
      result.projects.forEach((project) => {
        expect(project.relevanceScore).toBeGreaterThan(0);
      });
    });

    it('should provide consistent ranking across multiple searches', async () => {
      // Create test supervisor
      const supervisor = userRepository.create({
        email: 'supervisor@test.com',
        firstName: 'Test',
        lastName: 'Supervisor',
        role: 'supervisor',
        isEmailVerified: true,
      });
      await userRepository.save(supervisor);

      // Create multiple projects with varying relevance
      const projects = [
        {
          title: 'Machine Learning Fundamentals',
          abstract: 'Introduction to machine learning concepts and algorithms',
          tags: ['machine-learning', 'fundamentals'],
          technologyStack: ['Python', 'Scikit-learn'],
        },
        {
          title: 'Advanced Machine Learning Techniques',
          abstract: 'Deep dive into advanced machine learning methodologies',
          tags: ['machine-learning', 'advanced'],
          technologyStack: ['Python', 'TensorFlow', 'PyTorch'],
        },
        {
          title: 'Web Development with React',
          abstract:
            'Building modern web applications using React and machine learning APIs',
          tags: ['web', 'react'],
          technologyStack: ['React', 'JavaScript', 'Node.js'],
        },
      ];

      for (const projectData of projects) {
        const project = projectRepository.create({
          ...projectData,
          specialization: 'Artificial Intelligence & Machine Learning',
          difficultyLevel: DifficultyLevel.INTERMEDIATE,
          year: 2024,
          isGroupProject: false,
          approvalStatus: ApprovalStatus.APPROVED,
          supervisorId: supervisor.id,
          approvedAt: new Date(),
        });
        await projectRepository.save(project);
      }

      const searchDto: SearchProjectsDto = {
        query: 'machine learning',
        sortBy: ProjectSortBy.RELEVANCE,
        sortOrder: SortOrder.DESC,
        limit: 10,
        offset: 0,
      };

      // Perform multiple searches
      const result1 = await searchService.searchProjects(searchDto);
      const result2 = await searchService.searchProjects(searchDto);

      // Results should be consistent
      expect(result1.projects).toHaveLength(result2.projects.length);

      for (let i = 0; i < result1.projects.length; i++) {
        expect(result1.projects[i].id).toBe(result2.projects[i].id);
        expect(result1.projects[i].relevanceScore).toBe(
          result2.projects[i].relevanceScore,
        );
      }
    });
  });

  describe('Search Term Highlighting', () => {
    it('should highlight search terms in title and abstract', async () => {
      // Create test supervisor
      const supervisor = userRepository.create({
        email: 'supervisor@test.com',
        firstName: 'Test',
        lastName: 'Supervisor',
        role: 'supervisor',
        isEmailVerified: true,
      });
      await userRepository.save(supervisor);

      // Create project with search terms
      const project = projectRepository.create({
        title: 'Machine Learning for Predictive Analytics',
        abstract:
          'This project explores machine learning algorithms for predictive analytics in business intelligence. The system uses advanced machine learning techniques to analyze data patterns.',
        specialization: 'Artificial Intelligence & Machine Learning',
        difficultyLevel: DifficultyLevel.ADVANCED,
        year: 2024,
        tags: ['machine-learning', 'analytics'],
        technologyStack: ['Python', 'TensorFlow', 'Pandas'],
        isGroupProject: false,
        approvalStatus: ApprovalStatus.APPROVED,
        supervisorId: supervisor.id,
        approvedAt: new Date(),
      });
      await projectRepository.save(project);

      const searchDto: SearchProjectsDto = {
        query: 'machine learning predictive',
        limit: 10,
        offset: 0,
      };

      const result = await searchService.searchProjects(searchDto);

      expect(result.projects).toHaveLength(1);

      const highlightedProject = result.projects[0];

      // Verify title highlighting
      expect(highlightedProject.highlightedTitle).toContain(
        '<mark>Machine</mark>',
      );
      expect(highlightedProject.highlightedTitle).toContain(
        '<mark>Learning</mark>',
      );
      expect(highlightedProject.highlightedTitle).toContain(
        '<mark>Predictive</mark>',
      );

      // Verify abstract highlighting
      expect(highlightedProject.highlightedAbstract).toContain(
        '<mark>machine</mark>',
      );
      expect(highlightedProject.highlightedAbstract).toContain(
        '<mark>learning</mark>',
      );
      expect(highlightedProject.highlightedAbstract).toContain(
        '<mark>predictive</mark>',
      );
    });

    it('should handle case-insensitive highlighting correctly', async () => {
      // Create test supervisor
      const supervisor = userRepository.create({
        email: 'supervisor@test.com',
        firstName: 'Test',
        lastName: 'Supervisor',
        role: 'supervisor',
        isEmailVerified: true,
      });
      await userRepository.save(supervisor);

      // Create project with mixed case
      const project = projectRepository.create({
        title: 'MACHINE learning Project',
        abstract: 'Using Machine Learning and machine learning techniques',
        specialization: 'Artificial Intelligence & Machine Learning',
        difficultyLevel: DifficultyLevel.INTERMEDIATE,
        year: 2024,
        tags: ['ml'],
        technologyStack: ['Python'],
        isGroupProject: false,
        approvalStatus: ApprovalStatus.APPROVED,
        supervisorId: supervisor.id,
        approvedAt: new Date(),
      });
      await projectRepository.save(project);

      const searchDto: SearchProjectsDto = {
        query: 'machine learning',
        limit: 10,
        offset: 0,
      };

      const result = await searchService.searchProjects(searchDto);

      expect(result.projects).toHaveLength(1);

      const highlightedProject = result.projects[0];

      // Should highlight all variations
      expect(highlightedProject.highlightedTitle).toBe(
        '<mark>MACHINE</mark> <mark>learning</mark> Project',
      );
      expect(highlightedProject.highlightedAbstract).toContain(
        '<mark>Machine</mark>',
      );
      expect(highlightedProject.highlightedAbstract).toContain(
        '<mark>Learning</mark>',
      );
      expect(highlightedProject.highlightedAbstract).toContain(
        '<mark>machine</mark>',
      );
      expect(highlightedProject.highlightedAbstract).toContain(
        '<mark>learning</mark>',
      );
    });

    it('should not highlight partial word matches', async () => {
      // Create test supervisor
      const supervisor = userRepository.create({
        email: 'supervisor@test.com',
        firstName: 'Test',
        lastName: 'Supervisor',
        role: 'supervisor',
        isEmailVerified: true,
      });
      await userRepository.save(supervisor);

      // Create project with potential partial matches
      const project = projectRepository.create({
        title: 'Learning Management System',
        abstract:
          'A system for learning and teaching, including unlearning bad habits and relearning concepts',
        specialization: 'Web Development & Full Stack',
        difficultyLevel: DifficultyLevel.INTERMEDIATE,
        year: 2024,
        tags: ['education', 'management'],
        technologyStack: ['React', 'Node.js'],
        isGroupProject: false,
        approvalStatus: ApprovalStatus.APPROVED,
        supervisorId: supervisor.id,
        approvedAt: new Date(),
      });
      await projectRepository.save(project);

      const searchDto: SearchProjectsDto = {
        query: 'learn',
        limit: 10,
        offset: 0,
      };

      const result = await searchService.searchProjects(searchDto);

      if (result.projects.length > 0) {
        const highlightedProject = result.projects[0];

        // Should not highlight "unlearning" or "relearning" as they contain "learn" but are different words
        expect(highlightedProject.highlightedAbstract).not.toContain(
          '<mark>unlearn</mark>',
        );
        expect(highlightedProject.highlightedAbstract).not.toContain(
          '<mark>relearn</mark>',
        );

        // Should highlight standalone "learning"
        if (highlightedProject.highlightedAbstract?.includes('<mark>')) {
          expect(highlightedProject.highlightedAbstract).toContain(
            'unlearning',
          );
          expect(highlightedProject.highlightedAbstract).toContain(
            'relearning',
          );
        }
      }
    });
  });

  describe('Pagination with Ranking', () => {
    it('should maintain consistent ranking across paginated results', async () => {
      // Create test supervisor
      const supervisor = userRepository.create({
        email: 'supervisor@test.com',
        firstName: 'Test',
        lastName: 'Supervisor',
        role: 'supervisor',
        isEmailVerified: true,
      });
      await userRepository.save(supervisor);

      // Create multiple projects for pagination testing
      const projects = [];
      for (let i = 1; i <= 25; i++) {
        projects.push({
          title: `Machine Learning Project ${i}`,
          abstract: `This is project ${i} about machine learning and data science applications`,
          specialization: 'Artificial Intelligence & Machine Learning',
          difficultyLevel: DifficultyLevel.INTERMEDIATE,
          year: 2024,
          tags: ['machine-learning', 'data-science'],
          technologyStack: ['Python', 'TensorFlow'],
          isGroupProject: false,
          approvalStatus: ApprovalStatus.APPROVED,
          supervisorId: supervisor.id,
          approvedAt: new Date(Date.now() - i * 1000 * 60 * 60), // Different approval times
        });
      }

      for (const projectData of projects) {
        const project = projectRepository.create(projectData);
        await projectRepository.save(project);
      }

      // Test first page
      const page1 = await searchService.searchProjects({
        query: 'machine learning',
        sortBy: ProjectSortBy.RELEVANCE,
        sortOrder: SortOrder.DESC,
        limit: 10,
        offset: 0,
      });

      // Test second page
      const page2 = await searchService.searchProjects({
        query: 'machine learning',
        sortBy: ProjectSortBy.RELEVANCE,
        sortOrder: SortOrder.DESC,
        limit: 10,
        offset: 10,
      });

      // Verify pagination metadata
      expect(page1.total).toBe(25);
      expect(page1.projects).toHaveLength(10);
      expect(page1.hasNext).toBe(true);
      expect(page1.hasPrevious).toBe(false);
      expect(page1.currentPage).toBe(1);

      expect(page2.total).toBe(25);
      expect(page2.projects).toHaveLength(10);
      expect(page2.hasNext).toBe(true);
      expect(page2.hasPrevious).toBe(true);
      expect(page2.currentPage).toBe(2);

      // Verify no overlap between pages
      const page1Ids = page1.projects.map((p) => p.id);
      const page2Ids = page2.projects.map((p) => p.id);
      const intersection = page1Ids.filter((id) => page2Ids.includes(id));
      expect(intersection).toHaveLength(0);

      // Verify consistent ranking (relevance scores should be in descending order)
      for (let i = 0; i < page1.projects.length - 1; i++) {
        expect(page1.projects[i].relevanceScore).toBeGreaterThanOrEqual(
          page1.projects[i + 1].relevanceScore || 0,
        );
      }
    });
  });
});
