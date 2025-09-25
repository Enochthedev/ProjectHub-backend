import { Test, TestingModule } from '@nestjs/testing';
import {
  CircuitBreakerService,
  CircuitBreakerState,
} from '../circuit-breaker.service';
import { CircuitBreakerOpenException } from '../../common/exceptions/app.exception';

describe('CircuitBreakerService Error Handling', () => {
  let service: CircuitBreakerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CircuitBreakerService],
    }).compile();

    service = module.get<CircuitBreakerService>(CircuitBreakerService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('Circuit Breaker States', () => {
    it('should start in CLOSED state', async () => {
      const mockFn = jest.fn().mockResolvedValue('success');

      const result = await service.execute('test-circuit', mockFn);

      expect(result).toBe('success');
      expect(service.getStatus('test-circuit').state).toBe(
        CircuitBreakerState.CLOSED,
      );
    });

    it('should transition to OPEN after failure threshold', async () => {
      const mockFn = jest.fn().mockRejectedValue(new Error('Service error'));

      // Execute 5 times to reach default failure threshold
      for (let i = 0; i < 5; i++) {
        try {
          await service.execute('test-circuit', mockFn, {
            failureThreshold: 5,
          });
        } catch (error) {
          // Expected to fail
        }
      }

      expect(service.getStatus('test-circuit').state).toBe(
        CircuitBreakerState.OPEN,
      );
    });

    it('should throw CircuitBreakerOpenException when circuit is OPEN', async () => {
      const mockFn = jest.fn().mockRejectedValue(new Error('Service error'));

      // Trigger circuit to open
      for (let i = 0; i < 5; i++) {
        try {
          await service.execute('test-circuit', mockFn, {
            failureThreshold: 5,
          });
        } catch (error) {
          // Expected to fail
        }
      }

      // Next call should throw CircuitBreakerOpenException
      await expect(service.execute('test-circuit', mockFn)).rejects.toThrow(
        CircuitBreakerOpenException,
      );
    });

    it('should include service name in CircuitBreakerOpenException', async () => {
      const mockFn = jest.fn().mockRejectedValue(new Error('Service error'));

      // Trigger circuit to open
      for (let i = 0; i < 5; i++) {
        try {
          await service.execute('ai-service', mockFn, { failureThreshold: 5 });
        } catch (error) {
          // Expected to fail
        }
      }

      try {
        await service.execute('ai-service', mockFn);
        fail('Should have thrown CircuitBreakerOpenException');
      } catch (error) {
        expect(error).toBeInstanceOf(CircuitBreakerOpenException);
        expect(error.details.service).toBe('ai-service');
        expect(error.details.resetTime).toBeDefined();
      }
    });

    it('should transition to HALF_OPEN after recovery timeout', async () => {
      const mockFn = jest.fn().mockRejectedValue(new Error('Service error'));

      // Trigger circuit to open with short recovery timeout
      for (let i = 0; i < 3; i++) {
        try {
          await service.execute('test-circuit', mockFn, {
            failureThreshold: 3,
            recoveryTimeout: 100, // 100ms
          });
        } catch (error) {
          // Expected to fail
        }
      }

      expect(service.getStatus('test-circuit').state).toBe(
        CircuitBreakerState.OPEN,
      );

      // Wait for recovery timeout
      await new Promise((resolve) => setTimeout(resolve, 150));

      // Next call should transition to HALF_OPEN
      const successFn = jest.fn().mockResolvedValue('success');
      const result = await service.execute('test-circuit', successFn, {
        failureThreshold: 3,
        recoveryTimeout: 100,
      });

      expect(result).toBe('success');
      expect(service.getStatus('test-circuit').state).toBe(
        CircuitBreakerState.CLOSED,
      );
    });

    it('should limit calls in HALF_OPEN state', async () => {
      const mockFn = jest.fn().mockRejectedValue(new Error('Service error'));

      // Trigger circuit to open
      for (let i = 0; i < 3; i++) {
        try {
          await service.execute('test-circuit', mockFn, {
            failureThreshold: 3,
            recoveryTimeout: 100,
            halfOpenMaxCalls: 2,
          });
        } catch (error) {
          // Expected to fail
        }
      }

      // Wait for recovery timeout
      await new Promise((resolve) => setTimeout(resolve, 150));

      // Make max allowed calls in HALF_OPEN state
      const slowFn = jest
        .fn()
        .mockImplementation(
          () => new Promise((resolve) => setTimeout(resolve, 50)),
        );

      // Start multiple calls simultaneously
      const promises = [
        service.execute('test-circuit', slowFn, {
          failureThreshold: 3,
          recoveryTimeout: 100,
          halfOpenMaxCalls: 2,
        }),
        service.execute('test-circuit', slowFn, {
          failureThreshold: 3,
          recoveryTimeout: 100,
          halfOpenMaxCalls: 2,
        }),
        service.execute('test-circuit', slowFn, {
          failureThreshold: 3,
          recoveryTimeout: 100,
          halfOpenMaxCalls: 2,
        }),
      ];

      // Third call should be rejected
      const results = await Promise.allSettled(promises);
      const rejectedCalls = results.filter((r) => r.status === 'rejected');

      expect(rejectedCalls.length).toBeGreaterThan(0);
      expect(rejectedCalls[0].reason).toBeInstanceOf(
        CircuitBreakerOpenException,
      );
    });
  });

  describe('Error Recovery', () => {
    it('should reset failure count on successful call in CLOSED state', async () => {
      const failFn = jest.fn().mockRejectedValue(new Error('Service error'));
      const successFn = jest.fn().mockResolvedValue('success');

      // Make some failed calls (but not enough to open circuit)
      for (let i = 0; i < 2; i++) {
        try {
          await service.execute('test-circuit', failFn, {
            failureThreshold: 5,
          });
        } catch (error) {
          // Expected to fail
        }
      }

      expect(service.getStatus('test-circuit').failureCount).toBe(2);

      // Make successful call
      await service.execute('test-circuit', successFn, { failureThreshold: 5 });

      expect(service.getStatus('test-circuit').failureCount).toBe(0);
    });

    it('should transition from HALF_OPEN to CLOSED on success', async () => {
      const mockFn = jest.fn().mockRejectedValue(new Error('Service error'));

      // Trigger circuit to open
      for (let i = 0; i < 3; i++) {
        try {
          await service.execute('test-circuit', mockFn, {
            failureThreshold: 3,
            recoveryTimeout: 100,
          });
        } catch (error) {
          // Expected to fail
        }
      }

      // Wait for recovery timeout
      await new Promise((resolve) => setTimeout(resolve, 150));

      // Make successful call to transition to CLOSED
      const successFn = jest.fn().mockResolvedValue('success');
      await service.execute('test-circuit', successFn, {
        failureThreshold: 3,
        recoveryTimeout: 100,
      });

      expect(service.getStatus('test-circuit').state).toBe(
        CircuitBreakerState.CLOSED,
      );
      expect(service.getStatus('test-circuit').failureCount).toBe(0);
    });

    it('should transition from HALF_OPEN back to OPEN on failure', async () => {
      const mockFn = jest.fn().mockRejectedValue(new Error('Service error'));

      // Trigger circuit to open
      for (let i = 0; i < 3; i++) {
        try {
          await service.execute('test-circuit', mockFn, {
            failureThreshold: 3,
            recoveryTimeout: 100,
          });
        } catch (error) {
          // Expected to fail
        }
      }

      // Wait for recovery timeout
      await new Promise((resolve) => setTimeout(resolve, 150));

      // Make failed call in HALF_OPEN state
      try {
        await service.execute('test-circuit', mockFn, {
          failureThreshold: 3,
          recoveryTimeout: 100,
        });
      } catch (error) {
        // Expected to fail
      }

      expect(service.getStatus('test-circuit').state).toBe(
        CircuitBreakerState.OPEN,
      );
    });
  });

  describe('Manual Reset', () => {
    it('should manually reset circuit breaker to CLOSED state', async () => {
      const mockFn = jest.fn().mockRejectedValue(new Error('Service error'));

      // Trigger circuit to open
      for (let i = 0; i < 5; i++) {
        try {
          await service.execute('test-circuit', mockFn, {
            failureThreshold: 5,
          });
        } catch (error) {
          // Expected to fail
        }
      }

      expect(service.getStatus('test-circuit').state).toBe(
        CircuitBreakerState.OPEN,
      );

      // Manual reset
      service.reset('test-circuit');

      expect(service.getStatus('test-circuit').state).toBe(
        CircuitBreakerState.CLOSED,
      );
      expect(service.getStatus('test-circuit').failureCount).toBe(0);
    });

    it('should allow execution after manual reset', async () => {
      const mockFn = jest.fn().mockRejectedValue(new Error('Service error'));

      // Trigger circuit to open
      for (let i = 0; i < 5; i++) {
        try {
          await service.execute('test-circuit', mockFn, {
            failureThreshold: 5,
          });
        } catch (error) {
          // Expected to fail
        }
      }

      // Manual reset
      service.reset('test-circuit');

      // Should be able to execute again
      const successFn = jest.fn().mockResolvedValue('success');
      const result = await service.execute('test-circuit', successFn);

      expect(result).toBe('success');
    });
  });

  describe('Multiple Circuits', () => {
    it('should manage multiple independent circuits', async () => {
      const failFn = jest.fn().mockRejectedValue(new Error('Service error'));
      const successFn = jest.fn().mockResolvedValue('success');

      // Open first circuit
      for (let i = 0; i < 5; i++) {
        try {
          await service.execute('circuit-1', failFn, { failureThreshold: 5 });
        } catch (error) {
          // Expected to fail
        }
      }

      // Second circuit should still work
      const result = await service.execute('circuit-2', successFn);

      expect(service.getStatus('circuit-1').state).toBe(
        CircuitBreakerState.OPEN,
      );
      expect(service.getStatus('circuit-2').state).toBe(
        CircuitBreakerState.CLOSED,
      );
      expect(result).toBe('success');
    });

    it('should return all circuit statuses', async () => {
      const mockFn = jest.fn().mockResolvedValue('success');

      // Create multiple circuits
      await service.execute('circuit-1', mockFn);
      await service.execute('circuit-2', mockFn);
      await service.execute('circuit-3', mockFn);

      const allStatuses = service.getAllStatuses();

      expect(Object.keys(allStatuses)).toContain('circuit-1');
      expect(Object.keys(allStatuses)).toContain('circuit-2');
      expect(Object.keys(allStatuses)).toContain('circuit-3');

      Object.values(allStatuses).forEach((status) => {
        expect(status.state).toBe(CircuitBreakerState.CLOSED);
      });
    });
  });

  describe('Configuration', () => {
    it('should use custom configuration', async () => {
      const mockFn = jest.fn().mockRejectedValue(new Error('Service error'));

      // Use custom failure threshold
      for (let i = 0; i < 2; i++) {
        try {
          await service.execute('test-circuit', mockFn, {
            failureThreshold: 2,
          });
        } catch (error) {
          // Expected to fail
        }
      }

      expect(service.getStatus('test-circuit').state).toBe(
        CircuitBreakerState.OPEN,
      );
    });

    it('should handle different recovery timeouts', async () => {
      const mockFn = jest.fn().mockRejectedValue(new Error('Service error'));

      // Trigger circuit to open with very short recovery timeout
      for (let i = 0; i < 3; i++) {
        try {
          await service.execute('test-circuit', mockFn, {
            failureThreshold: 3,
            recoveryTimeout: 50,
          });
        } catch (error) {
          // Expected to fail
        }
      }

      expect(service.getStatus('test-circuit').state).toBe(
        CircuitBreakerState.OPEN,
      );

      // Wait for recovery timeout
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Should be able to attempt again
      const successFn = jest.fn().mockResolvedValue('success');
      const result = await service.execute('test-circuit', successFn, {
        failureThreshold: 3,
        recoveryTimeout: 50,
      });

      expect(result).toBe('success');
    });
  });
});
