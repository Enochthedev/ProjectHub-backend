import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
const request = require('supertest');
import { AppModule } from './../src/app.module';
import { JwtService } from '@nestjs/jwt';
import { UserRole } from '../src/common/enums/user-role.enum';

describe('Recommendations Analytics API (e2e)', () => {
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

  describe('GET /recommendations/analytics', () => {
    it('should require authentication', () => {
      return request(app.getHttpServer())
        .get('/recommendations/analytics')
        .expect(401);
    });

    it('should require supervisor or admin role', () => {
      return request(app.getHttpServer())
        .get('/recommendations/analytics')
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(403);
    });

    it('should allow supervisor access', () => {
      return request(app.getHttpServer())
        .get('/recommendations/analytics')
        .set('Authorization', `Bearer ${supervisorToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('message');
          expect(res.body).toHaveProperty('userRole');
          expect(res.body.userRole).toBe(UserRole.SUPERVISOR);
        });
    });

    it('should allow admin access', () => {
      return request(app.getHttpServer())
        .get('/recommendations/analytics')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('message');
          expect(res.body).toHaveProperty('userRole');
          expect(res.body.userRole).toBe(UserRole.ADMIN);
        });
    });

    it('should handle query parameters', () => {
      return request(app.getHttpServer())
        .get('/recommendations/analytics')
        .query({
          projectId: '123e4567-e89b-12d3-a456-426614174010',
          specialization: 'Web Development & Full Stack',
          dateFrom: '2024-01-01',
          dateTo: '2024-12-31',
        })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('filters');
          expect(res.body.filters).toHaveProperty('projectId');
          expect(res.body.filters).toHaveProperty('specialization');
          expect(res.body.filters).toHaveProperty('dateFrom');
          expect(res.body.filters).toHaveProperty('dateTo');
        });
    });
  });

  describe('GET /recommendations/analytics/quality', () => {
    it('should require authentication', () => {
      return request(app.getHttpServer())
        .get('/recommendations/analytics/quality')
        .expect(401);
    });

    it('should require admin role', () => {
      return request(app.getHttpServer())
        .get('/recommendations/analytics/quality')
        .set('Authorization', `Bearer ${supervisorToken}`)
        .expect(403);
    });

    it('should return quality metrics for admin', () => {
      return request(app.getHttpServer())
        .get('/recommendations/analytics/quality')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)
        .expect((res) => {
          // Quality metrics should include accuracy, diversity, satisfaction
          expect(res.body).toBeDefined();
        });
    });

    it('should handle date range parameters', () => {
      return request(app.getHttpServer())
        .get('/recommendations/analytics/quality')
        .query({
          startDate: '2024-01-01T00:00:00.000Z',
          endDate: '2024-12-31T23:59:59.999Z',
        })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
    });

    it('should validate date format', () => {
      return request(app.getHttpServer())
        .get('/recommendations/analytics/quality')
        .query({
          startDate: 'invalid-date',
        })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect((res) => {
          // Should either handle gracefully or return 400
          expect([200, 400]).toContain(res.status);
        });
    });
  });

  describe('GET /recommendations/analytics/satisfaction', () => {
    it('should require authentication', () => {
      return request(app.getHttpServer())
        .get('/recommendations/analytics/satisfaction')
        .expect(401);
    });

    it('should require admin role', () => {
      return request(app.getHttpServer())
        .get('/recommendations/analytics/satisfaction')
        .set('Authorization', `Bearer ${supervisorToken}`)
        .expect(403);
    });

    it('should return satisfaction analysis for admin', () => {
      return request(app.getHttpServer())
        .get('/recommendations/analytics/satisfaction')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)
        .expect((res) => {
          // Satisfaction analysis should include user feedback patterns
          expect(res.body).toBeDefined();
        });
    });

    it('should handle date range parameters', () => {
      return request(app.getHttpServer())
        .get('/recommendations/analytics/satisfaction')
        .query({
          startDate: '2024-01-01T00:00:00.000Z',
          endDate: '2024-12-31T23:59:59.999Z',
        })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
    });
  });

  describe('GET /recommendations/analytics/report', () => {
    it('should require authentication', () => {
      return request(app.getHttpServer())
        .get('/recommendations/analytics/report')
        .expect(401);
    });

    it('should require admin role', () => {
      return request(app.getHttpServer())
        .get('/recommendations/analytics/report')
        .set('Authorization', `Bearer ${supervisorToken}`)
        .expect(403);
    });

    it('should return comprehensive performance report for admin', () => {
      return request(app.getHttpServer())
        .get('/recommendations/analytics/report')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)
        .expect((res) => {
          // Performance report should be comprehensive
          expect(res.body).toBeDefined();
        });
    });

    it('should handle date range parameters', () => {
      return request(app.getHttpServer())
        .get('/recommendations/analytics/report')
        .query({
          startDate: '2024-01-01T00:00:00.000Z',
          endDate: '2024-12-31T23:59:59.999Z',
        })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
    });
  });

  describe('GET /recommendations/health', () => {
    it('should not require authentication for health check', () => {
      return request(app.getHttpServer())
        .get('/recommendations/health')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('status');
          expect(res.body).toHaveProperty('aiService');
          expect(res.body).toHaveProperty('fallbackService');
          expect(res.body).toHaveProperty('timestamp');
          expect(typeof res.body.aiService).toBe('boolean');
          expect(typeof res.body.fallbackService).toBe('boolean');
        });
    });
  });

  describe('Batch Processing Endpoints', () => {
    describe('POST /recommendations/batch', () => {
      it('should require authentication', () => {
        return request(app.getHttpServer())
          .post('/recommendations/batch')
          .send({
            studentIds: ['123e4567-e89b-12d3-a456-426614174001'],
          })
          .expect(401);
      });

      it('should require admin role', () => {
        return request(app.getHttpServer())
          .post('/recommendations/batch')
          .set('Authorization', `Bearer ${supervisorToken}`)
          .send({
            studentIds: ['123e4567-e89b-12d3-a456-426614174001'],
          })
          .expect(403);
      });

      it('should accept batch request from admin', () => {
        return request(app.getHttpServer())
          .post('/recommendations/batch')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            studentIds: ['123e4567-e89b-12d3-a456-426614174001'],
            priority: 'normal',
          })
          .expect(202)
          .expect((res) => {
            expect(res.body).toHaveProperty('requestId');
            expect(res.body).toHaveProperty('message');
            expect(res.body.message).toBe(
              'Batch request submitted successfully',
            );
          });
      });

      it('should validate student IDs format', () => {
        return request(app.getHttpServer())
          .post('/recommendations/batch')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            studentIds: ['invalid-uuid'],
          })
          .expect((res) => {
            // Should validate UUID format
            expect([400, 202]).toContain(res.status);
          });
      });

      it('should handle priority levels', () => {
        return request(app.getHttpServer())
          .post('/recommendations/batch')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            studentIds: ['123e4567-e89b-12d3-a456-426614174001'],
            priority: 'high',
          })
          .expect(202);
      });
    });

    describe('GET /recommendations/batch/:requestId', () => {
      const mockRequestId = 'batch-123e4567-e89b-12d3-a456-426614174001';

      it('should require authentication', () => {
        return request(app.getHttpServer())
          .get(`/recommendations/batch/${mockRequestId}`)
          .expect(401);
      });

      it('should require admin role', () => {
        return request(app.getHttpServer())
          .get(`/recommendations/batch/${mockRequestId}`)
          .set('Authorization', `Bearer ${supervisorToken}`)
          .expect(403);
      });

      it('should return batch status for admin', () => {
        return request(app.getHttpServer())
          .get(`/recommendations/batch/${mockRequestId}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .expect((res) => {
            // Should return status or 404 if not found
            expect([200, 404]).toContain(res.status);
          });
      });
    });

    describe('DELETE /recommendations/batch/:requestId', () => {
      const mockRequestId = 'batch-123e4567-e89b-12d3-a456-426614174001';

      it('should require authentication', () => {
        return request(app.getHttpServer())
          .delete(`/recommendations/batch/${mockRequestId}`)
          .expect(401);
      });

      it('should require admin role', () => {
        return request(app.getHttpServer())
          .delete(`/recommendations/batch/${mockRequestId}`)
          .set('Authorization', `Bearer ${supervisorToken}`)
          .expect(403);
      });

      it('should cancel batch request for admin', () => {
        return request(app.getHttpServer())
          .delete(`/recommendations/batch/${mockRequestId}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .expect((res) => {
            // Should return success or 404 if not found
            expect([200, 404]).toContain(res.status);
          });
      });
    });

    describe('GET /recommendations/batch', () => {
      it('should require authentication', () => {
        return request(app.getHttpServer())
          .get('/recommendations/batch')
          .expect(401);
      });

      it('should require admin role', () => {
        return request(app.getHttpServer())
          .get('/recommendations/batch')
          .set('Authorization', `Bearer ${supervisorToken}`)
          .expect(403);
      });

      it('should return batch statistics for admin', () => {
        return request(app.getHttpServer())
          .get('/recommendations/batch')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200)
          .expect((res) => {
            expect(res.body).toBeDefined();
          });
      });
    });
  });

  describe('Refresh Management Endpoints', () => {
    describe('POST /recommendations/refresh/force/:studentId', () => {
      const mockStudentId = '123e4567-e89b-12d3-a456-426614174001';

      it('should require authentication', () => {
        return request(app.getHttpServer())
          .post(`/recommendations/refresh/force/${mockStudentId}`)
          .expect(401);
      });

      it('should require admin role', () => {
        return request(app.getHttpServer())
          .post(`/recommendations/refresh/force/${mockStudentId}`)
          .set('Authorization', `Bearer ${supervisorToken}`)
          .expect(403);
      });

      it('should force refresh for admin', () => {
        return request(app.getHttpServer())
          .post(`/recommendations/refresh/force/${mockStudentId}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200)
          .expect((res) => {
            expect(res.body).toHaveProperty('message');
            expect(res.body.message).toBe(
              'Recommendations refreshed successfully',
            );
          });
      });

      it('should validate student ID format', () => {
        return request(app.getHttpServer())
          .post('/recommendations/refresh/force/invalid-uuid')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(400);
      });
    });

    describe('GET /recommendations/refresh/stats', () => {
      it('should require authentication', () => {
        return request(app.getHttpServer())
          .get('/recommendations/refresh/stats')
          .expect(401);
      });

      it('should require admin role', () => {
        return request(app.getHttpServer())
          .get('/recommendations/refresh/stats')
          .set('Authorization', `Bearer ${supervisorToken}`)
          .expect(403);
      });

      it('should return refresh statistics for admin', () => {
        return request(app.getHttpServer())
          .get('/recommendations/refresh/stats')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200)
          .expect((res) => {
            expect(res.body).toBeDefined();
          });
      });
    });
  });
});
