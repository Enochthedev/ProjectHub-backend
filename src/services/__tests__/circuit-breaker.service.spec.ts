import { Test, TestingModule } from '@nestjs/testing';
import {
  CircuitBreakerService,
  CircuitBreakerState,
} from '../circuit-breaker.service';

describe('CircuitBreakerService', () => {
  let service: CircuitBreakerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CircuitBreakerService],
    }).compile();

    service = module.get<CircuitBreakerService>(CircuitBreakerService);
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  describe('execute', () => {
    it('should execute function successfully when circuit is closed', async () => {
      const mockFn = jest.fn().mockResolvedValue('success');

      const result = await service.execute('test-circuit', mockFn);

      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(1);

      const status = service.getStatus('test-circuit');
      expect(status.state).toBe(CircuitBreakerState.CLOSED);
      expect(status.failureCount).toBe(0);
    });

    it('should track failures and transition to open state', async () => {
      const mockFn = jest.fn().mockRejectedValue(new Error('Test error'));

      // Execute 5 times to reach failure threshold
      for (let i = 0; i < 5; i++) {
        try {
          await service.execute('test-circuit', mockFn);
        } catch (error) {
          // Expected to fail
        }
      }

      const status = service.getStatus('test-circuit');
      expect(status.state).toBe(CircuitBreakerState.OPEN);
      expect(status.failureCount).toBe(5);
      expect(status.nextAttemptTime).toBeDefined();
    });

    it('should reject calls when circuit is open', async () => {
      const mockFn = jest.fn().mockRejectedValue(new Error('Test error'));

      // Trigger circuit to open
      for (let i = 0; i < 5; i++) {
        try {
          await service.execute('test-circuit', mockFn);
        } catch (error) {
          // Expected to fail
        }
      }

      // Next call should be rejected immediately
      await expect(service.execute('test-circuit', mockFn)).rejects.toThrow(
        'Circuit breaker is open for service',
      );

      // Function should not be called
      expect(mockFn).toHaveBeenCalledTimes(5); // Only the initial 5 calls
    });

    it('should transition to half-open after recovery timeout', async () => {
      jest.useFakeTimers();
      const mockFn = jest.fn().mockRejectedValue(new Error('Test error'));

      // Trigger circuit to open
      for (let i = 0; i < 5; i++) {
        try {
          await service.execute('test-circuit', mockFn);
        } catch (error) {
          // Expected to fail
        }
      }

      expect(service.getStatus('test-circuit').state).toBe(
        CircuitBreakerState.OPEN,
      );

      // Fast forward past recovery timeout
      jest.advanceTimersByTime(61000); // 61 seconds

      // Mock function to succeed this time
      mockFn.mockResolvedValueOnce('success');

      const result = await service.execute('test-circuit', mockFn);

      expect(result).toBe('success');
      expect(service.getStatus('test-circuit').state).toBe(
        CircuitBreakerState.CLOSED,
      );
    });

    it('should handle half-open state correctly', async () => {
      jest.useFakeTimers();
      const mockFn = jest.fn().mockRejectedValue(new Error('Test error'));

      // Trigger circuit to open
      for (let i = 0; i < 5; i++) {
        try {
          await service.execute('test-circuit', mockFn);
        } catch (error) {
          // Expected to fail
        }
      }

      // Fast forward past recovery timeout
      jest.advanceTimersByTime(61000);

      // First call in half-open should succeed and close circuit
      mockFn.mockResolvedValueOnce('success');
      await service.execute('test-circuit', mockFn);

      expect(service.getStatus('test-circuit').state).toBe(
        CircuitBreakerState.CLOSED,
      );
    });

    it('should transition back to open if half-open call fails', async () => {
      jest.useFakeTimers();
      const mockFn = jest.fn().mockRejectedValue(new Error('Test error'));

      // Trigger circuit to open
      for (let i = 0; i < 5; i++) {
        try {
          await service.execute('test-circuit', mockFn);
        } catch (error) {
          // Expected to fail
        }
      }

      // Fast forward past recovery timeout
      jest.advanceTimersByTime(61000);

      // Call should fail and circuit should go back to open
      try {
        await service.execute('test-circuit', mockFn);
      } catch (error) {
        // Expected to fail
      }

      expect(service.getStatus('test-circuit').state).toBe(
        CircuitBreakerState.OPEN,
      );
    });

    it('should limit calls in half-open state', async () => {
      jest.useFakeTimers();
      const mockFn = jest.fn().mockResolvedValue('success');

      // Trigger circuit to open
      const failingFn = jest.fn().mockRejectedValue(new Error('Test error'));
      for (let i = 0; i < 5; i++) {
        try {
          await service.execute('test-circuit', failingFn);
        } catch (error) {
          // Expected to fail
        }
      }

      // Fast forward past recovery timeout
      jest.advanceTimersByTime(61000);

      // Make calls that keep circuit in half-open state
      mockFn.mockImplementation(() => new Promise(() => {})); // Never resolves

      // Start 3 calls (max for half-open)
      const promises: Promise<any>[] = [];
      for (let i = 0; i < 3; i++) {
        promises.push(service.execute('test-circuit', mockFn).catch(() => {}));
      }

      // 4th call should be rejected
      await expect(service.execute('test-circuit', mockFn)).rejects.toThrow(
        'Circuit breaker is open for service',
      );
    });

    it('should use custom configuration', async () => {
      const mockFn = jest.fn().mockRejectedValue(new Error('Test error'));
      const customConfig = { failureThreshold: 2 };

      // Should open after 2 failures instead of default 5
      for (let i = 0; i < 2; i++) {
        try {
          await service.execute('test-circuit', mockFn, customConfig);
        } catch (error) {
          // Expected to fail
        }
      }

      expect(service.getStatus('test-circuit').state).toBe(
        CircuitBreakerState.OPEN,
      );
    });
  });

  describe('getStatus', () => {
    it('should return default status for non-existent circuit', () => {
      const status = service.getStatus('non-existent');

      expect(status).toEqual({
        state: CircuitBreakerState.CLOSED,
        failureCount: 0,
      });
    });

    it('should return current status for existing circuit', async () => {
      const mockFn = jest.fn().mockRejectedValue(new Error('Test error'));

      try {
        await service.execute('test-circuit', mockFn);
      } catch (error) {
        // Expected to fail
      }

      const status = service.getStatus('test-circuit');

      expect(status.state).toBe(CircuitBreakerState.CLOSED);
      expect(status.failureCount).toBe(1);
      expect(status.lastFailureTime).toBeDefined();
    });
  });

  describe('reset', () => {
    it('should reset circuit breaker to closed state', async () => {
      const mockFn = jest.fn().mockRejectedValue(new Error('Test error'));

      // Trigger circuit to open
      for (let i = 0; i < 5; i++) {
        try {
          await service.execute('test-circuit', mockFn);
        } catch (error) {
          // Expected to fail
        }
      }

      expect(service.getStatus('test-circuit').state).toBe(
        CircuitBreakerState.OPEN,
      );

      // Reset circuit
      service.reset('test-circuit');

      const status = service.getStatus('test-circuit');
      expect(status.state).toBe(CircuitBreakerState.CLOSED);
      expect(status.failureCount).toBe(0);
      expect(status.lastFailureTime).toBeUndefined();
      expect(status.nextAttemptTime).toBeUndefined();
    });

    it('should handle reset of non-existent circuit gracefully', () => {
      expect(() => service.reset('non-existent')).not.toThrow();
    });
  });

  describe('getAllStatuses', () => {
    it('should return empty object when no circuits exist', () => {
      const statuses = service.getAllStatuses();
      expect(statuses).toEqual({});
    });

    it('should return all circuit statuses', async () => {
      const mockFn = jest.fn().mockRejectedValue(new Error('Test error'));

      // Create two circuits
      try {
        await service.execute('circuit-1', mockFn);
      } catch (error) {
        // Expected to fail
      }

      try {
        await service.execute('circuit-2', mockFn);
      } catch (error) {
        // Expected to fail
      }

      const statuses = service.getAllStatuses();

      expect(Object.keys(statuses)).toHaveLength(2);
      expect(statuses['circuit-1']).toBeDefined();
      expect(statuses['circuit-2']).toBeDefined();
    });
  });
});
