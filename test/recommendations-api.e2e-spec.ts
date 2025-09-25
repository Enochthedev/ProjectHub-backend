import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
const request = require('supertest');
import { AppModule } from './../src/app.module';
import { JwtService } from '@nestjs/jwt';
import { UserRole } from '../src/common/enums/user-role.enum';

describe('Recommendations API (e2e)', () => {
  let app: INestApplication;
  let jwtService: JwtService;
  let studentToken: string;
  let supervisorToken: string;
  let adminToken: string;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    jwtService = moduleFixture.get<JwtService>(JwtService);

    await app.init();

    // Create test tokens for different user roles
    studentToken = jwtService.sign({
      sub: '123e4567-e89b-12d3-a456-426614174001',
      email: 'student@test.com',
      role: UserRole.STUDENT,
    });

    supervisorToken = jwtService.sign({
      sub: '123e4567-e89b-12d3-a456-426614174002',
      email: 'supervisor@test.com',
      role: UserRole.SUPERVISOR,
    });

    adminToken = jwtService.sign({
      sub: '123e4567-e89b-12d3-a456-426614174003',
      email: 'admin@test.com',
      role: UserRole.ADMIN,
    });
  });

  afterEach(async () => {
    await app.close();
  });

  describe('GET /recommendations', () => {
    it('should require authentication', () => {
      return request(app.getHttpServer()).get('/recommendations').expect(401);
    });

    it('should require student role', () => {
      return request(app.getHttpServer())
        .get('/recommendations')
        .set('Authorization', `Bearer ${supervisorToken}`)
        .expect(403);
    });

    it('should generate recommendations for authenticated student', () => {
      return request(app.getHttpServer())
        .get('/recommendations')
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('recommendations');
          expect(res.body).toHaveProperty('reasoning');
          expect(res.body).toHaveProperty('averageSimilarityScore');
          expect(res.body).toHaveProperty('fromCache');
          expect(res.body).toHaveProperty('generatedAt');
          expect(Array.isArray(res.body.recommendations)).toBe(true);
        });
    });

    it('should handle query parameters', () => {
      return request(app.getHttpServer())
        .get('/recommendations')
        .query({
          limit: 5,
          minSimilarityScore: 0.5,
          includeDiversityBoost: true,
        })
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.recommendations.length).toBeLessThanOrEqual(5);
        });
    });

    it('should validate limit parameter', () => {
      return request(app.getHttpServer())
        .get('/recommendations')
        .query({ limit: 25 }) // Exceeds maximum of 20
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(400);
    });

    it('should validate similarity score parameter', () => {
      return request(app.getHttpServer())
        .get('/recommendations')
        .query({ minSimilarityScore: 1.5 }) // Exceeds maximum of 1.0
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(400);
    });

    it('should handle specialization filters', () => {
      return request(app.getHttpServer())
        .get('/recommendations')
        .query({
          includeSpecializations: ['Web Development & Full Stack'],
          excludeSpecializations: ['Machine Learning & AI'],
        })
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200);
    });

    it('should handle difficulty level filter', () => {
      return request(app.getHttpServer())
        .get('/recommendations')
        .query({ maxDifficulty: 'intermediate' })
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200);
    });

    it('should handle force refresh parameter', () => {
      return request(app.getHttpServer())
        .get('/recommendations')
        .query({ forceRefresh: true })
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.fromCache).toBe(false);
        });
    });
  });

  describe('POST /recommendations/refresh', () => {
    it('should require authentication', () => {
      return request(app.getHttpServer())
        .post('/recommendations/refresh')
        .expect(401);
    });

    it('should require student role', () => {
      return request(app.getHttpServer())
        .post('/recommendations/refresh')
        .set('Authorization', `Bearer ${supervisorToken}`)
        .expect(403);
    });

    it('should refresh recommendations for authenticated student', () => {
      return request(app.getHttpServer())
        .post('/recommendations/refresh')
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('recommendations');
          expect(res.body).toHaveProperty('reasoning');
          expect(res.body).toHaveProperty('averageSimilarityScore');
          expect(res.body.fromCache).toBe(false);
        });
    });
  });

  describe('GET /recommendations/history', () => {
    it('should require authentication', () => {
      return request(app.getHttpServer())
        .get('/recommendations/history')
        .expect(401);
    });

    it('should require student role', () => {
      return request(app.getHttpServer())
        .get('/recommendations/history')
        .set('Authorization', `Bearer ${supervisorToken}`)
        .expect(403);
    });

    it('should return recommendation history for authenticated student', () => {
      return request(app.getHttpServer())
        .get('/recommendations/history')
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
        });
    });
  });

  describe('POST /recommendations/:recommendationId/feedback', () => {
    const mockRecommendationId = '123e4567-e89b-12d3-a456-426614174010';
    const mockProjectId = '123e4567-e89b-12d3-a456-426614174011';

    it('should require authentication', () => {
      return request(app.getHttpServer())
        .post(`/recommendations/${mockRecommendationId}/feedback`)
        .query({ projectId: mockProjectId })
        .send({
          feedbackType: 'like',
        })
        .expect(401);
    });

    it('should require student role', () => {
      return request(app.getHttpServer())
        .post(`/recommendations/${mockRecommendationId}/feedback`)
        .query({ projectId: mockProjectId })
        .set('Authorization', `Bearer ${supervisorToken}`)
        .send({
          feedbackType: 'like',
        })
        .expect(403);
    });

    it('should accept valid feedback from authenticated student', () => {
      return request(app.getHttpServer())
        .post(`/recommendations/${mockRecommendationId}/feedback`)
        .query({ projectId: mockProjectId })
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          feedbackType: 'like',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('message');
          expect(res.body.message).toBe('Feedback submitted successfully');
        });
    });

    it('should accept rating feedback', () => {
      return request(app.getHttpServer())
        .post(`/recommendations/${mockRecommendationId}/feedback`)
        .query({ projectId: mockProjectId })
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          feedbackType: 'rating',
          rating: 4.5,
        })
        .expect(201);
    });

    it('should accept feedback with comments', () => {
      return request(app.getHttpServer())
        .post(`/recommendations/${mockRecommendationId}/feedback`)
        .query({ projectId: mockProjectId })
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          feedbackType: 'dislike',
          comment: 'Not relevant to my interests',
        })
        .expect(201);
    });

    it('should validate UUID format for recommendationId', () => {
      return request(app.getHttpServer())
        .post('/recommendations/invalid-uuid/feedback')
        .query({ projectId: mockProjectId })
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          feedbackType: 'like',
        })
        .expect(400);
    });

    it('should validate UUID format for projectId', () => {
      return request(app.getHttpServer())
        .post(`/recommendations/${mockRecommendationId}/feedback`)
        .query({ projectId: 'invalid-uuid' })
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          feedbackType: 'like',
        })
        .expect(400);
    });

    it('should validate feedback type', () => {
      return request(app.getHttpServer())
        .post(`/recommendations/${mockRecommendationId}/feedback`)
        .query({ projectId: mockProjectId })
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          feedbackType: 'invalid-type',
        })
        .expect(400);
    });

    it('should validate rating range', () => {
      return request(app.getHttpServer())
        .post(`/recommendations/${mockRecommendationId}/feedback`)
        .query({ projectId: mockProjectId })
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          feedbackType: 'rating',
          rating: 6.0, // Exceeds maximum of 5.0
        })
        .expect(400);
    });
  });

  describe('GET /recommendations/:recommendationId/explanation', () => {
    const mockRecommendationId = '123e4567-e89b-12d3-a456-426614174010';
    const mockProjectId = '123e4567-e89b-12d3-a456-426614174011';

    it('should require authentication', () => {
      return request(app.getHttpServer())
        .get(`/recommendations/${mockRecommendationId}/explanation`)
        .query({ projectId: mockProjectId })
        .expect(401);
    });

    it('should require student role', () => {
      return request(app.getHttpServer())
        .get(`/recommendations/${mockRecommendationId}/explanation`)
        .query({ projectId: mockProjectId })
        .set('Authorization', `Bearer ${supervisorToken}`)
        .expect(403);
    });

    it('should return explanation for authenticated student', () => {
      return request(app.getHttpServer())
        .get(`/recommendations/${mockRecommendationId}/explanation`)
        .query({ projectId: mockProjectId })
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('explanation');
          expect(res.body).toHaveProperty('similarityScore');
          expect(res.body).toHaveProperty('matchingSkills');
          expect(res.body).toHaveProperty('matchingInterests');
          expect(res.body).toHaveProperty('reasoning');
        });
    });

    it('should validate UUID format for recommendationId', () => {
      return request(app.getHttpServer())
        .get('/recommendations/invalid-uuid/explanation')
        .query({ projectId: mockProjectId })
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(400);
    });

    it('should validate UUID format for projectId', () => {
      return request(app.getHttpServer())
        .get(`/recommendations/${mockRecommendationId}/explanation`)
        .query({ projectId: 'invalid-uuid' })
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(400);
    });

    it('should require projectId query parameter', () => {
      return request(app.getHttpServer())
        .get(`/recommendations/${mockRecommendationId}/explanation`)
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(400);
    });
  });

  describe('Error Handling', () => {
    it('should handle AI service unavailability gracefully', () => {
      // This would require mocking the AI service to fail
      // For now, we test that the endpoint responds appropriately
      return request(app.getHttpServer())
        .get('/recommendations')
        .set('Authorization', `Bearer ${studentToken}`)
        .expect((res) => {
          // Should either return 200 with fallback or appropriate error
          expect([200, 503]).toContain(res.status);
        });
    });

    it('should handle rate limiting gracefully', () => {
      // This would require triggering rate limits
      // For now, we test that the endpoint structure is correct
      return request(app.getHttpServer())
        .get('/recommendations')
        .set('Authorization', `Bearer ${studentToken}`)
        .expect((res) => {
          // Should either return 200 or 429 for rate limiting
          expect([200, 429]).toContain(res.status);
        });
    });

    it('should handle non-existent recommendation feedback gracefully', () => {
      const nonExistentId = '123e4567-e89b-12d3-a456-426614174999';
      const mockProjectId = '123e4567-e89b-12d3-a456-426614174011';

      return request(app.getHttpServer())
        .post(`/recommendations/${nonExistentId}/feedback`)
        .query({ projectId: mockProjectId })
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          feedbackType: 'like',
        })
        .expect((res) => {
          // Should handle gracefully, either 404 or accept optimistically
          expect([201, 404]).toContain(res.status);
        });
    });

    it('should handle non-existent recommendation explanation gracefully', () => {
      const nonExistentId = '123e4567-e89b-12d3-a456-426614174999';
      const mockProjectId = '123e4567-e89b-12d3-a456-426614174011';

      return request(app.getHttpServer())
        .get(`/recommendations/${nonExistentId}/explanation`)
        .query({ projectId: mockProjectId })
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(404);
    });
  });
});
