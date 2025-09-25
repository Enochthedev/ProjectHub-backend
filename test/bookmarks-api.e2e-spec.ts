import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
const request = require('supertest');
import { AppModule } from './../src/app.module';

describe('Bookmarks API (e2e)', () => {
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

  describe('Authentication Required', () => {
    it('should require authentication for creating bookmarks', () => {
      return request(app.getHttpServer())
        .post('/bookmarks')
        .send({ projectId: '123e4567-e89b-12d3-a456-426614174000' })
        .expect(401);
    });

    it('should require authentication for listing bookmarks', () => {
      return request(app.getHttpServer()).get('/bookmarks').expect(401);
    });

    it('should require authentication for checking bookmark status', () => {
      return request(app.getHttpServer())
        .get('/bookmarks/check/123e4567-e89b-12d3-a456-426614174000')
        .expect(401);
    });

    it('should require authentication for deleting bookmarks', () => {
      return request(app.getHttpServer())
        .delete('/bookmarks/123e4567-e89b-12d3-a456-426614174000')
        .expect(401);
    });

    it('should require authentication for comparing projects', () => {
      return request(app.getHttpServer())
        .post('/bookmarks/compare')
        .send({ projectIds: ['123e4567-e89b-12d3-a456-426614174000'] })
        .expect(401);
    });
  });

  describe('Input Validation', () => {
    it('should validate project ID format in bookmark creation', () => {
      return request(app.getHttpServer())
        .post('/bookmarks')
        .set('Authorization', 'Bearer invalid-token')
        .send({ projectId: 'invalid-uuid' })
        .expect(400);
    });

    it('should validate project ID format in bookmark check', () => {
      return request(app.getHttpServer())
        .get('/bookmarks/check/invalid-uuid')
        .set('Authorization', 'Bearer invalid-token')
        .expect(400);
    });

    it('should handle malformed request bodies', () => {
      return request(app.getHttpServer())
        .post('/bookmarks')
        .set('Authorization', 'Bearer invalid-token')
        .send({ invalidField: 'value' })
        .expect(400);
    });
  });

  describe('Bookmark Categories', () => {
    it('should require authentication for creating categories', () => {
      return request(app.getHttpServer())
        .post('/bookmarks/categories')
        .send({ name: 'Test Category' })
        .expect(401);
    });

    it('should require authentication for listing categories', () => {
      return request(app.getHttpServer())
        .get('/bookmarks/categories')
        .expect(401);
    });
  });

  describe('Export Functionality', () => {
    it('should require authentication for exporting bookmarks', () => {
      return request(app.getHttpServer())
        .post('/bookmarks/export')
        .send({ format: 'json' })
        .expect(401);
    });
  });
});
