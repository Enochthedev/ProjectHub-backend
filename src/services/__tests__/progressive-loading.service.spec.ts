import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  ProgressiveLoadingService,
  LoadingStage,
} from '../progressive-loading.service';

describe('ProgressiveLoadingService', () => {
  let service: ProgressiveLoadingService;
  let eventEmitter: EventEmitter2;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProgressiveLoadingService,
        {
          provide: EventEmitter2,
          useValue: {
            emit: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ProgressiveLoadingService>(ProgressiveLoadingService);
    eventEmitter = module.get<EventEmitter2>(EventEmitter2);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('startRequest', () => {
    it('should start tracking a new request', () => {
      // Arrange
      const requestId = 'test-request-id';
      const studentId = 'test-student-id';

      // Act
      service.startRequest(requestId, studentId);

      // Assert
      const progress = service.getProgress(requestId);
      expect(progress).toBeDefined();
      expect(progress?.stage).toBe(LoadingStage.QUEUED);
      expect(progress?.percentage).toBe(0);
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'recommendation.progress',
        expect.any(Object),
      );
    });

    it('should add request to queue', () => {
      // Arrange
      const requestId = 'test-request-id';
      const studentId = 'test-student-id';

      // Act
      service.startRequest(requestId, studentId);

      // Assert
      const queueStatus = service.getQueueStatus(requestId);
      expect(queueStatus).toBeDefined();
      expect(queueStatus?.position).toBe(1);
    });
  });

  describe('updateProgress', () => {
    it('should update request progress', () => {
      // Arrange
      const requestId = 'test-request-id';
      const studentId = 'test-student-id';
      service.startRequest(requestId, studentId);

      // Act
      service.updateProgress(
        requestId,
        LoadingStage.GENERATING_EMBEDDINGS,
        45,
        'Processing with AI...',
        'Generating embeddings for profile analysis',
      );

      // Assert
      const progress = service.getProgress(requestId);
      expect(progress?.stage).toBe(LoadingStage.GENERATING_EMBEDDINGS);
      expect(progress?.percentage).toBe(45);
      expect(progress?.message).toBe('Analyzing your interests and skills...');
      expect(progress?.details).toContain('Using AI to understand');
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'recommendation.progress',
        expect.objectContaining({
          requestId,
          studentId,
          progress: expect.objectContaining({
            stage: LoadingStage.GENERATING_EMBEDDINGS,
            percentage: 45,
          }),
        }),
      );
    });

    it('should handle non-existent request gracefully', () => {
      // Arrange
      const requestId = 'non-existent-request';

      // Act & Assert
      expect(() => {
        service.updateProgress(requestId, LoadingStage.COMPLETED, 100, 'Done');
      }).not.toThrow();
    });
  });

  describe('completeRequest', () => {
    it('should complete a request and emit completion event', () => {
      // Arrange
      const requestId = 'test-request-id';
      const studentId = 'test-student-id';
      service.startRequest(requestId, studentId);

      // Act
      service.completeRequest(requestId);

      // Assert
      const progress = service.getProgress(requestId);
      expect(progress?.stage).toBe(LoadingStage.COMPLETED);
      expect(progress?.percentage).toBe(100);
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'recommendation.completed',
        expect.objectContaining({
          requestId,
          studentId,
          duration: expect.any(Number),
        }),
      );
    });

    it('should remove request from queue', () => {
      // Arrange
      const requestId = 'test-request-id';
      const studentId = 'test-student-id';
      service.startRequest(requestId, studentId);

      // Act
      service.completeRequest(requestId);

      // Assert
      const queueStatus = service.getQueueStatus(requestId);
      expect(queueStatus).toBeNull();
    });

    it('should store processing time for future estimates', async () => {
      // Arrange
      const requestId = 'test-request-id';
      const studentId = 'test-student-id';
      service.startRequest(requestId, studentId);

      // Wait a bit to ensure some processing time
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Act
      service.completeRequest(requestId);

      // Assert
      const systemLoad = service.getSystemLoad();
      expect(systemLoad.averageProcessingTime).toBeGreaterThan(0);
    });
  });

  describe('failRequest', () => {
    it('should mark request as failed and emit failure event', () => {
      // Arrange
      const requestId = 'test-request-id';
      const studentId = 'test-student-id';
      const errorMessage = 'AI service unavailable';
      service.startRequest(requestId, studentId);

      // Act
      service.failRequest(requestId, errorMessage);

      // Assert
      const progress = service.getProgress(requestId);
      expect(progress?.stage).toBe(LoadingStage.ERROR);
      expect(progress?.percentage).toBe(0);
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'recommendation.failed',
        expect.objectContaining({
          requestId,
          studentId,
          error: errorMessage,
        }),
      );
    });

    it('should remove failed request from queue', () => {
      // Arrange
      const requestId = 'test-request-id';
      const studentId = 'test-student-id';
      service.startRequest(requestId, studentId);

      // Act
      service.failRequest(requestId, 'Test error');

      // Assert
      const queueStatus = service.getQueueStatus(requestId);
      expect(queueStatus).toBeNull();
    });
  });

  describe('getProgress', () => {
    it('should return null for non-existent request', () => {
      // Act
      const progress = service.getProgress('non-existent-request');

      // Assert
      expect(progress).toBeNull();
    });

    it('should return progress with estimated time remaining', () => {
      // Arrange
      const requestId = 'test-request-id';
      const studentId = 'test-student-id';
      service.startRequest(requestId, studentId);
      service.updateProgress(
        requestId,
        LoadingStage.GENERATING_EMBEDDINGS,
        50,
        'Halfway done',
      );

      // Act
      const progress = service.getProgress(requestId);

      // Assert
      expect(progress).toBeDefined();
      expect(progress?.estimatedTimeRemaining).toBeGreaterThanOrEqual(0);
    });
  });

  describe('getQueueStatus', () => {
    it('should return correct queue position for multiple requests', () => {
      // Arrange
      const requestId1 = 'request-1';
      const requestId2 = 'request-2';
      const requestId3 = 'request-3';

      service.startRequest(requestId1, 'student-1');
      service.startRequest(requestId2, 'student-2');
      service.startRequest(requestId3, 'student-3');

      // Act
      const status1 = service.getQueueStatus(requestId1);
      const status2 = service.getQueueStatus(requestId2);
      const status3 = service.getQueueStatus(requestId3);

      // Assert
      expect(status1?.position).toBe(1);
      expect(status2?.position).toBe(2);
      expect(status3?.position).toBe(3);
      expect(status1?.totalInQueue).toBe(3);
      expect(status2?.totalInQueue).toBe(3);
      expect(status3?.totalInQueue).toBe(3);
    });

    it('should return null for request not in queue', () => {
      // Act
      const status = service.getQueueStatus('non-existent-request');

      // Assert
      expect(status).toBeNull();
    });
  });

  describe('getSystemLoad', () => {
    it('should return system load information', () => {
      // Arrange
      service.startRequest('request-1', 'student-1');
      service.startRequest('request-2', 'student-2');

      // Act
      const systemLoad = service.getSystemLoad();

      // Assert
      expect(systemLoad).toBeDefined();
      expect(systemLoad.activeRequests).toBe(2);
      expect(systemLoad.queueLength).toBe(2);
      expect(systemLoad.averageProcessingTime).toBeGreaterThanOrEqual(0);
      expect(systemLoad.estimatedCapacity).toBeGreaterThan(0);
    });
  });

  describe('getStageProgress', () => {
    it('should return correct progress percentage for each stage', () => {
      // Test a few key stages
      expect(service.getStageProgress(LoadingStage.QUEUED)).toBe(5);
      expect(service.getStageProgress(LoadingStage.GENERATING_EMBEDDINGS)).toBe(
        45,
      );
      expect(
        service.getStageProgress(LoadingStage.CALCULATING_SIMILARITY),
      ).toBe(65);
      expect(service.getStageProgress(LoadingStage.COMPLETED)).toBe(100);
      expect(service.getStageProgress(LoadingStage.ERROR)).toBe(0);
    });
  });

  describe('cleanupOldRequests', () => {
    it('should remove old requests from tracking', () => {
      // Arrange
      const requestId = 'old-request';
      const studentId = 'test-student';
      service.startRequest(requestId, studentId);

      // Mock old timestamp by directly accessing private property
      const activeRequests = (service as any).activeRequests;
      const request = activeRequests.get(requestId);
      if (request) {
        request.startTime = new Date(Date.now() - 400000); // 6+ minutes ago
      }

      // Act
      service.cleanupOldRequests();

      // Assert
      const progress = service.getProgress(requestId);
      expect(progress).toBeNull();
    });
  });

  describe('stage messages and details', () => {
    it('should provide user-friendly messages for all stages', () => {
      const stages = Object.values(LoadingStage);

      stages.forEach((stage) => {
        const requestId = `test-${stage}`;
        const studentId = 'test-student';

        service.startRequest(requestId, studentId);
        service.updateProgress(requestId, stage, 50, 'Test message');

        const progress = service.getProgress(requestId);
        expect(progress?.message).toBeDefined();
        expect(progress?.message.length).toBeGreaterThan(0);
        expect(progress?.details).toBeDefined();
        expect(progress?.details?.length).toBeGreaterThan(0);
      });
    });
  });

  describe('estimated time calculations', () => {
    it('should calculate estimated time remaining based on progress', () => {
      // Arrange
      const requestId = 'test-request';
      const studentId = 'test-student';
      service.startRequest(requestId, studentId);

      // Simulate some progress
      service.updateProgress(
        requestId,
        LoadingStage.GENERATING_EMBEDDINGS,
        25,
        'Quarter done',
      );

      // Act
      const progress = service.getProgress(requestId);

      // Assert
      expect(progress?.estimatedTimeRemaining).toBeDefined();
      expect(progress?.estimatedTimeRemaining).toBeGreaterThanOrEqual(0);
    });

    it('should handle zero progress gracefully', () => {
      // Arrange
      const requestId = 'test-request';
      const studentId = 'test-student';
      service.startRequest(requestId, studentId);

      // Act
      const progress = service.getProgress(requestId);

      // Assert
      expect(progress?.estimatedTimeRemaining).toBeDefined();
      expect(progress?.estimatedTimeRemaining).toBeGreaterThan(0);
    });
  });
});
