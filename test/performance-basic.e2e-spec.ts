import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
const request = require('supertest');
import { AppModule } from './../src/app.module';

describe('Basic Performance Tests (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Response Time Tests', () => {
    it('should respond to projects endpoint within reasonable time', async () => {
      const startTime = Date.now();

      await request(app.getHttpServer()).get('/projects').expect(200);

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      expect(responseTime).toBeLessThan(2000); // Should respond within 2 seconds
    }, 10000);

    it('should respond to popular projects endpoint quickly', async () => {
      const startTime = Date.now();

      await request(app.getHttpServer()).get('/projects/popular').expect(200);

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      expect(responseTime).toBeLessThan(1000); // Should respond within 1 second
    }, 5000);

    it('should handle search queries efficiently', async () => {
      const startTime = Date.now();

      await request(app.getHttpServer())
        .get('/projects')
        .query({ query: 'test search performance' })
        .expect(200);

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      expect(responseTime).toBeLessThan(3000); // Search can be slower
    }, 10000);
  });

  describe('Concurrent Request Handling', () => {
    it('should handle multiple concurrent requests', async () => {
      const requests = Array(5)
        .fill(null)
        .map(() =>
          request(app.getHttpServer()).get('/projects').query({ limit: 10 }),
        );

      const startTime = Date.now();
      const responses = await Promise.all(requests);
      const endTime = Date.now();
      const totalTime = endTime - startTime;

      responses.forEach((response) => {
        expect(response.status).toBe(200);
      });

      expect(totalTime).toBeLessThan(5000); // All requests should complete within 5 seconds
    }, 15000);
  });

  describe('Load Testing', () => {
    it('should handle pagination requests efficiently', async () => {
      const requests = [];

      for (let i = 0; i < 10; i++) {
        requests.push(
          request(app.getHttpServer())
            .get('/projects')
            .query({ limit: 5, offset: i * 5 }),
        );
      }

      const startTime = Date.now();
      const responses = await Promise.all(requests);
      const endTime = Date.now();
      const totalTime = endTime - startTime;

      responses.forEach((response) => {
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('projects');
      });

      expect(totalTime).toBeLessThan(10000); // All pagination requests within 10 seconds
    }, 20000);
  });

  describe('Error Response Performance', () => {
    it('should handle invalid requests quickly', async () => {
      const startTime = Date.now();

      await request(app.getHttpServer())
        .get('/projects')
        .query({ limit: 200 }) // Invalid limit
        .expect(400);

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      expect(responseTime).toBeLessThan(500); // Error responses should be fast
    });

    it('should handle 404 errors efficiently', async () => {
      const startTime = Date.now();

      await request(app.getHttpServer())
        .get('/projects/nonexistent-endpoint')
        .expect(404);

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      expect(responseTime).toBeLessThan(500); // 404 responses should be fast
    });
  });
});
