import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
const request = require('supertest');
import { AppModule } from './../src/app.module';

describe('Admin API (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('Admin Authentication Required', () => {
    it('should require authentication for pending projects', () => {
      return request(app.getHttpServer())
        .get('/admin/projects/pending')
        .expect(401);
    });

    it('should require authentication for project approval', () => {
      return request(app.getHttpServer())
        .patch('/admin/projects/123e4567-e89b-12d3-a456-426614174000/approve')
        .expect(401);
    });

    it('should require authentication for project rejection', () => {
      return request(app.getHttpServer())
        .patch('/admin/projects/123e4567-e89b-12d3-a456-426614174000/reject')
        .send({ rejectionReason: 'Test rejection' })
        .expect(401);
    });

    it('should require authentication for analytics', () => {
      return request(app.getHttpServer())
        .get('/admin/projects/analytics')
        .expect(401);
    });

    it('should require authentication for status statistics', () => {
      return request(app.getHttpServer())
        .get('/admin/projects/status-statistics')
        .expect(401);
    });
  });

  describe('Input Validation', () => {
    it('should validate UUID format in approval', () => {
      return request(app.getHttpServer())
        .patch('/admin/projects/invalid-uuid/approve')
        .set('Authorization', 'Bearer invalid-token')
        .expect(400);
    });

    it('should validate UUID format in rejection', () => {
      return request(app.getHttpServer())
        .patch('/admin/projects/invalid-uuid/reject')
        .set('Authorization', 'Bearer invalid-token')
        .send({ rejectionReason: 'Test rejection' })
        .expect(400);
    });

    it('should require rejection reason', () => {
      return request(app.getHttpServer())
        .patch('/admin/projects/123e4567-e89b-12d3-a456-426614174000/reject')
        .set('Authorization', 'Bearer invalid-token')
        .send({}) // Missing rejection reason
        .expect(400);
    });

    it('should validate rejection reason length', () => {
      return request(app.getHttpServer())
        .patch('/admin/projects/123e4567-e89b-12d3-a456-426614174000/reject')
        .set('Authorization', 'Bearer invalid-token')
        .send({ rejectionReason: 'short' }) // Too short
        .expect(400);
    });
  });

  describe('Pagination and Filtering', () => {
    it('should handle pagination parameters for pending projects', () => {
      return request(app.getHttpServer())
        .get('/admin/projects/pending')
        .query({ limit: 10, offset: 0 })
        .set('Authorization', 'Bearer invalid-token')
        .expect(401); // Will fail auth but validates query params first
    });

    it('should handle specialization filter', () => {
      return request(app.getHttpServer())
        .get('/admin/projects/pending')
        .query({ specialization: 'Web Development & Full Stack' })
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });

    it('should handle sorting parameters', () => {
      return request(app.getHttpServer())
        .get('/admin/projects/pending')
        .query({ sortBy: 'title', sortOrder: 'asc' })
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });
  });

  describe('Bulk Operations', () => {
    it('should require authentication for bulk archive', () => {
      return request(app.getHttpServer())
        .patch('/admin/projects/bulk/archive-old')
        .expect(401);
    });

    it('should require authentication for bulk reject', () => {
      return request(app.getHttpServer())
        .patch('/admin/projects/bulk/reject-stale')
        .expect(401);
    });
  });

  describe('Project Management', () => {
    it('should require authentication for archiving projects', () => {
      return request(app.getHttpServer())
        .patch('/admin/projects/123e4567-e89b-12d3-a456-426614174000/archive')
        .expect(401);
    });

    it('should require authentication for attention-required projects', () => {
      return request(app.getHttpServer())
        .get('/admin/projects/attention-required')
        .expect(401);
    });
  });
});
