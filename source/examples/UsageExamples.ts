import { 
    RepositoryFactory, 
    DatabaseType, 
    ProjectObject,
    ProjectObjectUseCase,
    ProjectObjectController,
    SearchLogicalOperator,
    SearchConditionOperator 
} from '../index';

/**
 * Example usage of the Clean Architecture implementation
 * This demonstrates how to set up and use the system with different adapters and patterns
 */

// Example 1: Basic usage with In-Memory database and Circuit Breaker
export function createInMemoryExample<T extends ProjectObject = ProjectObject>() {
    // Create repository with circuit breaker
    const repository = RepositoryFactory.createWithCircuitBreaker<T>({
        type: DatabaseType.IN_MEMORY
    }, {
        failureThreshold: 5,
        resetTimeout: 60000,  // 1 minute
        monitoringPeriod: 10000  // 10 seconds
    });

    // Create use case
    const useCase = new ProjectObjectUseCase(repository);

    // Create controller
    const controller = new ProjectObjectController(useCase);

    return { repository, useCase, controller };
}

// Example 2: DynamoDB with custom circuit breaker configuration
export function createDynamoDBExample<T extends ProjectObject = ProjectObject>() {
    const repository = RepositoryFactory.createWithCircuitBreaker<T>({
        type: DatabaseType.DYNAMODB,
        tableName: 'MyThothTable',
        region: 'us-west-2',
        circuitBreakerConfig: {
            failureThreshold: 3,
            resetTimeout: 30000,  // 30 seconds
            monitoringPeriod: 5000   // 5 seconds
        }
    });

    const useCase = new ProjectObjectUseCase(repository);
    const controller = new ProjectObjectController(useCase);

    return { repository, useCase, controller };
}

// Example 3: MongoDB without circuit breaker
export function createMongoDBExample<T extends ProjectObject = ProjectObject>() {
    const repository = RepositoryFactory.create<T>({
        type: DatabaseType.MONGODB,
        connectionString: 'mongodb://localhost:27017',
        databaseName: 'thoth_clean',
        collectionName: 'objects'
    });

    const useCase = new ProjectObjectUseCase(repository);
    const controller = new ProjectObjectController(useCase);

    return { repository, useCase, controller };
}

// Example usage function
export async function demonstrateUsage() {
    const { controller } = createInMemoryExample();

    // Create an object
    const testObject: ProjectObject = {
        projectId: 'demo-project',
        contentType: 'document',
        contentId: 'demo-doc-1',
        version: 1,
        title: 'Demo Document',
        content: 'This is a demonstration document'
    };

    // Create
    const createResult = await controller.create(testObject);
    console.log('Create result:', createResult);

    // Get by key
    const getResult = await controller.getByKey('demo-project', 'document', 'demo-doc-1', 1);
    console.log('Get result:', getResult);

    // Search
    const searchResult = await controller.search({
        logic: SearchLogicalOperator.AND,
        conditions: [
            { key: 'projectId', value: 'demo-project', operator: SearchConditionOperator.EQUALS }
        ]
    });
    console.log('Search result:', searchResult);

    // Update
    const updatedObject = { ...testObject, title: 'Updated Demo Document' };
    const updateResult = await controller.update(updatedObject);
    console.log('Update result:', updateResult);

    // Delete
    const deleteResult = await controller.delete('demo-project', 'document', 'demo-doc-1', 1);
    console.log('Delete result:', deleteResult);
}

// Example of accessing circuit breaker metrics
export function demonstrateCircuitBreakerMetrics() {
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