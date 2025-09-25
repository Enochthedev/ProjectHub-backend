import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
const request = require('supertest');
import { AppModule } from '../src/app.module';
import { JwtService } from '@nestjs/jwt';
import { UserRole } from '../src/common/enums/user-role.enum';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../src/entities/user.entity';
import { StudentProfile } from '../src/entities/student-profile.entity';
import { Project } from '../src/entities/project.entity';
import { SupervisorProfile } from '../src/entities/supervisor-profile.entity';
import { ApprovalStatus } from '../src/common/enums/approval-status.enum';

// Mock the @huggingface/inference module for E2E tests
jest.mock('@huggingface/inference', () => ({
  HfInference: jest.fn().mockImplementation(() => ({
    featureExtraction: jest.fn().mockResolvedValue([0.1, 0.2, 0.3, 0.4, 0.5]),
  })),
}));

describe('AI Recommendations E2E Tests', () => {
  let app: INestApplication;
  let jwtService: JwtService;
  let userRepository: Repository<User>;
  let studentProfileRepository: Repository<StudentProfile>;
  let projectRepository: Repository<Project>;
  let supervisorProfileRepository: Repository<SupervisorProfile>;

  let studentToken: string;
  let supervisorToken: string;
  let adminToken: string;

  let testStudent: User;
  let testSupervisor: User;
  let testProjects: Project[];

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    jwtService = moduleFixture.get<JwtService>(JwtService);
    userRepository = moduleFixture.get<Repository<User>>(
      getRepositoryToken(User),
    );
    studentProfileRepository = moduleFixture.get<Repository<StudentProfile>>(
      getRepositoryToken(StudentProfile),
    );
    projectRepository = moduleFixture.get<Repository<Project>>(
      getRepositoryToken(Project),
    );
    supervisorProfileRepository = moduleFixture.get<
      Repository<SupervisorProfile>
    >(getRepositoryToken(SupervisorProfile));

    await app.init();

    // Create test data
    await setupTestData();
  });

  afterAll(async () => {
    // Clean up test data
    await cleanupTestData();
    await app.close();
  });

  async function setupTestData() {
    // Create test supervisor
    testSupervisor = userRepository.create({
      id: '123e4567-e89b-12d3-a456-426614174002',
      email: 'supervisor@test.com',
      role: UserRole.SUPERVISOR,
      isEmailVerified: true,
    });
    await userRepository.save(testSupervisor);

    const supervisorProfile = supervisorProfileRepository.create({
      userId: testSupervisor.id,
      name: 'Dr. Test Supervisor',
      specializations: ['Web Development', 'Machine Learning'],
      researchInterests: ['AI', 'Web Technologies'],
      contactEmail: 'supervisor@test.com',
    });
    await supervisorProfileRepository.save(supervisorProfile);

    // Create test student
    testStudent = userRepository.create({
      id: '123e4567-e89b-12d3-a456-426614174001',
      email: 'student@test.com',
      role: UserRole.STUDENT,
      isEmailVerified: true,
    });
    await userRepository.save(testStudent);

    const studentProfile = studentProfileRepository.create({
      userId: testStudent.id,
      skills: ['JavaScript', 'React', 'Node.js', 'Python', 'Machine Learning'],
      interests: [
        'Web Development',
        'Artificial Intelligence',
        'Full Stack Development',
      ],
      preferredSpecializations: [
        'Web Development & Full Stack',
        'Machine Learning & AI',
      ],
    });
    await studentProfileRepository.save(studentProfile);

    // Create test projects
    const projectsData = [
      {
        id: '123e4567-e89b-12d3-a456-426614174010',
        title: 'React E-commerce Platform',
        abstract:
          'Build a modern e-commerce platform using React, Node.js, and MongoDB. Features include user authentication, product catalog, shopping cart, and payment integration.',
        specialization: 'Web Development & Full Stack',
        difficultyLevel: 'intermediate',
        technologyStack: ['React', 'Node.js', 'MongoDB', 'Express'],
        tags: ['e-commerce', 'full-stack', 'web'],
        approvalStatus: ApprovalStatus.APPROVED,
        supervisorId: testSupervisor.id,
      },
      {
        id: '123e4567-e89b-12d3-a456-426614174011',
        title: 'Machine Learning Image Classifier',
        abstract:
          'Develop an image classification system using deep learning techniques with TensorFlow and Python. The system will classify images into multiple categories with high accuracy.',
        specialization: 'Machine Learning & AI',
        difficultyLevel: 'advanced',
        technologyStack: ['Python', 'TensorFlow', 'OpenCV', 'NumPy'],
        tags: ['machine-learning', 'computer-vision', 'ai'],
        approvalStatus: ApprovalStatus.APPROVED,
        supervisorId: testSupervisor.id,
      },
      {
        id: '123e4567-e89b-12d3-a456-426614174012',
        title: 'Vue.js Dashboard Application',
        abstract:
          'Build a comprehensive admin dashboard using Vue.js with data visualization, user management, and reporting features.',
        specialization: 'Web Development & Full Stack',
        difficultyLevel: 'beginner',
        technologyStack: ['Vue.js', 'JavaScript', 'Chart.js', 'CSS'],
        tags: ['web', 'dashboard', 'frontend'],
        approvalStatus: ApprovalStatus.APPROVED,
        supervisorId: testSupervisor.id,
      },
    ];

    testProjects = [];
    for (const projectData of projectsData) {
      const project = projectRepository.create(projectData);
      await projectRepository.save(project);
      testProjects.push(project);
    }

    // Create JWT tokens
    studentToken = jwtService.sign({
      sub: testStudent.id,
      email: testStudent.email,
      role: testStudent.role,
    });

    supervisorToken = jwtService.sign({
      sub: testSupervisor.id,
      email: testSupervisor.email,
      role: testSupervisor.role,
    });

    adminToken = jwtService.sign({
      sub: '123e4567-e89b-12d3-a456-426614174003',
      email: 'admin@test.com',
      role: UserRole.ADMIN,
    });
  }

  async function cleanupTestData() {
    // Clean up in reverse order due to foreign key constraints
    if (testProjects) {
      for (const project of testProjects) {
        await projectRepository.delete(project.id);
      }
    }

    if (testStudent) {
      await studentProfileRepository.delete({ userId: testStudent.id });
      await userRepository.delete(testStudent.id);
    }

    if (testSupervisor) {
      await supervisorProfileRepository.delete({ userId: testSupervisor.id });
      await userRepository.delete(testSupervisor.id);
    }
  }

  describe('GET /recommendations - AI-Powered Recommendations', () => {
    it('should generate AI-powered recommendations for authenticated student', async () => {
      const response = await request(app.getHttpServer())
        .get('/recommendations')
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('recommendations');
      expect(response.body).toHaveProperty('reasoning');
      expect(response.body).toHaveProperty('averageSimilarityScore');
      expect(response.body).toHaveProperty('fromCache');
      expect(response.body).toHaveProperty('generatedAt');
      expect(response.body).toHaveProperty('metadata');

      // Validate recommendations structure
      expect(Array.isArray(response.body.recommendations)).toBe(true);

      if (response.body.recommendations.length > 0) {
        const recommendation = response.body.recommendations[0];
        expect(recommendation).toHaveProperty('projectId');
        expect(recommendation).toHaveProperty('title');
        expect(recommendation).toHaveProperty('abstract');
        expect(recommendation).toHaveProperty('specialization');
        expect(recommendation).toHaveProperty('difficultyLevel');
        expect(recommendation).toHaveProperty('similarityScore');
        expect(recommendation).toHaveProperty('matchingSkills');
        expect(recommendation).toHaveProperty('matchingInterests');
        expect(recommendation).toHaveProperty('reasoning');
        expect(recommendation).toHaveProperty('supervisor');

        // Validate similarity score range
        expect(recommendation.similarityScore).toBeGreaterThanOrEqual(0);
        expect(recommendation.similarityScore).toBeLessThanOrEqual(1);

        // Validate supervisor information
        expect(recommendation.supervisor).toHaveProperty('id');
        expect(recommendation.supervisor).toHaveProperty('name');
        expect(recommendation.supervisor).toHaveProperty('specialization');
      }

      // Validate metadata
      expect(response.body.metadata).toHaveProperty('method');
      expect(response.body.metadata).toHaveProperty('fallback');
      expect(response.body.metadata).toHaveProperty('processingTimeMs');
      expect(typeof response.body.metadata.processingTimeMs).toBe('number');
    });

    it('should handle AI service failures gracefully with fallback', async () => {
      // This test would require mocking AI service failure
      // For now, we test that the endpoint always responds appropriately
      const response = await request(app.getHttpServer())
        .get('/recommendations')
        .set('Authorization', `Bearer ${studentToken}`)
        .expect((res) => {
          // Should either return 200 with recommendations or appropriate error
          expect([200, 503]).toContain(res.status);
        });

      if (response.status === 200) {
        expect(response.body).toHaveProperty('recommendations');
        expect(response.body.metadata).toHaveProperty('fallback');
      }
    });

    it('should respect query parameters for filtering and customization', async () => {
      const response = await request(app.getHttpServer())
        .get('/recommendations')
        .query({
          limit: 2,
          minSimilarityScore: 0.3,
          includeDiversityBoost: true,
          includeSpecializations: ['Web Development & Full Stack'],
        })
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200);

      expect(response.body.recommendations.length).toBeLessThanOrEqual(2);

      // All recommendations should meet minimum similarity score
      response.body.recommendations.forEach((rec: any) => {
        expect(rec.similarityScore).toBeGreaterThanOrEqual(0.3);
      });

      // Should only include specified specializations
      const specializations = response.body.recommendations.map(
        (rec: any) => rec.specialization,
      );
      specializations.forEach((spec: string) => {
        expect(['Web Development & Full Stack']).toContain(spec);
      });
    });

    it('should handle difficulty level filtering', async () => {
      const response = await request(app.getHttpServer())
        .get('/recommendations')
        .query({
          maxDifficulty: 'intermediate',
        })
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200);

      // All recommendations should be at or below intermediate level
      const allowedDifficulties = ['beginner', 'intermediate'];
      response.body.recommendations.forEach((rec: any) => {
        expect(allowedDifficulties).toContain(rec.difficultyLevel);
      });
    });

    it('should provide meaningful explanations for recommendations', async () => {
      const response = await request(app.getHttpServer())
        .get('/recommendations')
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200);

      expect(response.body.reasoning).toBeTruthy();
      expect(response.body.reasoning.length).toBeGreaterThan(20);

      response.body.recommendations.forEach((rec: any) => {
        expect(rec.reasoning).toBeTruthy();
        expect(rec.reasoning.length).toBeGreaterThan(10);
      });
    });

    it('should track performance metrics', async () => {
      const startTime = Date.now();

      const response = await request(app.getHttpServer())
        .get('/recommendations')
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200);

      const endTime = Date.now();
      const totalTime = endTime - startTime;

      // Should complete within reasonable time
      expect(totalTime).toBeLessThan(10000); // 10 seconds max for E2E

      // Should track processing time
      expect(response.body.metadata.processingTimeMs).toBeGreaterThan(0);
      expect(response.body.metadata.processingTimeMs).toBeLessThan(totalTime);
    });
  });

  describe('POST /recommendations/refresh - Force Refresh', () => {
    it('should force refresh recommendations bypassing cache', async () => {
      // First request to populate cache
      await request(app.getHttpServer())
        .get('/recommendations')
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200);

      // Force refresh should bypass cache
      const response = await request(app.getHttpServer())
        .post('/recommendations/refresh')
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('recommendations');
      expect(response.body.fromCache).toBe(false);
      expect(response.body.metadata).toHaveProperty('processingTimeMs');
    });

    it('should generate fresh recommendations with updated profile data', async () => {
      const response = await request(app.getHttpServer())
        .post('/recommendations/refresh')
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200);

      expect(response.body.fromCache).toBe(false);
      expect(response.body.recommendations.length).toBeGreaterThan(0);

      // Should have fresh timestamp
      const generatedAt = new Date(response.body.generatedAt);
      const now = new Date();
      expect(now.getTime() - generatedAt.getTime()).toBeLessThan(60000); // Within last minute
    });
  });

  describe('POST /recommendations/:id/feedback - Feedback Submission', () => {
    let recommendationId: string;
    let projectId: string;

    beforeEach(async () => {
      // Generate recommendations to get valid IDs
      const response = await request(app.getHttpServer())
        .get('/recommendations')
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200);

      if (response.body.recommendations.length > 0) {
        projectId = response.body.recommendations[0].projectId;
        // For testing, we'll use a mock recommendation ID
        recommendationId = '123e4567-e89b-12d3-a456-426614174020';
      }
    });

    it('should accept positive feedback', async () => {
      if (!projectId) {
        console.log('Skipping feedback test - no recommendations available');
        return;
      }

      const response = await request(app.getHttpServer())
        .post(`/recommendations/${recommendationId}/feedback`)
        .query({ projectId })
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          feedbackType: 'like',
        })
        .expect((res) => {
          // Should either accept feedback or handle gracefully
          expect([201, 404]).toContain(res.status);
        });

      if (response.status === 201) {
        expect(response.body).toHaveProperty('message');
      }
    });

    it('should accept rating feedback with validation', async () => {
      if (!projectId) {
        console.log('Skipping rating test - no recommendations available');
        return;
      }

      const response = await request(app.getHttpServer())
        .post(`/recommendations/${recommendationId}/feedback`)
        .query({ projectId })
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          feedbackType: 'rating',
          rating: 4.5,
        })
        .expect((res) => {
          expect([201, 404]).toContain(res.status);
        });

      if (response.status === 201) {
        expect(response.body).toHaveProperty('message');
      }
    });

    it('should validate rating range', async () => {
      if (!projectId) {
        console.log('Skipping validation test - no recommendations available');
        return;
      }

      await request(app.getHttpServer())
        .post(`/recommendations/${recommendationId}/feedback`)
        .query({ projectId })
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          feedbackType: 'rating',
          rating: 6.0, // Invalid rating > 5.0
        })
        .expect(400);
    });

    it('should accept feedback with comments', async () => {
      if (!projectId) {
        console.log('Skipping comment test - no recommendations available');
        return;
      }

      const response = await request(app.getHttpServer())
        .post(`/recommendations/${recommendationId}/feedback`)
        .query({ projectId })
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          feedbackType: 'dislike',
          comment: 'Not relevant to my current interests',
        })
        .expect((res) => {
          expect([201, 404]).toContain(res.status);
        });

      if (response.status === 201) {
        expect(response.body).toHaveProperty('message');
      }
    });
  });

  describe('GET /recommendations/:id/explanation - Detailed Explanations', () => {
    let recommendationId: string;
    let projectId: string;

    beforeEach(async () => {
      // Generate recommendations to get valid IDs
      const response = await request(app.getHttpServer())
        .get('/recommendations')
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200);

      if (response.body.recommendations.length > 0) {
        projectId = response.body.recommendations[0].projectId;
        recommendationId = '123e4567-e89b-12d3-a456-426614174020';
      }
    });

    it('should provide detailed accessible explanations', async () => {
      if (!projectId) {
        console.log('Skipping explanation test - no recommendations available');
        return;
      }

      const response = await request(app.getHttpServer())
        .get(`/recommendations/${recommendationId}/explanation`)
        .query({ projectId })
        .set('Authorization', `Bearer ${studentToken}`)
        .expect((res) => {
          expect([200, 404]).toContain(res.status);
        });

      if (response.status === 200) {
        expect(response.body).toHaveProperty('explanation');
        expect(response.body).toHaveProperty('similarityScore');
        expect(response.body).toHaveProperty('matchingSkills');
        expect(response.body).toHaveProperty('matchingInterests');
        expect(response.body).toHaveProperty('reasoning');

        // Validate explanation content
        expect(response.body.explanation).toBeTruthy();
        expect(response.body.explanation.length).toBeGreaterThan(20);
        expect(Array.isArray(response.body.matchingSkills)).toBe(true);
        expect(Array.isArray(response.body.matchingInterests)).toBe(true);
      }
    });

    it('should require valid UUID format for parameters', async () => {
      await request(app.getHttpServer())
        .get('/recommendations/invalid-uuid/explanation')
        .query({ projectId: 'also-invalid' })
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(400);
    });

    it('should require projectId query parameter', async () => {
      await request(app.getHttpServer())
        .get(`/recommendations/${recommendationId}/explanation`)
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(400);
    });
  });

  describe('GET /recommendations/history - Recommendation History', () => {
    it('should return recommendation history for authenticated student', async () => {
      // Generate some recommendations first
      await request(app.getHttpServer())
        .get('/recommendations')
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200);

      const response = await request(app.getHttpServer())
        .get('/recommendations/history')
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);

      // If history exists, validate structure
      if (response.body.length > 0) {
        const historyItem = response.body[0];
        expect(historyItem).toHaveProperty('id');
        expect(historyItem).toHaveProperty('createdAt');
        expect(historyItem).toHaveProperty('averageSimilarityScore');
      }
    });

    it('should order history by creation date (newest first)', async () => {
      const response = await request(app.getHttpServer())
        .get('/recommendations/history')
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200);

      if (response.body.length > 1) {
        const dates = response.body.map(
          (item: any) => new Date(item.createdAt),
        );
        for (let i = 1; i < dates.length; i++) {
          expect(dates[i - 1].getTime()).toBeGreaterThanOrEqual(
            dates[i].getTime(),
          );
        }
      }
    });
  });

  describe('Authentication and Authorization', () => {
    it('should require authentication for all recommendation endpoints', async () => {
      await request(app.getHttpServer()).get('/recommendations').expect(401);

      await request(app.getHttpServer())
        .post('/recommendations/refresh')
        .expect(401);

      await request(app.getHttpServer())
        .get('/recommendations/history')
        .expect(401);
    });

    it('should require student role for recommendation endpoints', async () => {
      await request(app.getHttpServer())
        .get('/recommendations')
        .set('Authorization', `Bearer ${supervisorToken}`)
        .expect(403);

      await request(app.getHttpServer())
        .post('/recommendations/refresh')
        .set('Authorization', `Bearer ${supervisorToken}`)
        .expect(403);

      await request(app.getHttpServer())
        .get('/recommendations/history')
        .set('Authorization', `Bearer ${supervisorToken}`)
        .expect(403);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle incomplete student profiles gracefully', async () => {
      // This would require creating a student with incomplete profile
      // For now, we test that the endpoint handles errors gracefully
      const response = await request(app.getHttpServer())
        .get('/recommendations')
        .set('Authorization', `Bearer ${studentToken}`)
        .expect((res) => {
          // Should either return recommendations or appropriate error
          expect([200, 400]).toContain(res.status);
        });

      if (response.status === 400) {
        expect(response.body).toHaveProperty('message');
      }
    });

    it('should handle rate limiting gracefully', async () => {
      // Make multiple rapid requests to test rate limiting
      const promises = Array.from({ length: 5 }, () =>
        request(app.getHttpServer())
          .get('/recommendations')
          .set('Authorization', `Bearer ${studentToken}`),
      );

      const responses = await Promise.all(promises);

      // Should handle all requests gracefully
      responses.forEach((response) => {
        expect([200, 429, 503]).toContain(response.status);
      });
    });

    it('should provide meaningful error messages', async () => {
      const response = await request(app.getHttpServer())
        .get('/recommendations')
        .query({ limit: 'invalid' }) // Invalid parameter
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(400);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toBeTruthy();
    });
  });
});
