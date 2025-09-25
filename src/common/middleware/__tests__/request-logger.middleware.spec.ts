import { Test, TestingModule } from '@nestjs/testing';
import { Request, Response } from 'express';
import { RequestLoggerMiddleware } from '../request-logger.middleware';

describe('RequestLoggerMiddleware', () => {
  let middleware: RequestLoggerMiddleware;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let nextFunction: jest.Mock;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RequestLoggerMiddleware],
    }).compile();

    middleware = module.get<RequestLoggerMiddleware>(RequestLoggerMiddleware);

    mockRequest = {
      method: 'GET',
      originalUrl: '/api/test',
      ip: '127.0.0.1',
      headers: {
        'user-agent': 'Test Agent',
      },
    };

    mockResponse = {
      statusCode: 200,
      end: jest.fn(),
    };

    nextFunction = jest.fn();
  });

  it('should be defined', () => {
    expect(middleware).toBeDefined();
  });

  it('should add request ID to headers', () => {
    middleware.use(
      mockRequest as Request,
      mockResponse as Response,
      nextFunction,
    );

    expect(mockRequest.headers!['x-request-id']).toBeDefined();
    expect(typeof mockRequest.headers!['x-request-id']).toBe('string');
    expect(mockRequest.headers!['x-request-id']).toMatch(/^req_\d+_[a-z0-9]+$/);
  });

  it('should call next function', () => {
    middleware.use(
      mockRequest as Request,
      mockResponse as Response,
      nextFunction,
    );

    expect(nextFunction).toHaveBeenCalled();
  });

  it('should log incoming request', () => {
    const logSpy = jest.spyOn(middleware['logger'], 'log');

    middleware.use(
      mockRequest as Request,
      mockResponse as Response,
      nextFunction,
    );

    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining(
        'Incoming GET /api/test - IP: 127.0.0.1 - User-Agent: Test Agent',
      ),
    );
  });

  it('should handle missing user-agent header', () => {
    mockRequest.headers = {};
    const logSpy = jest.spyOn(middleware['logger'], 'log');

    middleware.use(
      mockRequest as Request,
      mockResponse as Response,
      nextFunction,
    );

    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining('User-Agent: Unknown'),
    );
  });

  it('should override response.end to log response', () => {
    const originalEnd = mockResponse.end;

    middleware.use(
      mockRequest as Request,
      mockResponse as Response,
      nextFunction,
    );

    expect(mockResponse.end).not.toBe(originalEnd);
    expect(typeof mockResponse.end).toBe('function');
  });

  it('should log response when response.end is called', () => {
    // Spy on Logger constructor to capture all log calls
    const logSpy = jest.spyOn(
      require('@nestjs/common').Logger.prototype,
      'log',
    );
    mockResponse.statusCode = 200;

    middleware.use(
      mockRequest as Request,
      mockResponse as Response,
      nextFunction,
    );

    // Simulate response.end being called
    const mockEnd = mockResponse.end as jest.Mock;
    mockEnd.call(mockResponse);

    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining(
        'Response GET /api/test - Status: 200 - Duration:',
      ),
    );

    logSpy.mockRestore();
  });

  it('should log slow requests as warnings', () => {
    const warnSpy = jest.spyOn(
      require('@nestjs/common').Logger.prototype,
      'warn',
    );
    mockResponse.statusCode = 200;

    // Mock Date.now to simulate slow request
    const originalDateNow = Date.now;
    let callCount = 0;
    Date.now = jest.fn(() => {
      callCount++;
      if (callCount === 1) return 1000; // Start time
      return 2500; // End time (1500ms duration)
    });

    middleware.use(
      mockRequest as Request,
      mockResponse as Response,
      nextFunction,
    );

    // Simulate response.end being called
    const mockEnd = mockResponse.end as jest.Mock;
    mockEnd.call(mockResponse);

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining(
        'Slow request detected: GET /api/test - Duration: 1500ms',
      ),
    );

    // Restore Date.now
    Date.now = originalDateNow;
    warnSpy.mockRestore();
  });

  it('should log error responses', () => {
    const errorSpy = jest.spyOn(
      require('@nestjs/common').Logger.prototype,
      'error',
    );
    mockResponse.statusCode = 404;

    middleware.use(
      mockRequest as Request,
      mockResponse as Response,
      nextFunction,
    );

    // Simulate response.end being called
    const mockEnd = mockResponse.end as jest.Mock;
    mockEnd.call(mockResponse);

    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('Error response: GET /api/test - Status: 404'),
    );

    errorSpy.mockRestore();
  });

  it('should generate unique request IDs', () => {
    const requestIds = new Set();

    for (let i = 0; i < 100; i++) {
      const mockReq = { ...mockRequest, headers: {} };
      middleware.use(
        mockReq as Request,
        mockResponse as Response,
        nextFunction,
      );
      requestIds.add(mockReq.headers['x-request-id']);
    }

    expect(requestIds.size).toBe(100); // All IDs should be unique
  });

  it('should call original response.end with correct parameters', () => {
    const originalEnd = jest.fn();
    mockResponse.end = originalEnd;

    middleware.use(
      mockRequest as Request,
      mockResponse as Response,
      nextFunction,
    );

    const chunk = 'test data';
    const encoding = 'utf8';
    const mockEnd = mockResponse.end as jest.Mock;
    mockEnd.call(mockResponse, chunk, encoding);

    expect(originalEnd).toHaveBeenCalledWith(chunk, encoding, undefined);
  });
});
