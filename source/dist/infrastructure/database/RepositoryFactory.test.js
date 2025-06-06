"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const RepositoryFactory_1 = require("./RepositoryFactory");
const DatabaseRepositoryAdapter_1 = require("./DatabaseRepositoryAdapter");
const CircuitBreakerRepositoryWrapper_1 = require("./CircuitBreakerRepositoryWrapper");
describe('RepositoryFactory', () => {
    describe('create', () => {
        it('should create in-memory repository', () => {
            const repository = RepositoryFactory_1.RepositoryFactory.create({
                type: RepositoryFactory_1.DatabaseType.IN_MEMORY
            });
            expect(repository).toBeInstanceOf(DatabaseRepositoryAdapter_1.DatabaseRepositoryAdapter);
        });
        it('should create DynamoDB repository', () => {
            const repository = RepositoryFactory_1.RepositoryFactory.create({
                type: RepositoryFactory_1.DatabaseType.DYNAMODB,
                tableName: 'test-table',
                region: 'us-east-1'
            });
            expect(repository).toBeInstanceOf(DatabaseRepositoryAdapter_1.DatabaseRepositoryAdapter);
        });
        it('should create MongoDB repository', () => {
            const repository = RepositoryFactory_1.RepositoryFactory.create({
                type: RepositoryFactory_1.DatabaseType.MONGODB,
                connectionString: 'mongodb://localhost:27017',
                databaseName: 'test',
                collectionName: 'objects'
            });
            expect(repository).toBeInstanceOf(DatabaseRepositoryAdapter_1.DatabaseRepositoryAdapter);
        });
        it('should create repository with circuit breaker when config provided', () => {
            const repository = RepositoryFactory_1.RepositoryFactory.create({
                type: RepositoryFactory_1.DatabaseType.IN_MEMORY,
                circuitBreakerConfig: {
                    failureThreshold: 5,
                    resetTimeout: 60000,
                    monitoringPeriod: 10000
                }
            });
            expect(repository).toBeInstanceOf(CircuitBreakerRepositoryWrapper_1.CircuitBreakerRepositoryWrapper);
        });
        it('should throw error for unsupported database type', () => {
            expect(() => {
                RepositoryFactory_1.RepositoryFactory.create({
                    type: 'UNSUPPORTED'
                });
            }).toThrow('Unsupported database type: UNSUPPORTED');
        });
    });
    describe('createWithCircuitBreaker', () => {
        it('should always return CircuitBreakerRepositoryWrapper', () => {
            const repository = RepositoryFactory_1.RepositoryFactory.createWithCircuitBreaker({
                type: RepositoryFactory_1.DatabaseType.IN_MEMORY
            });
            expect(repository).toBeInstanceOf(CircuitBreakerRepositoryWrapper_1.CircuitBreakerRepositoryWrapper);
        });
        it('should use custom circuit breaker config', () => {
            const config = {
                failureThreshold: 10,
                resetTimeout: 30000,
                monitoringPeriod: 5000
            };
            const repository = RepositoryFactory_1.RepositoryFactory.createWithCircuitBreaker({
                type: RepositoryFactory_1.DatabaseType.IN_MEMORY
            }, config);
            expect(repository).toBeInstanceOf(CircuitBreakerRepositoryWrapper_1.CircuitBreakerRepositoryWrapper);
            // Check that circuit breaker is configured (metrics should be available)
            const metrics = repository.getCircuitBreakerMetrics();
            expect(metrics).toBeDefined();
        });
    });
});
