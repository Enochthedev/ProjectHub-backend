import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Project } from '../../entities/project.entity';
import { User } from '../../entities/user.entity';
import { DifficultyLevel, ApprovalStatus } from '../../common/enums';
import { TestDatabaseUtil } from '../utils/test-database.util';

describe('Search Vector Integration Tests', () => {
  let module: TestingModule;
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
    }).compile();

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

  describe('Search Vector Generation', () => {
    it('should automatically generate search vector on project creation', async () => {
      // Create a test supervisor
      const supervisor = userRepository.create({
        email: 'supervisor@test.com',
        firstName: 'Test',
        lastName: 'Supervisor',
        role: 'supervisor',
        isEmailVerified: true,
      });
      await userRepository.save(supervisor);

      // Create a project
      const project = projectRepository.create({
        title: 'Machine Learning Recommendation System',
        abstract:
          'A comprehensive machine learning system that provides personalized recommendations using collaborative filtering and deep learning techniques.',
        specialization: 'Artificial Intelligence & Machine Learning',
        difficultyLevel: DifficultyLevel.ADVANCED,
        year: 2024,
        tags: ['machine-learning', 'recommendation-system', 'python'],
        technologyStack: ['Python', 'TensorFlow', 'PostgreSQL', 'Docker'],
        isGroupProject: false,
        approvalStatus: ApprovalStatus.APPROVED,
        supervisorId: supervisor.id,
      });

      const savedProject = await projectRepository.save(project);

      // Verify search vector was generated
      const projectWithVector = await projectRepository
        .createQueryBuilder('project')
        .select(['project.*', 'project.searchVector'])
        .where('project.id = :id', { id: savedProject.id })
        .getRawOne();

      expect(projectWithVector.searchVector).toBeDefined();
      expect(projectWithVector.searchVector).not.toBe('');
    });

    it('should update search vector when project is modified', async () => {
      // Create a test supervisor
      const supervisor = userRepository.create({
        email: 'supervisor@test.com',
        firstName: 'Test',
        lastName: 'Supervisor',
        role: 'supervisor',
        isEmailVerified: true,
      });
      await userRepository.save(supervisor);

      // Create initial project
      const project = projectRepository.create({
        title: 'Initial Title',
        abstract: 'Initial abstract content',
        specialization: 'Web Development & Full Stack',
        difficultyLevel: DifficultyLevel.BEGINNER,
        year: 2024,
        tags: ['web', 'frontend'],
        technologyStack: ['HTML', 'CSS', 'JavaScript'],
        isGroupProject: false,
        approvalStatus: ApprovalStatus.PENDING,
        supervisorId: supervisor.id,
      });

      const savedProject = await projectRepository.save(project);

      // Get initial search vector
      const initialVector = await projectRepository
        .createQueryBuilder('project')
        .select('project.searchVector')
        .where('project.id = :id', { id: savedProject.id })
        .getRawOne();

      // Update the project
      await projectRepository.update(savedProject.id, {
        title: 'Updated Machine Learning Project',
        abstract: 'Updated abstract with machine learning and AI content',
        tags: ['machine-learning', 'ai', 'python'],
        technologyStack: ['Python', 'TensorFlow', 'Keras'],
      });

      // Get updated search vector
      const updatedVector = await projectRepository
        .createQueryBuilder('project')
        .select('project.searchVector')
        .where('project.id = :id', { id: savedProject.id })
        .getRawOne();

      // Verify search vector was updated
      expect(updatedVector.searchVector).toBeDefined();
      expect(updatedVector.searchVector).not.toBe(initialVector.searchVector);
    });

    it('should implement weighted search ranking (title > abstract > tags > tech stack)', async () => {
      // Create a test supervisor
      const supervisor = userRepository.create({
        email: 'supervisor@test.com',
        firstName: 'Test',
        lastName: 'Supervisor',
        role: 'supervisor',
        isEmailVerified: true,
      });
      await userRepository.save(supervisor);

      // Create projects with search term in different fields
      const projects = [
        {
          title: 'Machine Learning Project', // Term in title (weight A)
          abstract: 'A project about web development',
          tags: ['web', 'frontend'],
          technologyStack: ['React', 'Node.js'],
        },
        {
          title: 'Web Development Project',
          abstract: 'A comprehensive machine learning system', // Term in abstract (weight B)
          tags: ['web', 'frontend'],
          technologyStack: ['React', 'Node.js'],
        },
        {
          title: 'Web Development Project',
          abstract: 'A project about web development',
          tags: ['machine-learning', 'ai'], // Term in tags (weight C)
          technologyStack: ['React', 'Node.js'],
        },
        {
          title: 'Web Development Project',
          abstract: 'A project about web development',
          tags: ['web', 'frontend'],
          technologyStack: ['Machine-Learning-Library', 'React'], // Term in tech stack (weight D)
        },
      ];

      const savedProjects = [];
      for (const projectData of projects) {
        const project = projectRepository.create({
          ...projectData,
          specialization: 'Web Development & Full Stack',
          difficultyLevel: DifficultyLevel.INTERMEDIATE,
          year: 2024,
          isGroupProject: false,
          approvalStatus: ApprovalStatus.APPROVED,
          supervisorId: supervisor.id,
        });
        savedProjects.push(await projectRepository.save(project));
      }

      // Search for "machine learning" and verify ranking
      const searchResults = await projectRepository
        .createQueryBuilder('project')
        .select(['project.id', 'project.title'])
        .addSelect(
          "ts_rank(project.searchVector, plainto_tsquery('english', 'machine learning'))",
          'rank',
        )
        .where(
          "project.searchVector @@ plainto_tsquery('english', 'machine learning')",
        )
        .orderBy('rank', 'DESC')
        .getRawMany();

      expect(searchResults).toHaveLength(4);

      // Project with term in title should rank highest
      expect(searchResults[0].project_title).toBe('Machine Learning Project');

      // Verify ranking order (higher rank = better match)
      for (let i = 0; i < searchResults.length - 1; i++) {
        expect(parseFloat(searchResults[i].rank)).toBeGreaterThanOrEqual(
          parseFloat(searchResults[i + 1].rank),
        );
      }
    });

    it('should handle special characters and empty fields gracefully', async () => {
      // Create a test supervisor
      const supervisor = userRepository.create({
        email: 'supervisor@test.com',
        firstName: 'Test',
        lastName: 'Supervisor',
        role: 'supervisor',
        isEmailVerified: true,
      });
      await userRepository.save(supervisor);

      // Create project with special characters and empty arrays
      const project = projectRepository.create({
        title: 'Project with Special Characters: @#$%^&*()',
        abstract: 'Abstract with "quotes" and \'apostrophes\' and <tags>',
        specialization: 'Web Development & Full Stack',
        difficultyLevel: DifficultyLevel.BEGINNER,
        year: 2024,
        tags: [], // Empty tags array
        technologyStack: [], // Empty tech stack array
        isGroupProject: false,
        approvalStatus: ApprovalStatus.APPROVED,
        supervisorId: supervisor.id,
      });

      // Should not throw an error
      const savedProject = await projectRepository.save(project);

      // Verify search vector was generated
      const projectWithVector = await projectRepository
        .createQueryBuilder('project')
        .select('project.searchVector')
        .where('project.id = :id', { id: savedProject.id })
        .getRawOne();

      expect(projectWithVector.searchVector).toBeDefined();
      expect(projectWithVector.searchVector).not.toBe('');
    });

    it('should support full-text search queries', async () => {
      // Create a test supervisor
      const supervisor = userRepository.create({
        email: 'supervisor@test.com',
        firstName: 'Test',
        lastName: 'Supervisor',
        role: 'supervisor',
        isEmailVerified: true,
      });
      await userRepository.save(supervisor);

      // Create test projects
      const projects = [
        {
          title: 'Machine Learning Recommendation System',
          abstract: 'Advanced AI system for personalized recommendations',
          tags: ['ai', 'machine-learning', 'recommendations'],
          technologyStack: ['Python', 'TensorFlow', 'PostgreSQL'],
        },
        {
          title: 'Web Development E-commerce Platform',
          abstract: 'Full-stack e-commerce solution with modern technologies',
          tags: ['web', 'e-commerce', 'full-stack'],
          technologyStack: ['React', 'Node.js', 'MongoDB'],
        },
        {
          title: 'Mobile App for Task Management',
          abstract: 'Cross-platform mobile application for productivity',
          tags: ['mobile', 'productivity', 'cross-platform'],
          technologyStack: ['React Native', 'Firebase', 'Redux'],
        },
      ];

      for (const projectData of projects) {
        const project = projectRepository.create({
          ...projectData,
          specialization: 'Web Development & Full Stack',
          difficultyLevel: DifficultyLevel.INTERMEDIATE,
          year: 2024,
          isGroupProject: false,
          approvalStatus: ApprovalStatus.APPROVED,
          supervisorId: supervisor.id,
        });
        await projectRepository.save(project);
      }

      // Test various search queries
      const testCases = [
        { query: 'machine learning', expectedCount: 1 },
        { query: 'web development', expectedCount: 1 },
        { query: 'React', expectedCount: 2 },
        { query: 'mobile app', expectedCount: 1 },
        { query: 'system', expectedCount: 2 }, // Should match "system" in title and abstract
      ];

      for (const testCase of testCases) {
        const results = await projectRepository
          .createQueryBuilder('project')
          .where(`project.searchVector @@ plainto_tsquery('english', :query)`, {
            query: testCase.query,
          })
          .getCount();

        expect(results).toBe(testCase.expectedCount);
      }
    });
  });
});
