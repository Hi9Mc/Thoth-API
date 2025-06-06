"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createInMemoryExample = createInMemoryExample;
exports.createDynamoDBExample = createDynamoDBExample;
exports.createMongoDBExample = createMongoDBExample;
exports.demonstrateUsage = demonstrateUsage;
exports.demonstrateCircuitBreakerMetrics = demonstrateCircuitBreakerMetrics;
const index_1 = require("../index");
/**
 * Example usage of the Clean Architecture implementation
 * This demonstrates how to set up and use the system with different adapters and patterns
 */
// Example 1: Basic usage with In-Memory database and Circuit Breaker
function createInMemoryExample() {
    // Create repository with circuit breaker
    const repository = index_1.RepositoryFactory.createWithCircuitBreaker({
        type: index_1.DatabaseType.IN_MEMORY
    }, {
        failureThreshold: 5,
        resetTimeout: 60000, // 1 minute
        monitoringPeriod: 10000 // 10 seconds
    });
    // Create use case
    const useCase = new index_1.ProjectObjectUseCase(repository);
    // Create controller
    const controller = new index_1.ProjectObjectController(useCase);
    return { repository, useCase, controller };
}
// Example 2: DynamoDB with custom circuit breaker configuration
function createDynamoDBExample() {
    const repository = index_1.RepositoryFactory.createWithCircuitBreaker({
        type: index_1.DatabaseType.DYNAMODB,
        tableName: 'MyThothTable',
        region: 'us-west-2',
        circuitBreakerConfig: {
            failureThreshold: 3,
            resetTimeout: 30000, // 30 seconds
            monitoringPeriod: 5000 // 5 seconds
        }
    });
    const useCase = new index_1.ProjectObjectUseCase(repository);
    const controller = new index_1.ProjectObjectController(useCase);
    return { repository, useCase, controller };
}
// Example 3: MongoDB without circuit breaker
function createMongoDBExample() {
    const repository = index_1.RepositoryFactory.create({
        type: index_1.DatabaseType.MONGODB,
        connectionString: 'mongodb://localhost:27017',
        databaseName: 'thoth_clean',
        collectionName: 'objects'
    });
    const useCase = new index_1.ProjectObjectUseCase(repository);
    const controller = new index_1.ProjectObjectController(useCase);
    return { repository, useCase, controller };
}
// Example usage function
async function demonstrateUsage() {
    const { controller } = createInMemoryExample();
    // Create an object
    const testObject = {
        tenantId: 'demo-project',
        resourceType: 'document',
        resourceId: 'demo-doc-1',
        version: 1,
        title: 'Demo Document',
        content: 'This is a demonstration document'
    };
    // Create
    const createResult = await controller.create(testObject);
    console.log('Create result:', createResult);
    // Get by key
    const getResult = await controller.getByKey('demo-project', 'document', 'demo-doc-1');
    console.log('Get result:', getResult);
    // Search
    const searchResult = await controller.search({
        logic: index_1.SearchLogicalOperator.AND,
        conditions: [
            { key: 'tenantId', value: 'demo-project', operator: index_1.SearchConditionOperator.EQUALS }
        ]
    });
    console.log('Search result:', searchResult);
    // Update
    const updatedObject = { ...testObject, title: 'Updated Demo Document' };
    const updateResult = await controller.update(updatedObject);
    console.log('Update result:', updateResult);
    // Delete
    const deleteResult = await controller.delete('demo-project', 'document', 'demo-doc-1');
    console.log('Delete result:', deleteResult);
}
// Example of accessing circuit breaker metrics
function demonstrateCircuitBreakerMetrics() {
    const { repository } = createInMemoryExample();
    // Check if repository has circuit breaker wrapper
    if ('getCircuitBreakerMetrics' in repository) {
        const metrics = repository.getCircuitBreakerMetrics();
        console.log('Circuit Breaker Metrics:', metrics);
        // Reset circuit breaker if needed
        if (metrics.failureCount > 0) {
            repository.resetCircuitBreaker();
            console.log('Circuit breaker reset');
        }
    }
}
