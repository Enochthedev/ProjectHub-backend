import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
const request = require('supertest');
import { AppModule } from './../src/app.module';

describe('Projects API (e2e)', () => {
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

  describe('GET /projects', () => {
    it('should return projects list', () => {
      return request(app.getHttpServer())
        .get('/projects')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('projects');
          expect(res.body).toHaveProperty('total');
          expect(res.body).toHaveProperty('limit');
          expect(res.body).toHaveProperty('offset');
          expect(Array.isArray(res.body.projects)).toBe(true);
        });
    });

    it('should handle pagination parameters', () => {
      return request(app.getHttpServer())
        .get('/projects')
        .query({ limit: 10, offset: 0 })
        .expect(200)
        .expect((res) => {
          expect(res.body.limit).toBe(10);
          expect(res.body.offset).toBe(0);
        });
    });

    it('should validate limit parameter', () => {
      return request(app.getHttpServer())
        .get('/projects')
        .query({ limit: 150 }) // Exceeds maximum
        .expect(400);
    });

    it('should handle search query parameter', () => {
      return request(app.getHttpServer())
        .get('/projects')
        .query({ query: 'test search' })
        .expect(200);
    });

    it('should handle specialization filter', () => {
      return request(app.getHttpServer())
        .get('/projects')
        .query({ specializations: ['Web Development & Full Stack'] })
        .expect(200);
    });
  });

  describe('GET /projects/popular', () => {
    it('should return popular projects', () => {
      return request(app.getHttpServer())
        .get('/projects/popular')
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
        });
    });

    it('should respect limit parameter', () => {
      return request(app.getHttpServer())
        .get('/projects/popular')
        .query({ limit: 5 })
        .expect(200);
    });

    it('should validate limit parameter', () => {
      return request(app.getHttpServer())
        .get('/projects/popular')
        .query({ limit: 100 }) // Exceeds maximum
        .expect(400);
    });
  });

  describe('Authentication Required Endpoints', () => {
    it('should require authentication for project details', () => {
      const fakeId = '123e4567-e89b-12d3-a456-426614174000';
      return request(app.getHttpServer())
        .get(`/projects/${fakeId}`)
        .expect(401);
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid UUID format', () => {
      return request(app.getHttpServer())
        .get('/projects/invalid-uuid/suggestions')
        .expect(400);
    });

    it('should handle malformed query parameters', () => {
      return request(app.getHttpServer())
        .get('/projects')
        .query({ offset: -1 })
        .expect(400);
    });
  });
});
