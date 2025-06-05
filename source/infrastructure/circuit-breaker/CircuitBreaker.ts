export enum CircuitBreakerState {
    CLOSED = 'CLOSED',
    OPEN = 'OPEN', 
    HALF_OPEN = 'HALF_OPEN'
}

export interface CircuitBreakerConfig {
    failureThreshold: number;
    resetTimeout: number;
    monitoringPeriod: number;
}

export interface CircuitBreakerMetrics {
    failureCount: number;
    successCount: number;
    totalRequests: number;
    lastFailureTime?: number;
    state: CircuitBreakerState;
}

export class CircuitBreakerError extends Error {
    constructor(message: string, public readonly state: CircuitBreakerState) {
        super(message);
        this.name = 'CircuitBreakerError';
    }
}

export class CircuitBreaker {
    private state: CircuitBreakerState = CircuitBreakerState.CLOSED;
    private failureCount = 0;
    private successCount = 0;
    private totalRequests = 0;
    private lastFailureTime?: number;
    private nextAttempt?: number;

    constructor(private config: CircuitBreakerConfig) {}

    async execute<T>(operation: () => Promise<T>): Promise<T> {
        if (this.state === CircuitBreakerState.OPEN) {
            if (this.shouldAttemptReset()) {
                this.state = CircuitBreakerState.HALF_OPEN;
            } else {
                throw new CircuitBreakerError('Circuit breaker is OPEN', this.state);
            }
        }

        try {
            this.totalRequests++;
            const result = await operation();
            this.onSuccess();
            return result;
        } catch (error) {
            this.onFailure();
            throw error;
        }
    }

    private onSuccess(): void {
        this.successCount++;
        this.failureCount = 0;
        
        if (this.state === CircuitBreakerState.HALF_OPEN) {
            this.state = CircuitBreakerState.CLOSED;
        }
    }

    private onFailure(): void {
        this.failureCount++;
        this.lastFailureTime = Date.now();

        if (this.failureCount >= this.config.failureThreshold) {
            this.state = CircuitBreakerState.OPEN;
            this.nextAttempt = Date.now() + this.config.resetTimeout;
        }
    }

    private shouldAttemptReset(): boolean {
        return this.nextAttempt !== undefined && Date.now() >= this.nextAttempt;
    }

    getMetrics(): CircuitBreakerMetrics {
        return {
            failureCount: this.failureCount,
            successCount: this.successCount,
            totalRequests: this.totalRequests,
            lastFailureTime: this.lastFailureTime,
            state: this.state
        };
    }

    reset(): void {
        this.state = CircuitBreakerState.CLOSED;
        this.failureCount = 0;
        this.successCount = 0;
        this.totalRequests = 0;
        this.lastFailureTime = undefined;
        this.nextAttempt = undefined;
    }
}