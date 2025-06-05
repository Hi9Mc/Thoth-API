import { RepositoryFactory, DatabaseType } from './RepositoryFactory';
import { ProjectObject } from '../../domain/entities/ProjectObject';
import { DatabaseRepositoryAdapter } from './DatabaseRepositoryAdapter';
import { CircuitBreakerRepositoryWrapper } from './CircuitBreakerRepositoryWrapper';

describe('RepositoryFactory', () => {
    describe('create', () => {
        it('should create in-memory repository', () => {
            const repository = RepositoryFactory.create({
                type: DatabaseType.IN_MEMORY
            });

            expect(repository).toBeInstanceOf(DatabaseRepositoryAdapter);
        });

        it('should create DynamoDB repository', () => {
            const repository = RepositoryFactory.create({
                type: DatabaseType.DYNAMODB,
                tableName: 'test-table',
                region: 'us-east-1'
            });

            expect(repository).toBeInstanceOf(DatabaseRepositoryAdapter);
        });

        it('should create MongoDB repository', () => {
            const repository = RepositoryFactory.create({
                type: DatabaseType.MONGODB,
                connectionString: 'mongodb://localhost:27017',
                databaseName: 'test',
                collectionName: 'objects'
            });

            expect(repository).toBeInstanceOf(DatabaseRepositoryAdapter);
        });

        it('should create repository with circuit breaker when config provided', () => {
            const repository = RepositoryFactory.create({
                type: DatabaseType.IN_MEMORY,
                circuitBreakerConfig: {
                    failureThreshold: 5,
                    resetTimeout: 60000,
                    monitoringPeriod: 10000
                }
            });

            expect(repository).toBeInstanceOf(CircuitBreakerRepositoryWrapper);
        });

        it('should throw error for unsupported database type', () => {
            expect(() => {
                RepositoryFactory.create({
                    type: 'UNSUPPORTED' as DatabaseType
                });
            }).toThrow('Unsupported database type: UNSUPPORTED');
        });
    });

    describe('createWithCircuitBreaker', () => {
        it('should always return CircuitBreakerRepositoryWrapper', () => {
            const repository = RepositoryFactory.createWithCircuitBreaker({
                type: DatabaseType.IN_MEMORY
            });

            expect(repository).toBeInstanceOf(CircuitBreakerRepositoryWrapper);
        });

        it('should use custom circuit breaker config', () => {
            const config = {
                failureThreshold: 10,
                resetTimeout: 30000,
                monitoringPeriod: 5000
            };

            const repository = RepositoryFactory.createWithCircuitBreaker({
                type: DatabaseType.IN_MEMORY
            }, config);

            expect(repository).toBeInstanceOf(CircuitBreakerRepositoryWrapper);
            // Check that circuit breaker is configured (metrics should be available)
            const metrics = repository.getCircuitBreakerMetrics();
            expect(metrics).toBeDefined();
        });
    });
});