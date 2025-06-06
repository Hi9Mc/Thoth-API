"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * @jest-environment node
 */
require("@jest/globals");
require("jest");
const CircuitBreakerRepositoryWrapper_1 = require("./CircuitBreakerRepositoryWrapper");
const SearchCriteria_1 = require("../../domain/entities/SearchCriteria");
const CircuitBreaker_1 = require("../circuit-breaker/CircuitBreaker");
// Mock repository for testing the circuit breaker wrapper
class MockRepository {
    constructor() {
        this.storage = new Map();
        this.shouldFail = false;
        this.failureCount = 0;
        this.maxFailures = 0;
    }
    setFailure(shouldFail, maxFailures = 0) {
        this.shouldFail = shouldFail;
        this.failureCount = 0;
        this.maxFailures = maxFailures;
    }
    createKey(key) {
        return `${key.tenantId}:${key.resourceType}:${key.resourceId}:${key.version}`;
    }
    checkFailure() {
        if (this.shouldFail && (this.maxFailures === 0 || this.failureCount < this.maxFailures)) {
            this.failureCount++;
            throw new Error(`Repository failure #${this.failureCount}`);
        }
    }
    async create(obj) {
        this.checkFailure();
        const key = this.createKey(obj);
        this.storage.set(key, { ...obj });
        return obj;
    }
    async update(obj) {
        this.checkFailure();
        const key = this.createKey(obj);
        if (!this.storage.has(key)) {
            throw new Error('Object not found');
        }
        this.storage.set(key, { ...obj });
        return obj;
    }
    async delete(key) {
        this.checkFailure();
        const keyStr = this.createKey(key);
        return this.storage.delete(keyStr);
    }
    async findByKey(key) {
        this.checkFailure();
        const keyStr = this.createKey(key);
        return this.storage.get(keyStr) || null;
    }
    async search(condition, pagination) {
        this.checkFailure();
        const allObjects = Array.from(this.storage.values());
        const page = pagination.page || 1;
        const limit = pagination.limit || 10;
        const start = (page - 1) * limit;
        const end = start + limit;
        const results = allObjects.slice(start, end);
        return { results, total: allObjects.length };
    }
    async exists(condition) {
        this.checkFailure();
        return this.storage.size > 0;
    }
    async count(condition) {
        this.checkFailure();
        return this.storage.size;
    }
}
describe('CircuitBreakerRepositoryWrapper Infrastructure', () => {
    let wrapper;
    let mockRepository;
    let config;
    beforeEach(() => {
        mockRepository = new MockRepository();
        config = {
            failureThreshold: 3,
            resetTimeout: 1000,
            monitoringPeriod: 500
        };
        wrapper = new CircuitBreakerRepositoryWrapper_1.CircuitBreakerRepositoryWrapper(mockRepository, config);
    });
    describe('Circuit Breaker Pattern Implementation', () => {
        it('should create wrapper with repository and circuit breaker config', () => {
            expect(wrapper).toBeInstanceOf(CircuitBreakerRepositoryWrapper_1.CircuitBreakerRepositoryWrapper);
        });
        it('should implement ProjectObjectRepository interface', () => {
            expect(typeof wrapper.create).toBe('function');
            expect(typeof wrapper.update).toBe('function');
            expect(typeof wrapper.delete).toBe('function');
            expect(typeof wrapper.findByKey).toBe('function');
            expect(typeof wrapper.search).toBe('function');
            expect(typeof wrapper.exists).toBe('function');
            expect(typeof wrapper.count).toBe('function');
        });
        it('should use default config when none provided', () => {
            const defaultWrapper = new CircuitBreakerRepositoryWrapper_1.CircuitBreakerRepositoryWrapper(mockRepository);
            expect(defaultWrapper).toBeInstanceOf(CircuitBreakerRepositoryWrapper_1.CircuitBreakerRepositoryWrapper);
        });
    });
    describe('Normal Operations (Circuit Closed)', () => {
        const testObject = {
            tenantId: 'test-project-123',
            resourceType: 'document',
            resourceId: 'doc-456',
            version: 1,
            title: 'Test Document'
        };
        const testKey = {
            tenantId: 'test-project-123',
            resourceType: 'document',
            resourceId: 'doc-456',
            version: 1
        };
        it('should delegate create operations to wrapped repository', async () => {
            const result = await wrapper.create(testObject);
            expect(result).toEqual(testObject);
        });
        it('should delegate update operations to wrapped repository', async () => {
            await wrapper.create(testObject);
            const updatedObject = { ...testObject, title: 'Updated' };
            const result = await wrapper.update(updatedObject);
            expect(result.title).toBe('Updated');
        });
        it('should delegate delete operations to wrapped repository', async () => {
            await wrapper.create(testObject);
            const result = await wrapper.delete(testKey);
            expect(result).toBe(true);
        });
        it('should delegate findByKey operations to wrapped repository', async () => {
            await wrapper.create(testObject);
            const result = await wrapper.findByKey(testKey);
            expect(result).toEqual(testObject);
        });
        it('should delegate search operations to wrapped repository', async () => {
            await wrapper.create(testObject);
            const searchCondition = {
                logic: SearchCriteria_1.SearchLogicalOperator.AND,
                conditions: [
                    {
                        key: 'projectId',
                        value: 'test-project-123',
                        operator: SearchCriteria_1.SearchConditionOperator.EQUALS
                    }
                ]
            };
            const pagination = {
                page: 1,
                limit: 10
            };
            const result = await wrapper.search(searchCondition, pagination);
            expect(result).toHaveProperty('results');
            expect(result).toHaveProperty('total');
        });
        it('should delegate exists operations to wrapped repository', async () => {
            const searchCondition = {
                logic: SearchCriteria_1.SearchLogicalOperator.AND,
                conditions: []
            };
            const result = await wrapper.exists(searchCondition);
            expect(typeof result).toBe('boolean');
        });
        it('should delegate count operations to wrapped repository', async () => {
            const searchCondition = {
                logic: SearchCriteria_1.SearchLogicalOperator.AND,
                conditions: []
            };
            const result = await wrapper.count(searchCondition);
            expect(typeof result).toBe('number');
        });
    });
    describe('Circuit Breaker State Transitions', () => {
        const testObject = {
            tenantId: 'test-project',
            resourceType: 'document',
            resourceId: 'doc-123',
            version: 1,
            title: 'Test'
        };
        it('should transition to OPEN state after failure threshold is reached', async () => {
            mockRepository.setFailure(true);
            // Trigger failures to reach threshold
            for (let i = 0; i < config.failureThreshold; i++) {
                try {
                    await wrapper.create(testObject);
                }
                catch (error) {
                    // Expected to fail
                }
            }
            // Circuit should now be OPEN
            const metrics = wrapper.getCircuitBreakerMetrics();
            expect(metrics.state).toBe(CircuitBreaker_1.CircuitBreakerState.OPEN);
        });
        it('should reject requests immediately when circuit is OPEN', async () => {
            mockRepository.setFailure(true);
            // Trigger failures to open circuit
            for (let i = 0; i < config.failureThreshold; i++) {
                try {
                    await wrapper.create(testObject);
                }
                catch (error) {
                    // Expected to fail
                }
            }
            // Next request should be rejected immediately without calling repository
            const startTime = Date.now();
            try {
                await wrapper.create(testObject);
                fail('Expected circuit breaker to reject request');
            }
            catch (error) {
                const duration = Date.now() - startTime;
                expect(duration).toBeLessThan(100); // Should be immediate
                expect(error.message).toContain('Circuit breaker is OPEN');
            }
        });
        it('should transition to HALF_OPEN state after reset timeout', async () => {
            mockRepository.setFailure(true);
            // Open the circuit
            for (let i = 0; i < config.failureThreshold; i++) {
                try {
                    await wrapper.create(testObject);
                }
                catch (error) {
                    // Expected to fail
                }
            }
            expect(wrapper.getCircuitBreakerMetrics().state).toBe(CircuitBreaker_1.CircuitBreakerState.OPEN);
            // Wait for reset timeout
            await new Promise(resolve => setTimeout(resolve, config.resetTimeout + 100));
            // Circuit should transition to HALF_OPEN on next request
            mockRepository.setFailure(false); // Allow success
            await wrapper.create(testObject);
            const metrics = wrapper.getCircuitBreakerMetrics();
            expect(metrics.state).toBe(CircuitBreaker_1.CircuitBreakerState.CLOSED);
        });
    });
    describe('Circuit Breaker Metrics', () => {
        const testObject = {
            tenantId: 'test-project',
            resourceType: 'document',
            resourceId: 'doc-123',
            version: 1,
            title: 'Test'
        };
        it('should provide circuit breaker metrics', () => {
            const metrics = wrapper.getCircuitBreakerMetrics();
            expect(metrics).toHaveProperty('state');
            expect(metrics).toHaveProperty('failureCount');
            expect(metrics).toHaveProperty('successCount');
            expect(metrics).toHaveProperty('totalRequests');
            expect(metrics).toHaveProperty('lastFailureTime');
        });
        it('should track failure count correctly', async () => {
            mockRepository.setFailure(true, 2); // Fail first 2 attempts
            try {
                await wrapper.create(testObject);
            }
            catch (error) {
                // Expected
            }
            try {
                await wrapper.create(testObject);
            }
            catch (error) {
                // Expected
            }
            const metrics = wrapper.getCircuitBreakerMetrics();
            expect(metrics.failureCount).toBe(2);
        });
        it('should track success count correctly', async () => {
            await wrapper.create(testObject);
            await wrapper.create({ ...testObject, resourceId: 'doc-124' });
            const metrics = wrapper.getCircuitBreakerMetrics();
            expect(metrics.successCount).toBe(2);
        });
        it('should update last failure time on failures', async () => {
            mockRepository.setFailure(true, 1);
            const beforeTime = Date.now();
            try {
                await wrapper.create(testObject);
            }
            catch (error) {
                // Expected
            }
            const afterTime = Date.now();
            const metrics = wrapper.getCircuitBreakerMetrics();
            expect(metrics.lastFailureTime).toBeGreaterThanOrEqual(beforeTime);
            expect(metrics.lastFailureTime).toBeLessThanOrEqual(afterTime);
        });
        it('should update last success time on successful operations', async () => {
            await wrapper.create(testObject);
            const metrics = wrapper.getCircuitBreakerMetrics();
            expect(metrics.successCount).toBe(1);
            expect(metrics.totalRequests).toBe(1);
        });
    });
    describe('Error Handling and Propagation', () => {
        const testObject = {
            tenantId: 'test-project',
            resourceType: 'document',
            resourceId: 'doc-123',
            version: 1,
            title: 'Test'
        };
        it('should propagate repository errors when circuit is closed', async () => {
            mockRepository.setFailure(true, 1);
            try {
                await wrapper.create(testObject);
                fail('Expected error to be propagated');
            }
            catch (error) {
                expect(error.message).toContain('Repository failure #1');
            }
        });
        it('should provide circuit breaker error when circuit is open', async () => {
            mockRepository.setFailure(true);
            // Open the circuit
            for (let i = 0; i < config.failureThreshold; i++) {
                try {
                    await wrapper.create(testObject);
                }
                catch (error) {
                    // Expected to fail
                }
            }
            // Next request should get circuit breaker error
            try {
                await wrapper.create(testObject);
                fail('Expected circuit breaker error');
            }
            catch (error) {
                expect(error.message).toContain('Circuit breaker is OPEN');
            }
        });
    });
    describe('Resilience and Recovery', () => {
        const testObject = {
            tenantId: 'test-project',
            resourceType: 'document',
            resourceId: 'doc-123',
            version: 1,
            title: 'Test'
        };
        it('should recover from temporary failures', async () => {
            // Fail first 2 attempts, then succeed
            mockRepository.setFailure(true, 2);
            // First two should fail
            try {
                await wrapper.create(testObject);
                fail('Expected first attempt to fail');
            }
            catch (error) {
                expect(error.message).toContain('Repository failure #1');
            }
            try {
                await wrapper.create(testObject);
                fail('Expected second attempt to fail');
            }
            catch (error) {
                expect(error.message).toContain('Repository failure #2');
            }
            // Third attempt should succeed (repository no longer fails)
            const result = await wrapper.create({ ...testObject, resourceId: 'doc-124' });
            expect(result.resourceId).toBe('doc-124');
            // Circuit should still be closed
            const metrics = wrapper.getCircuitBreakerMetrics();
            expect(metrics.state).toBe(CircuitBreaker_1.CircuitBreakerState.CLOSED);
        });
    });
    describe('Configuration Validation', () => {
        it('should work with different configuration values', () => {
            const customConfig = {
                failureThreshold: 10,
                resetTimeout: 30000,
                monitoringPeriod: 5000
            };
            const customWrapper = new CircuitBreakerRepositoryWrapper_1.CircuitBreakerRepositoryWrapper(mockRepository, customConfig);
            expect(customWrapper).toBeInstanceOf(CircuitBreakerRepositoryWrapper_1.CircuitBreakerRepositoryWrapper);
        });
    });
    describe('Concurrent Operations', () => {
        const testObject = {
            tenantId: 'test-project',
            resourceType: 'document',
            resourceId: 'doc-123',
            version: 1,
            title: 'Test'
        };
        it('should handle concurrent successful operations', async () => {
            const promises = [];
            for (let i = 0; i < 5; i++) {
                promises.push(wrapper.create({
                    ...testObject,
                    resourceId: `doc-${i}`,
                    version: i
                }));
            }
            const results = await Promise.all(promises);
            expect(results).toHaveLength(5);
            const metrics = wrapper.getCircuitBreakerMetrics();
            expect(metrics.successCount).toBe(5);
        });
        it('should handle concurrent operations with some failures', async () => {
            mockRepository.setFailure(true, 2); // First 2 will fail
            const promises = [];
            for (let i = 0; i < 5; i++) {
                promises.push(wrapper.create({
                    ...testObject,
                    resourceId: `doc-${i}`,
                    version: i
                }).catch(error => error));
            }
            const results = await Promise.all(promises);
            // First 2 should be errors, rest should succeed
            expect(results[0]).toBeInstanceOf(Error);
            expect(results[1]).toBeInstanceOf(Error);
            expect(results[2]).not.toBeInstanceOf(Error);
            expect(results[3]).not.toBeInstanceOf(Error);
            expect(results[4]).not.toBeInstanceOf(Error);
        });
    });
});
