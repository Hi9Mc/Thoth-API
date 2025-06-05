import { ProjectObject } from '../../domain/entities/ProjectObject';
import { ProjectObjectRepository } from '../../domain/repositories/ProjectObjectRepository';
import { DatabaseRepositoryAdapter } from './DatabaseRepositoryAdapter';
import { CircuitBreakerRepositoryWrapper } from './CircuitBreakerRepositoryWrapper';
import { CircuitBreakerConfig } from '../circuit-breaker/CircuitBreaker';
import { InMemoryDatabaseService } from './InMemoryDatabaseService';
import { DynamoDbDatabaseService } from './DynamoDbDatabaseService';
import { MongoDbDatabaseService } from './MongoDbDatabaseService';

export enum DatabaseType {
    IN_MEMORY = 'IN_MEMORY',
    DYNAMODB = 'DYNAMODB',
    MONGODB = 'MONGODB'
}

export interface RepositoryConfig {
    type: DatabaseType;
    circuitBreakerConfig?: CircuitBreakerConfig;
    tableName?: string;
    region?: string;
    connectionString?: string;
    databaseName?: string;
    collectionName?: string;
}

/**
 * Factory for creating repository instances with proper adapters and circuit breaker
 * This implements the Factory pattern combined with Adapter and Circuit Breaker patterns
 */
export class RepositoryFactory {
    static create<T extends ProjectObject = ProjectObject>(config: RepositoryConfig): ProjectObjectRepository<T> {
        let repository: ProjectObjectRepository<T>;

        switch (config.type) {
            case DatabaseType.IN_MEMORY:
                const inMemoryService = new InMemoryDatabaseService<T>();
                repository = new DatabaseRepositoryAdapter(inMemoryService);
                break;

            case DatabaseType.DYNAMODB:
                const dynamoService = new DynamoDbDatabaseService<T>(config.tableName, config.region);
                repository = new DatabaseRepositoryAdapter(dynamoService);
                break;

            case DatabaseType.MONGODB:
                const mongoService = new MongoDbDatabaseService<T>(
                    config.connectionString, 
                    config.databaseName, 
                    config.collectionName
                );
                repository = new DatabaseRepositoryAdapter(mongoService);
                break;

            default:
                throw new Error(`Unsupported database type: ${config.type}`);
        }

        // Wrap with circuit breaker if configuration is provided
        if (config.circuitBreakerConfig) {
            repository = new CircuitBreakerRepositoryWrapper(repository, config.circuitBreakerConfig);
        }

        return repository;
    }

    static createWithCircuitBreaker<T extends ProjectObject = ProjectObject>(
        config: RepositoryConfig,
        circuitBreakerConfig?: CircuitBreakerConfig
    ): CircuitBreakerRepositoryWrapper<T> {
        const baseRepository = this.create<T>({ ...config, circuitBreakerConfig: undefined });
        return new CircuitBreakerRepositoryWrapper(baseRepository, circuitBreakerConfig);
    }
}