"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CircuitBreaker = exports.CircuitBreakerError = exports.CircuitBreakerState = void 0;
var CircuitBreakerState;
(function (CircuitBreakerState) {
    CircuitBreakerState["CLOSED"] = "CLOSED";
    CircuitBreakerState["OPEN"] = "OPEN";
    CircuitBreakerState["HALF_OPEN"] = "HALF_OPEN";
})(CircuitBreakerState || (exports.CircuitBreakerState = CircuitBreakerState = {}));
class CircuitBreakerError extends Error {
    constructor(message, state) {
        super(message);
        this.state = state;
        this.name = 'CircuitBreakerError';
    }
}
exports.CircuitBreakerError = CircuitBreakerError;
class CircuitBreaker {
    constructor(config) {
        this.config = config;
        this.state = CircuitBreakerState.CLOSED;
        this.failureCount = 0;
        this.successCount = 0;
        this.totalRequests = 0;
    }
    async execute(operation) {
        if (this.state === CircuitBreakerState.OPEN) {
            if (this.shouldAttemptReset()) {
                this.state = CircuitBreakerState.HALF_OPEN;
            }
            else {
                throw new CircuitBreakerError('Circuit breaker is OPEN', this.state);
            }
        }
        try {
            this.totalRequests++;
            const result = await operation();
            this.onSuccess();
            return result;
        }
        catch (error) {
            this.onFailure();
            throw error;
        }
    }
    onSuccess() {
        this.successCount++;
        this.failureCount = 0;
        if (this.state === CircuitBreakerState.HALF_OPEN) {
            this.state = CircuitBreakerState.CLOSED;
        }
    }
    onFailure() {
        this.failureCount++;
        this.lastFailureTime = Date.now();
        if (this.failureCount >= this.config.failureThreshold) {
            this.state = CircuitBreakerState.OPEN;
            this.nextAttempt = Date.now() + this.config.resetTimeout;
        }
    }
    shouldAttemptReset() {
        return this.nextAttempt !== undefined && Date.now() >= this.nextAttempt;
    }
    getMetrics() {
        return {
            failureCount: this.failureCount,
            successCount: this.successCount,
            totalRequests: this.totalRequests,
            lastFailureTime: this.lastFailureTime,
            state: this.state
        };
    }
    reset() {
        this.state = CircuitBreakerState.CLOSED;
        this.failureCount = 0;
        this.successCount = 0;
        this.totalRequests = 0;
        this.lastFailureTime = undefined;
        this.nextAttempt = undefined;
    }
}
exports.CircuitBreaker = CircuitBreaker;
