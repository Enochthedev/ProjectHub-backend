import { Injectable, Logger } from '@nestjs/common';
import { CircuitBreakerOpenException } from '../common/exceptions/app.exception';

export enum CircuitBreakerState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN',
}

export interface CircuitBreakerConfig {
  failureThreshold: number;
  recoveryTimeout: number;
  monitoringPeriod: number;
  halfOpenMaxCalls: number;
}

export interface CircuitBreakerStatus {
  state: CircuitBreakerState;
  failureCount: number;
  lastFailureTime?: Date;
  nextAttemptTime?: Date;
}

@Injectable()
export class CircuitBreakerService {
  private readonly logger = new Logger(CircuitBreakerService.name);
  private readonly circuits = new Map<
    string,
    {
      state: CircuitBreakerState;
      failureCount: number;
      lastFailureTime?: Date;
      nextAttemptTime?: Date;
      halfOpenCalls: number;
      config: CircuitBreakerConfig;
    }
  >();

  private readonly defaultConfig: CircuitBreakerConfig = {
    failureThreshold: 5,
    recoveryTimeout: 60000, // 1 minute
    monitoringPeriod: 300000, // 5 minutes
    halfOpenMaxCalls: 3,
  };

  /**
   * Execute a function with circuit breaker protection
   */
  async execute<T>(
    circuitName: string,
    fn: () => Promise<T>,
    config?: Partial<CircuitBreakerConfig>,
  ): Promise<T> {
    const circuit = this.getOrCreateCircuit(circuitName, config);

    // Check if circuit is open
    if (circuit.state === CircuitBreakerState.OPEN) {
      if (this.shouldAttemptReset(circuit)) {
        this.transitionToHalfOpen(circuitName, circuit);
      } else {
        throw new CircuitBreakerOpenException(
          circuitName,
          circuit.nextAttemptTime,
        );
      }
    }

    // Check if circuit is half-open and we've exceeded max calls
    if (
      circuit.state === CircuitBreakerState.HALF_OPEN &&
      circuit.halfOpenCalls >= circuit.config.halfOpenMaxCalls
    ) {
      throw new CircuitBreakerOpenException(circuitName);
    }

    try {
      if (circuit.state === CircuitBreakerState.HALF_OPEN) {
        circuit.halfOpenCalls++;
      }

      const result = await fn();

      // Success - handle state transitions
      this.onSuccess(circuitName, circuit);
      return result;
    } catch (error) {
      // Failure - handle state transitions
      this.onFailure(circuitName, circuit, error);
      throw error;
    }
  }

  /**
   * Get the current status of a circuit breaker
   */
  getStatus(circuitName: string): CircuitBreakerStatus {
    const circuit = this.circuits.get(circuitName);
    if (!circuit) {
      return {
        state: CircuitBreakerState.CLOSED,
        failureCount: 0,
      };
    }

    return {
      state: circuit.state,
      failureCount: circuit.failureCount,
      lastFailureTime: circuit.lastFailureTime,
      nextAttemptTime: circuit.nextAttemptTime,
    };
  }

  /**
   * Manually reset a circuit breaker
   */
  reset(circuitName: string): void {
    const circuit = this.circuits.get(circuitName);
    if (circuit) {
      circuit.state = CircuitBreakerState.CLOSED;
      circuit.failureCount = 0;
      circuit.halfOpenCalls = 0;
      circuit.lastFailureTime = undefined;
      circuit.nextAttemptTime = undefined;
      this.logger.log(
        `Circuit breaker ${circuitName} manually reset to CLOSED`,
      );
    }
  }

  /**
   * Get all circuit breaker statuses
   */
  getAllStatuses(): Record<string, CircuitBreakerStatus> {
    const statuses: Record<string, CircuitBreakerStatus> = {};
    for (const [name] of this.circuits) {
      statuses[name] = this.getStatus(name);
    }
    return statuses;
  }

  /**
   * Get or create a circuit breaker
   */
  private getOrCreateCircuit(
    circuitName: string,
    config?: Partial<CircuitBreakerConfig>,
  ) {
    let circuit = this.circuits.get(circuitName);
    if (!circuit) {
      circuit = {
        state: CircuitBreakerState.CLOSED,
        failureCount: 0,
        halfOpenCalls: 0,
        config: { ...this.defaultConfig, ...config },
      };
      this.circuits.set(circuitName, circuit);
      this.logger.log(`Created new circuit breaker: ${circuitName}`);
    }
    return circuit;
  }

  /**
   * Handle successful execution
   */
  private onSuccess(circuitName: string, circuit: any): void {
    if (circuit.state === CircuitBreakerState.HALF_OPEN) {
      // Successful call in half-open state - transition to closed
      circuit.state = CircuitBreakerState.CLOSED;
      circuit.failureCount = 0;
      circuit.halfOpenCalls = 0;
      circuit.lastFailureTime = undefined;
      circuit.nextAttemptTime = undefined;
      this.logger.log(
        `Circuit breaker ${circuitName} transitioned to CLOSED after successful call`,
      );
    } else if (circuit.state === CircuitBreakerState.CLOSED) {
      // Reset failure count on success in closed state
      circuit.failureCount = 0;
    }
  }

  /**
   * Handle failed execution
   */
  private onFailure(circuitName: string, circuit: any, error: Error): void {
    circuit.failureCount++;
    circuit.lastFailureTime = new Date();

    if (circuit.state === CircuitBreakerState.HALF_OPEN) {
      // Failure in half-open state - transition back to open
      this.transitionToOpen(circuitName, circuit);
    } else if (
      circuit.state === CircuitBreakerState.CLOSED &&
      circuit.failureCount >= circuit.config.failureThreshold
    ) {
      // Failure threshold reached in closed state - transition to open
      this.transitionToOpen(circuitName, circuit);
    }

    this.logger.warn(
      `Circuit breaker ${circuitName} recorded failure (${circuit.failureCount}/${circuit.config.failureThreshold}): ${error.message}`,
    );
  }

  /**
   * Transition circuit to open state
   */
  private transitionToOpen(circuitName: string, circuit: any): void {
    circuit.state = CircuitBreakerState.OPEN;
    circuit.nextAttemptTime = new Date(
      Date.now() + circuit.config.recoveryTimeout,
    );
    circuit.halfOpenCalls = 0;
    this.logger.warn(
      `Circuit breaker ${circuitName} transitioned to OPEN. Next attempt at ${circuit.nextAttemptTime}`,
    );
  }

  /**
   * Transition circuit to half-open state
   */
  private transitionToHalfOpen(circuitName: string, circuit: any): void {
    circuit.state = CircuitBreakerState.HALF_OPEN;
    circuit.halfOpenCalls = 0;
    circuit.nextAttemptTime = undefined;
    this.logger.log(`Circuit breaker ${circuitName} transitioned to HALF_OPEN`);
  }

  /**
   * Check if we should attempt to reset the circuit breaker
   */
  private shouldAttemptReset(circuit: any): boolean {
    return circuit.nextAttemptTime && new Date() >= circuit.nextAttemptTime;
  }

  /**
   * Clean up old failure records (called periodically)
   */
  private cleanupOldRecords(): void {
    const now = new Date();
    for (const [name, circuit] of this.circuits) {
      if (
        circuit.lastFailureTime &&
        now.getTime() - circuit.lastFailureTime.getTime() >
          circuit.config.monitoringPeriod
      ) {
        if (circuit.state === CircuitBreakerState.CLOSED) {
          circuit.failureCount = 0;
          circuit.lastFailureTime = undefined;
        }
      }
    }
  }
}
