"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RepositoryFactory = exports.DatabaseType = void 0;
const DatabaseRepositoryAdapter_1 = require("./DatabaseRepositoryAdapter");
const CircuitBreakerRepositoryWrapper_1 = require("./CircuitBreakerRepositoryWrapper");
const InMemoryDatabaseService_1 = require("./InMemoryDatabaseService");
const DynamoDbDatabaseService_1 = require("./DynamoDbDatabaseService");
const MongoDbDatabaseService_1 = require("./MongoDbDatabaseService");
var DatabaseType;
(function (DatabaseType) {
    DatabaseType["IN_MEMORY"] = "IN_MEMORY";
    DatabaseType["DYNAMODB"] = "DYNAMODB";
    DatabaseType["MONGODB"] = "MONGODB";
})(DatabaseType || (exports.DatabaseType = DatabaseType = {}));
/**
 * Factory for creating repository instances with proper adapters and circuit breaker
 * This implements the Factory pattern combined with Adapter and Circuit Breaker patterns
 */
class RepositoryFactory {
    static create(config) {
        let repository;
        switch (config.type) {
            case DatabaseType.IN_MEMORY:
                const inMemoryService = new InMemoryDatabaseService_1.InMemoryDatabaseService();
                repository = new DatabaseRepositoryAdapter_1.DatabaseRepositoryAdapter(inMemoryService);
                break;
            case DatabaseType.DYNAMODB:
                const dynamoService = new DynamoDbDatabaseService_1.DynamoDbDatabaseService(config.tableName, config.region);
                repository = new DatabaseRepositoryAdapter_1.DatabaseRepositoryAdapter(dynamoService);
                break;
            case DatabaseType.MONGODB:
                const mongoService = new MongoDbDatabaseService_1.MongoDbDatabaseService(config.connectionString, config.databaseName, config.collectionName);
                repository = new DatabaseRepositoryAdapter_1.DatabaseRepositoryAdapter(mongoService);
                break;
            default:
                throw new Error(`Unsupported database type: ${config.type}`);
        }
        // Wrap with circuit breaker if configuration is provided
        if (config.circuitBreakerConfig) {
            repository = new CircuitBreakerRepositoryWrapper_1.CircuitBreakerRepositoryWrapper(repository, config.circuitBreakerConfig);
        }
        return repository;
    }
    static createWithCircuitBreaker(config, circuitBreakerConfig) {
        const baseRepository = this.create({ ...config, circuitBreakerConfig: undefined });
        return new CircuitBreakerRepositoryWrapper_1.CircuitBreakerRepositoryWrapper(baseRepository, circuitBreakerConfig);
    }
}
exports.RepositoryFactory = RepositoryFactory;
