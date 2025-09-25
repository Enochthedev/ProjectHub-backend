import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { FallbackRecommendationService } from '../fallback-recommendation.service';
import { Project } from '../../entities/project.entity';
import { StudentProfile } from '../../entities/student-profile.entity';
import { User } from '../../entities/user.entity';
import { SupervisorProfile } from '../../entities/supervisor-profile.entity';
import { ApprovalStatus } from '../../common/enums/approval-status.enum';
import { DifficultyLevel } from '../../common/enums/difficulty-level.enum';

describe('FallbackRecommendationService', () => {
  let service: FallbackRecommendationService;
  let projectRepository: jest.Mocked<Repository<Project>>;

  const mockStudentProfile: StudentProfile = {
    id: 'student-1',
    userId: 'user-1',
    user: {} as User,
    name: 'John Doe',
    skills: ['JavaScript', 'Python', 'React'],
    interests: ['web development', 'machine learning', 'AI'],
    preferredSpecializations: [
      'Software Engineering',
      'Artificial Intelligence',
    ],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockSupervisorProfile: SupervisorProfile = {
    id: 'supervisor-1',
    userId: 'supervisor-user-1',
    user: {} as User,
    name: 'Dr. Smith',
    specializations: ['Software Engineering'],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockSupervisor: User = {
    id: 'supervisor-user-1',
    email: 'supervisor@test.com',
    supervisorProfile: mockSupervisorProfile,
  } as User;

  const mockProjects: Project[] = [
    {
      id: 'project-1',
      title: 'React Web Application',
      abstract: 'Build a modern web application using React and Node.js',
      specialization: 'Software Engineering',
      difficultyLevel: DifficultyLevel.INTERMEDIATE,
      technologyStack: ['React', 'JavaScript', 'Node.js'],
      tags: ['web', 'frontend', 'javascript'],
      approvalStatus: ApprovalStatus.APPROVED,
      supervisor: mockSupervisor,
      supervisorId: 'supervisor-user-1',
    } as Project,
    {
      id: 'project-2',
      title: 'Machine Learning Model',
      abstract: 'Develop a machine learning model for data analysis',
      specialization: 'Artificial Intelligence',
      difficultyLevel: DifficultyLevel.ADVANCED,
      technologyStack: ['Python', 'TensorFlow', 'Pandas'],
      tags: ['AI', 'ML', 'data'],
      approvalStatus: ApprovalStatus.APPROVED,
      supervisor: mockSupervisor,
      supervisorId: 'supervisor-user-1',
    } as Project,
    {
      id: 'project-3',
      title: 'Mobile App Development',
      abstract: 'Create a mobile application using Flutter',
      specialization: 'Mobile Development',
      difficultyLevel: DifficultyLevel.BEGINNER,
      technologyStack: ['Flutter', 'Dart'],
      tags: ['mobile', 'app', 'flutter'],
      approvalStatus: ApprovalStatus.APPROVED,
      supervisor: mockSupervisor,
      supervisorId: 'supervisor-user-1',
    } as Project,
  ];

  beforeEach(async () => {
    const mockProjectRepository = {
      createQueryBuilder: jest.fn().mockReturnValue({
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(mockProjects),
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FallbackRecommendationService,
        {
          provide: getRepositoryToken(Project),
          useValue: mockProjectRepository,
        },
      ],
    }).compile();

    service = module.get<FallbackRecommendationService>(
      FallbackRecommendationService,
    );
    projectRepository = module.get(getRepositoryToken(Project));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generateRuleBasedRecommendations', () => {
    it('should generate recommendations based on rule-based matching', async () => {
      const result =
        await service.generateRuleBasedRecommendations(mockStudentProfile);

      expect(result).toBeDefined();
      expect(result.recommendations).toHaveLength(3);
      expect(result.fromCache).toBe(false);
      expect(result.metadata.method).toBe('rule-based-fallback');
      expect(result.metadata.fallback).toBe(true);
    });

    it('should rank recommendations by similarity score', async () => {
      const result =
        await service.generateRuleBasedRecommendations(mockStudentProfile);

      // Verify recommendations are sorted by score (descending)
      for (let i = 0; i < result.recommendations.length - 1; i++) {
        expect(
          result.recommendations[i].similarityScore,
        ).toBeGreaterThanOrEqual(result.recommendations[i + 1].similarityScore);
      }
    });

    it('should include matching skills and interests in recommendations', async () => {
      const result =
        await service.generateRuleBasedRecommendations(mockStudentProfile);

      const reactProject = result.recommendations.find(
        (r) => r.title === 'React Web Application',
      );
      expect(reactProject).toBeDefined();
      expect(reactProject!.matchingSkills).toContain('javascript');
      expect(reactProject!.matchingInterests).toContain('web development');
    });

    it('should filter by minimum similarity score', async () => {
      const result = await service.generateRuleBasedRecommendations(
        mockStudentProfile,
        {
          minSimilarityScore: 0.8,
        },
      );

      result.recommendations.forEach((rec) => {
        expect(rec.similarityScore).toBeGreaterThanOrEqual(0.8);
      });
    });

    it('should limit number of recommendations', async () => {
      const result = await service.generateRuleBasedRecommendations(
        mockStudentProfile,
        {
          limit: 2,
        },
      );

      expect(result.recommendations).toHaveLength(2);
    });

    it('should filter by included specializations', async () => {
      const queryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([mockProjects[0]]), // Only Software Engineering project
      };

      projectRepository.createQueryBuilder.mockReturnValue(queryBuilder);

      const result = await service.generateRuleBasedRecommendations(
        mockStudentProfile,
        {
          includeSpecializations: ['Software Engineering'],
        },
      );

      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'project.specialization IN (:...specializations)',
        { specializations: ['Software Engineering'] },
      );
    });

    it('should exclude specified specializations', async () => {
      const queryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest
          .fn()
          .mockResolvedValue([mockProjects[0], mockProjects[2]]), // Exclude AI project
      };

      projectRepository.createQueryBuilder.mockReturnValue(queryBuilder);

      const result = await service.generateRuleBasedRecommendations(
        mockStudentProfile,
        {
          excludeSpecializations: ['Artificial Intelligence'],
        },
      );

      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'project.specialization NOT IN (:...excludeSpecializations)',
        { excludeSpecializations: ['Artificial Intelligence'] },
      );
    });

    it('should filter by maximum difficulty level', async () => {
      const queryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest
          .fn()
          .mockResolvedValue([mockProjects[0], mockProjects[2]]), // Beginner and Intermediate only
      };

      projectRepository.createQueryBuilder.mockReturnValue(queryBuilder);

      const result = await service.generateRuleBasedRecommendations(
        mockStudentProfile,
        {
          maxDifficulty: 'intermediate',
        },
      );

      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'LOWER(project.difficultyLevel) IN (:...difficulties)',
        { difficulties: ['beginner', 'intermediate'] },
      );
    });

    it('should return empty result when no projects match criteria', async () => {
      const queryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };

      projectRepository.createQueryBuilder.mockReturnValue(queryBuilder);

      const result =
        await service.generateRuleBasedRecommendations(mockStudentProfile);

      expect(result.recommendations).toHaveLength(0);
      expect(result.averageSimilarityScore).toBe(0);
      expect(result.reasoning).toContain('No projects available');
    });

    it('should generate appropriate reasoning for recommendations', async () => {
      const result =
        await service.generateRuleBasedRecommendations(mockStudentProfile);

      expect(result.reasoning).toContain('rule-based matching');
      expect(result.reasoning).toContain('AI service unavailability');
      expect(result.reasoning).toContain(
        'specialization, skills, and interests',
      );
    });

    it('should calculate correct average similarity score', async () => {
      const result =
        await service.generateRuleBasedRecommendations(mockStudentProfile);

      const expectedAverage =
        result.recommendations.reduce(
          (sum, rec) => sum + rec.similarityScore,
          0,
        ) / result.recommendations.length;

      expect(result.averageSimilarityScore).toBeCloseTo(expectedAverage, 2);
    });

    it('should set appropriate expiration time for fallback results', async () => {
      const beforeCall = Date.now();
      const result =
        await service.generateRuleBasedRecommendations(mockStudentProfile);
      const afterCall = Date.now();

      const expirationTime = result.expiresAt!.getTime();
      const expectedMinExpiration = beforeCall + 30 * 60 * 1000; // 30 minutes
      const expectedMaxExpiration = afterCall + 30 * 60 * 1000;

      expect(expirationTime).toBeGreaterThanOrEqual(expectedMinExpiration);
      expect(expirationTime).toBeLessThanOrEqual(expectedMaxExpiration);
    });
  });

  describe('skill matching', () => {
    it('should match exact skills', async () => {
      const result =
        await service.generateRuleBasedRecommendations(mockStudentProfile);

      const reactProject = result.recommendations.find(
        (r) => r.title === 'React Web Application',
      );
      expect(reactProject!.matchingSkills).toContain('javascript');
    });

    it('should match related programming languages', async () => {
      const profileWithJS = {
        ...mockStudentProfile,
        skills: ['JavaScript', 'Node.js'],
      };

      const result =
        await service.generateRuleBasedRecommendations(profileWithJS);

      const reactProject = result.recommendations.find(
        (r) => r.title === 'React Web Application',
      );
      expect(reactProject!.matchingSkills.length).toBeGreaterThan(0);
    });

    it('should match technology variations', async () => {
      const profileWithPython = {
        ...mockStudentProfile,
        skills: ['Python', 'ML'],
      };

      const result =
        await service.generateRuleBasedRecommendations(profileWithPython);

      const mlProject = result.recommendations.find(
        (r) => r.title === 'Machine Learning Model',
      );
      expect(mlProject!.matchingSkills).toContain('python');
    });
  });

  describe('interest matching', () => {
    it('should match interests with project tags', async () => {
      const result =
        await service.generateRuleBasedRecommendations(mockStudentProfile);

      const reactProject = result.recommendations.find(
        (r) => r.title === 'React Web Application',
      );
      expect(reactProject!.matchingInterests).toContain('web development');
    });

    it('should match interests with project content', async () => {
      const profileWithAI = {
        ...mockStudentProfile,
        interests: ['artificial intelligence', 'data analysis'],
      };

      const result =
        await service.generateRuleBasedRecommendations(profileWithAI);

      const mlProject = result.recommendations.find(
        (r) => r.title === 'Machine Learning Model',
      );
      expect(mlProject!.matchingInterests.length).toBeGreaterThan(0);
    });
  });

  describe('specialization matching', () => {
    it('should prioritize exact specialization matches', async () => {
      const result =
        await service.generateRuleBasedRecommendations(mockStudentProfile);

      // Software Engineering and AI projects should score higher due to exact matches
      const seProject = result.recommendations.find(
        (r) => r.specialization === 'Software Engineering',
      );
      const aiProject = result.recommendations.find(
        (r) => r.specialization === 'Artificial Intelligence',
      );
      const mobileProject = result.recommendations.find(
        (r) => r.specialization === 'Mobile Development',
      );

      expect(seProject!.similarityScore).toBeGreaterThan(
        mobileProject!.similarityScore,
      );
      expect(aiProject!.similarityScore).toBeGreaterThan(
        mobileProject!.similarityScore,
      );
    });

    it('should handle related specializations', async () => {
      const profileWithWebDev = {
        ...mockStudentProfile,
        preferredSpecializations: ['Web Development'],
      };

      const result =
        await service.generateRuleBasedRecommendations(profileWithWebDev);

      // Should still get some score for Software Engineering (related to Web Development)
      const seProject = result.recommendations.find(
        (r) => r.specialization === 'Software Engineering',
      );
      expect(seProject!.similarityScore).toBeGreaterThan(0);
    });
  });

  describe('error handling', () => {
    it('should handle database errors gracefully', async () => {
      const queryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockRejectedValue(new Error('Database error')),
      };

      projectRepository.createQueryBuilder.mockReturnValue(queryBuilder);

      await expect(
        service.generateRuleBasedRecommendations(mockStudentProfile),
      ).rejects.toThrow('Database error');
    });

    it('should handle empty student profile gracefully', async () => {
      const emptyProfile: StudentProfile = {
        id: 'student-empty',
        userId: 'user-empty',
        user: {} as User,
        name: 'Empty User',
        skills: [],
        interests: [],
        preferredSpecializations: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result =
        await service.generateRuleBasedRecommendations(emptyProfile);

      expect(result).toBeDefined();
      expect(result.recommendations).toBeDefined();
      // Should still return some recommendations, just with lower scores
    });
  });
});
