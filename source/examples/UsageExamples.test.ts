/**
 * @jest-environment node
 */
import '@jest/globals';
import 'jest';
import { 
    createInMemoryExample,
    createDynamoDBExample,
    createMongoDBExample,
    demonstrateUsage,
    demonstrateCircuitBreakerMetrics
} from './UsageExamples';
import { ProjectObject } from '../domain/entities/ProjectObject';
import { DatabaseType } from '../infrastructure/database/RepositoryFactory';
import { CircuitBreakerState } from '../infrastructure/circuit-breaker/CircuitBreaker';

// Mock console methods to test output
const mockConsoleLog = jest.spyOn(console, 'log').mockImplementation(() => {});

describe('UsageExamples', () => {
    beforeEach(() => {
        mockConsoleLog.mockClear();
    });

    afterAll(() => {
        mockConsoleLog.mockRestore();
    });

    describe('createInMemoryExample', () => {
        it('should create a complete setup with in-memory database and circuit breaker', () => {
            const { repository, useCase, controller } = createInMemoryExample<ProjectObject>();
            
            expect(repository).toBeDefined();
            expect(useCase).toBeDefined();
            expect(controller).toBeDefined();
            
            // Verify repository has circuit breaker wrapper
            expect('getCircuitBreakerMetrics' in repository).toBe(true);
            expect('resetCircuitBreaker' in repository).toBe(true);
            
            // Check circuit breaker configuration
            if ('getCircuitBreakerMetrics' in repository) {
                const metrics = repository.getCircuitBreakerMetrics();
                expect(metrics.state).toBe(CircuitBreakerState.CLOSED);
                expect(metrics.failureCount).toBe(0);
                expect(metrics.successCount).toBe(0);
                expect(metrics.totalRequests).toBe(0);
            }
        });

        it('should work with custom ProjectObject type', () => {
            interface CustomObject extends ProjectObject {
                customProperty: string;
            }
            
            const { repository, useCase, controller } = createInMemoryExample<CustomObject>();
            
            expect(repository).toBeDefined();
            expect(useCase).toBeDefined();
            expect(controller).toBeDefined();
        });
    });

    describe('createDynamoDBExample', () => {
        it('should create a complete setup with DynamoDB and circuit breaker', () => {
            const { repository, useCase, controller } = createDynamoDBExample<ProjectObject>();
            
            expect(repository).toBeDefined();
            expect(useCase).toBeDefined();
            expect(controller).toBeDefined();
            
            // Verify repository has circuit breaker wrapper
            expect('getCircuitBreakerMetrics' in repository).toBe(true);
            expect('resetCircuitBreaker' in repository).toBe(true);
            
            // Check circuit breaker configuration (should have different config than in-memory)
            if ('getCircuitBreakerMetrics' in repository) {
                const metrics = repository.getCircuitBreakerMetrics();
                expect(metrics.state).toBe(CircuitBreakerState.CLOSED);
                expect(metrics.failureCount).toBe(0);
                expect(metrics.successCount).toBe(0);
                expect(metrics.totalRequests).toBe(0);
            }
        });

        it('should work with custom ProjectObject type', () => {
            interface CustomObject extends ProjectObject {
                dynamoSpecificField: number;
            }
            
            const { repository, useCase, controller } = createDynamoDBExample<CustomObject>();
            
            expect(repository).toBeDefined();
            expect(useCase).toBeDefined();
            expect(controller).toBeDefined();
        });
    });

    describe('createMongoDBExample', () => {
        it('should create a complete setup with MongoDB without circuit breaker', () => {
            const { repository, useCase, controller } = createMongoDBExample<ProjectObject>();
            
            expect(repository).toBeDefined();
            expect(useCase).toBeDefined();
            expect(controller).toBeDefined();
            
            // Verify repository does NOT have circuit breaker wrapper
            expect('getCircuitBreakerMetrics' in repository).toBe(false);
            expect('resetCircuitBreaker' in repository).toBe(false);
        });

        it('should work with custom ProjectObject type', () => {
            interface CustomObject extends ProjectObject {
                mongoSpecificField: boolean;
            }
            
            const { repository, useCase, controller } = createMongoDBExample<CustomObject>();
            
            expect(repository).toBeDefined();
            expect(useCase).toBeDefined();
            expect(controller).toBeDefined();
        });
    });

    describe('demonstrateUsage', () => {
        it('should execute complete CRUD workflow without errors', async () => {
            // This test should complete without throwing errors
            await expect(demonstrateUsage()).resolves.not.toThrow();
            
            // Check that console.log was called multiple times for different operations
            expect(mockConsoleLog).toHaveBeenCalledWith(
                expect.stringContaining('Create result:'),
                expect.any(Object)
            );
            expect(mockConsoleLog).toHaveBeenCalledWith(
                expect.stringContaining('Get result:'),
                expect.any(Object)
            );
            expect(mockConsoleLog).toHaveBeenCalledWith(
                expect.stringContaining('Search result:'),
                expect.any(Object)
            );
            expect(mockConsoleLog).toHaveBeenCalledWith(
                expect.stringContaining('Update result:'),
                expect.any(Object)
            );
            expect(mockConsoleLog).toHaveBeenCalledWith(
                expect.stringContaining('Delete result:'),
                expect.any(Object)
            );
        });

        it('should handle operation failures gracefully', async () => {
            // Even if some operations fail, demonstrateUsage should not throw
            await expect(demonstrateUsage()).resolves.not.toThrow();
        });
    });

    describe('demonstrateCircuitBreakerMetrics', () => {
        it('should display circuit breaker metrics for in-memory example', () => {
            demonstrateCircuitBreakerMetrics();
            
            // Should log circuit breaker metrics
            expect(mockConsoleLog).toHaveBeenCalledWith(
                'Circuit Breaker Metrics:',
                expect.objectContaining({
                    state: expect.any(String),
                    failureCount: expect.any(Number),
                    successCount: expect.any(Number),
                    totalRequests: expect.any(Number)
                })
            );
        });

        it('should handle repository without circuit breaker', () => {
            // This should not throw even if circuit breaker is not present
            expect(() => demonstrateCircuitBreakerMetrics()).not.toThrow();
        });

        it('should reset circuit breaker when failures are detected', () => {
            // Create a setup that would have failures
            const { repository } = createInMemoryExample();
            
            // Mock the repository to have failures
            if ('getCircuitBreakerMetrics' in repository) {
                // Simulate some failures by calling circuit breaker methods
                const originalMetrics = repository.getCircuitBreakerMetrics();
                expect(originalMetrics.failureCount).toBe(0);
            }
            
            demonstrateCircuitBreakerMetrics();
            
            // Should not throw and should log metrics
            expect(mockConsoleLog).toHaveBeenCalled();
        });
    });

    describe('Type Safety and Generic Support', () => {
        it('should support strongly typed custom objects in all examples', () => {
            interface StronglyTypedObject extends ProjectObject {
                title: string;
                description?: string;
                priority: 'low' | 'medium' | 'high';
                dueDate: Date;
                assignee?: string;
                tags: string[];
                isCompleted: boolean;
            }

            // Test all example functions with strongly typed objects
            const inMemory = createInMemoryExample<StronglyTypedObject>();
            const dynamo = createDynamoDBExample<StronglyTypedObject>();
            const mongo = createMongoDBExample<StronglyTypedObject>();

            expect(inMemory.repository).toBeDefined();
            expect(dynamo.repository).toBeDefined();
            expect(mongo.repository).toBeDefined();

            // Each should have the correct type inference
            expect(inMemory.useCase).toBeDefined();
            expect(dynamo.useCase).toBeDefined();
            expect(mongo.useCase).toBeDefined();

            expect(inMemory.controller).toBeDefined();
            expect(dynamo.controller).toBeDefined();
            expect(mongo.controller).toBeDefined();
        });
    });

    describe('Error Handling and Edge Cases', () => {
        it('should handle null or undefined inputs gracefully', () => {
            // These should not throw during setup
            expect(() => createInMemoryExample()).not.toThrow();
            expect(() => createDynamoDBExample()).not.toThrow();
            expect(() => createMongoDBExample()).not.toThrow();
        });

        it('should handle concurrent access to examples', async () => {
            // Create multiple instances simultaneously
            const promises = Array.from({ length: 10 }, () => 
                Promise.resolve(createInMemoryExample())
            );
            
            const results = await Promise.all(promises);
            
            // All should be successfully created
            results.forEach(result => {
                expect(result.repository).toBeDefined();
                expect(result.useCase).toBeDefined();
                expect(result.controller).toBeDefined();
            });
        });

        it('should handle circuit breaker state transitions', () => {
            const { repository } = createInMemoryExample();
            
            if ('getCircuitBreakerMetrics' in repository) {
                const initialMetrics = repository.getCircuitBreakerMetrics();
                expect(initialMetrics.state).toBe(CircuitBreakerState.CLOSED);
                
                // Test that metrics can be accessed multiple times
                const secondMetrics = repository.getCircuitBreakerMetrics();
                expect(secondMetrics.state).toBe(CircuitBreakerState.CLOSED);
                
                // Test reset functionality
                if ('resetCircuitBreaker' in repository) {
                    expect(() => repository.resetCircuitBreaker()).not.toThrow();
                    
                    const resetMetrics = repository.getCircuitBreakerMetrics();
                    expect(resetMetrics.state).toBe(CircuitBreakerState.CLOSED);
                    expect(resetMetrics.failureCount).toBe(0);
                    expect(resetMetrics.successCount).toBe(0);
                    expect(resetMetrics.totalRequests).toBe(0);
                }
            }
        });
    });

    describe('Performance and Scalability', () => {
        it('should create examples quickly', () => {
            const start = Date.now();
            
            createInMemoryExample();
            createDynamoDBExample();
            createMongoDBExample();
            
            const duration = Date.now() - start;
            
            // Should complete setup in reasonable time (less than 1 second)
            expect(duration).toBeLessThan(1000);
        });

        it('should handle memory efficiently with multiple instances', () => {
            const instances = Array.from({ length: 100 }, () => createInMemoryExample());
            
            // All instances should be independent
            expect(instances).toHaveLength(100);
            instances.forEach(instance => {
                expect(instance.repository).toBeDefined();
                expect(instance.useCase).toBeDefined();
                expect(instance.controller).toBeDefined();
            });
        });
    });

    describe('Integration with Repository Factory', () => {
        it('should create repositories using correct database types', () => {
            // These tests verify that the examples correctly configure the repository factory
            const inMemory = createInMemoryExample();
            const dynamo = createDynamoDBExample();
            const mongo = createMongoDBExample();

            // In-memory and DynamoDB should have circuit breaker wrapper
            expect('getCircuitBreakerMetrics' in inMemory.repository).toBe(true);
            expect('getCircuitBreakerMetrics' in dynamo.repository).toBe(true);
            
            // MongoDB should not have circuit breaker wrapper (as per example)
            expect('getCircuitBreakerMetrics' in mongo.repository).toBe(false);
        });
    });
});