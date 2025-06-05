import { CircuitBreaker, CircuitBreakerState, CircuitBreakerError } from './CircuitBreaker';

describe('CircuitBreaker', () => {
    let circuitBreaker: CircuitBreaker;

    beforeEach(() => {
        circuitBreaker = new CircuitBreaker({
            failureThreshold: 3,
            resetTimeout: 1000,
            monitoringPeriod: 500
        });
    });

    describe('CLOSED state', () => {
        it('should execute operation successfully when closed', async () => {
            const operation = jest.fn().mockResolvedValue('success');
            
            const result = await circuitBreaker.execute(operation);
            
            expect(result).toBe('success');
            expect(operation).toHaveBeenCalledTimes(1);
            expect(circuitBreaker.getMetrics().state).toBe(CircuitBreakerState.CLOSED);
        });

        it('should transition to OPEN state after threshold failures', async () => {
            const operation = jest.fn().mockRejectedValue(new Error('Test error'));
            
            // Trigger failures up to threshold
            for (let i = 0; i < 3; i++) {
                try {
                    await circuitBreaker.execute(operation);
                } catch (error) {
                    // Expected
                }
            }
            
            expect(circuitBreaker.getMetrics().state).toBe(CircuitBreakerState.OPEN);
            expect(circuitBreaker.getMetrics().failureCount).toBe(3);
        });
    });

    describe('OPEN state', () => {
        beforeEach(async () => {
            // Force circuit breaker to OPEN state
            const operation = jest.fn().mockRejectedValue(new Error('Test error'));
            for (let i = 0; i < 3; i++) {
                try {
                    await circuitBreaker.execute(operation);
                } catch (error) {
                    // Expected
                }
            }
        });

        it('should reject operations immediately when open', async () => {
            const operation = jest.fn().mockResolvedValue('success');
            
            await expect(circuitBreaker.execute(operation)).rejects.toThrow(CircuitBreakerError);
            expect(operation).not.toHaveBeenCalled();
        });

        it('should transition to HALF_OPEN after reset timeout', async () => {
            const operation = jest.fn().mockResolvedValue('success');
            
            // Wait for reset timeout
            await new Promise(resolve => setTimeout(resolve, 1100));
            
            const result = await circuitBreaker.execute(operation);
            
            expect(result).toBe('success');
            expect(circuitBreaker.getMetrics().state).toBe(CircuitBreakerState.CLOSED);
        });
    });

    describe('HALF_OPEN state', () => {
        beforeEach(async () => {
            // Force to OPEN then wait for reset timeout to transition to HALF_OPEN
            const operation = jest.fn().mockRejectedValue(new Error('Test error'));
            for (let i = 0; i < 3; i++) {
                try {
                    await circuitBreaker.execute(operation);
                } catch (error) {
                    // Expected
                }
            }
            // Wait for reset timeout
            await new Promise(resolve => setTimeout(resolve, 1100));
        });

        it('should transition to CLOSED on successful operation', async () => {
            const operation = jest.fn().mockResolvedValue('success');
            
            const result = await circuitBreaker.execute(operation);
            
            expect(result).toBe('success');
            expect(circuitBreaker.getMetrics().state).toBe(CircuitBreakerState.CLOSED);
        });

        it('should transition back to OPEN on failed operation', async () => {
            const operation = jest.fn().mockRejectedValue(new Error('Test error'));
            
            try {
                await circuitBreaker.execute(operation);
            } catch (error) {
                // Expected
            }
            
            expect(circuitBreaker.getMetrics().state).toBe(CircuitBreakerState.OPEN);
        });
    });

    describe('metrics', () => {
        it('should track success and failure counts', async () => {
            const successOp = jest.fn().mockResolvedValue('success');
            const failOp = jest.fn().mockRejectedValue(new Error('Test error'));
            
            await circuitBreaker.execute(successOp);
            await circuitBreaker.execute(successOp);
            
            try {
                await circuitBreaker.execute(failOp);
            } catch (error) {
                // Expected
            }
            
            const metrics = circuitBreaker.getMetrics();
            expect(metrics.successCount).toBe(2);
            expect(metrics.failureCount).toBe(1);
            expect(metrics.totalRequests).toBe(3);
        });
    });

    describe('reset', () => {
        it('should reset all metrics and state', async () => {
            const operation = jest.fn().mockRejectedValue(new Error('Test error'));
            
            // Trigger some failures
            try {
                await circuitBreaker.execute(operation);
            } catch (error) {
                // Expected
            }
            
            circuitBreaker.reset();
            
            const metrics = circuitBreaker.getMetrics();
            expect(metrics.state).toBe(CircuitBreakerState.CLOSED);
            expect(metrics.failureCount).toBe(0);
            expect(metrics.successCount).toBe(0);
            expect(metrics.totalRequests).toBe(0);
        });
    });
});