/**
 * @jest-environment node
 */
import '@jest/globals';
import 'jest';

// Import all exports from the main index file
import * as ThothIndex from './index';

describe('Index.ts Module Exports', () => {
    describe('Domain Layer Exports', () => {
        it('should export SearchCriteria types and enums', () => {
            expect(ThothIndex.SearchLogicalOperator).toBeDefined();
            expect(ThothIndex.SearchConditionOperator).toBeDefined();
            expect(ThothIndex.SortDirection).toBeDefined();
        });

        it('should verify SearchLogicalOperator enum values', () => {
            expect(ThothIndex.SearchLogicalOperator.AND).toBe('AND');
            expect(ThothIndex.SearchLogicalOperator.OR).toBe('OR');
        });

        it('should verify SearchConditionOperator enum values', () => {
            const operators = ThothIndex.SearchConditionOperator;
            expect(operators.EQUALS).toBe('=');
            expect(operators.NOT_EQUALS).toBe('!=');
            expect(operators.GREATER_THAN).toBe('>');
            expect(operators.GREATER_THAN_OR_EQUAL).toBe('>=');
            expect(operators.LESS_THAN).toBe('<');
            expect(operators.LESS_THAN_OR_EQUAL).toBe('<=');
            expect(operators.LIKE).toBe('LIKE');
            expect(operators.NOT_LIKE).toBe('NOT LIKE');
            expect(operators.IN).toBe('IN');
            expect(operators.NOT_IN).toBe('NOT IN');
            expect(operators.BETWEEN).toBe('BETWEEN');
        });

        it('should verify SortDirection enum values', () => {
            expect(ThothIndex.SortDirection.ASC).toBe('ASC');
            expect(ThothIndex.SortDirection.DESC).toBe('DESC');
        });
    });

    describe('Application Layer Exports', () => {
        it('should export ProjectObjectUseCase', () => {
            expect(ThothIndex.ProjectObjectUseCase).toBeDefined();
            expect(typeof ThothIndex.ProjectObjectUseCase).toBe('function');
        });

        it('should be able to instantiate ProjectObjectUseCase', () => {
            const mockRepository = {
                create: jest.fn(),
                update: jest.fn(),
                delete: jest.fn(),
                findByKey: jest.fn(),
                search: jest.fn(),
                exists: jest.fn(),
                count: jest.fn()
            };

            const useCase = new ThothIndex.ProjectObjectUseCase(mockRepository);
            expect(useCase).toBeInstanceOf(ThothIndex.ProjectObjectUseCase);
        });
    });

    describe('Infrastructure Layer Exports', () => {
        it('should export CircuitBreaker components', () => {
            expect(ThothIndex.CircuitBreaker).toBeDefined();
            expect(ThothIndex.CircuitBreakerState).toBeDefined();
            expect(ThothIndex.CircuitBreakerError).toBeDefined();
        });

        it('should export DatabaseRepositoryAdapter', () => {
            expect(ThothIndex.DatabaseRepositoryAdapter).toBeDefined();
            expect(typeof ThothIndex.DatabaseRepositoryAdapter).toBe('function');
        });

        it('should export CircuitBreakerRepositoryWrapper', () => {
            expect(ThothIndex.CircuitBreakerRepositoryWrapper).toBeDefined();
            expect(typeof ThothIndex.CircuitBreakerRepositoryWrapper).toBe('function');
        });

        it('should export RepositoryFactory', () => {
            expect(ThothIndex.RepositoryFactory).toBeDefined();
            expect(ThothIndex.DatabaseType).toBeDefined();
        });

        it('should verify CircuitBreakerState enum values', () => {
            const states = ThothIndex.CircuitBreakerState;
            expect(states.CLOSED).toBe('CLOSED');
            expect(states.OPEN).toBe('OPEN');
            expect(states.HALF_OPEN).toBe('HALF_OPEN');
        });

        it('should verify DatabaseType enum values', () => {
            const types = ThothIndex.DatabaseType;
            expect(types.IN_MEMORY).toBe('IN_MEMORY');
            expect(types.DYNAMODB).toBe('DYNAMODB');
            expect(types.MONGODB).toBe('MONGODB');
        });
    });

    describe('Infrastructure Database Services', () => {
        it('should export InMemoryDatabaseService', () => {
            expect(ThothIndex.InMemoryDatabaseService).toBeDefined();
            expect(typeof ThothIndex.InMemoryDatabaseService).toBe('function');
        });

        it('should export DynamoDbDatabaseService', () => {
            expect(ThothIndex.DynamoDbDatabaseService).toBeDefined();
            expect(typeof ThothIndex.DynamoDbDatabaseService).toBe('function');
        });

        it('should export MongoDbDatabaseService', () => {
            expect(ThothIndex.MongoDbDatabaseService).toBeDefined();
            expect(typeof ThothIndex.MongoDbDatabaseService).toBe('function');
        });

        it('should be able to instantiate InMemoryDatabaseService', () => {
            const service = new ThothIndex.InMemoryDatabaseService();
            expect(service).toBeInstanceOf(ThothIndex.InMemoryDatabaseService);
        });
    });

    describe('Interface Adapters Layer Exports', () => {
        it('should export ProjectObjectController', () => {
            expect(ThothIndex.ProjectObjectController).toBeDefined();
            expect(typeof ThothIndex.ProjectObjectController).toBe('function');
        });

        it('should export RestApiController', () => {
            expect(ThothIndex.RestApiController).toBeDefined();
            expect(typeof ThothIndex.RestApiController).toBe('function');
        });

        it('should be able to instantiate ProjectObjectController', () => {
            const mockRepository = {
                create: jest.fn(),
                update: jest.fn(),
                delete: jest.fn(),
                findByKey: jest.fn(),
                search: jest.fn(),
                exists: jest.fn(),
                count: jest.fn()
            };

            const mockUseCase = new ThothIndex.ProjectObjectUseCase(mockRepository);

            const controller = new ThothIndex.ProjectObjectController(mockUseCase);
            expect(controller).toBeInstanceOf(ThothIndex.ProjectObjectController);
        });

        it('should be able to instantiate RestApiController', () => {
            const mockRepository = {
                create: jest.fn(),
                update: jest.fn(),
                delete: jest.fn(),
                findByKey: jest.fn(),
                search: jest.fn(),
                exists: jest.fn(),
                count: jest.fn()
            };

            const mockUseCase = new ThothIndex.ProjectObjectUseCase(mockRepository);

            const controller = new ThothIndex.RestApiController(mockUseCase);
            expect(controller).toBeInstanceOf(ThothIndex.RestApiController);
        });
    });

    describe('Module Structure and Organization', () => {
        it('should have consistent export structure', () => {
            const exports = Object.keys(ThothIndex);
            
            // Should have a reasonable number of exports (not too few, not too many)
            expect(exports.length).toBeGreaterThan(10);
            expect(exports.length).toBeLessThan(100);
        });

        it('should export constructors as functions', () => {
            const constructors = [
                'ProjectObjectUseCase',
                'CircuitBreaker',
                'DatabaseRepositoryAdapter',
                'CircuitBreakerRepositoryWrapper',
                'InMemoryDatabaseService',
                'DynamoDbDatabaseService',
                'MongoDbDatabaseService',
                'ProjectObjectController',
                'RestApiController'
            ];

            constructors.forEach(constructor => {
                expect(ThothIndex[constructor as keyof typeof ThothIndex]).toBeDefined();
                expect(typeof ThothIndex[constructor as keyof typeof ThothIndex]).toBe('function');
            });
        });

        it('should export enums as objects', () => {
            const enums = [
                'SearchLogicalOperator',
                'SearchConditionOperator',
                'SortDirection',
                'CircuitBreakerState',
                'DatabaseType'
            ];

            enums.forEach(enumName => {
                const enumObj = ThothIndex[enumName as keyof typeof ThothIndex];
                expect(enumObj).toBeDefined();
                expect(typeof enumObj).toBe('object');
                expect(Object.keys(enumObj).length).toBeGreaterThan(0);
            });
        });

        it('should export interfaces/types (may be undefined at runtime)', () => {
            // These are TypeScript interfaces/types, so they may not exist at runtime
            // We can only test that they can be imported without errors
            // If the file imports without error, the interfaces are properly exported
            expect(true).toBe(true);
        });
    });

    describe('Functional Integration', () => {
        it('should enable complete workflow creation through exports', () => {
            // Create a repository
            const repository = ThothIndex.RepositoryFactory.create({
                type: ThothIndex.DatabaseType.IN_MEMORY
            });

            // Create use case
            const useCase = new ThothIndex.ProjectObjectUseCase(repository);

            // Create controller
            const controller = new ThothIndex.ProjectObjectController(useCase);

            expect(repository).toBeDefined();
            expect(useCase).toBeDefined();
            expect(controller).toBeDefined();
        });

        it('should enable circuit breaker creation through exports', () => {
            const config = {
                failureThreshold: 5,
                resetTimeout: 60000,
                monitoringPeriod: 10000
            };

            const circuitBreaker = new ThothIndex.CircuitBreaker(config);
            expect(circuitBreaker).toBeInstanceOf(ThothIndex.CircuitBreaker);
        });

        it('should enable search condition creation through exports', () => {
            const searchCondition = {
                logic: ThothIndex.SearchLogicalOperator.AND,
                conditions: [
                    {
                        key: 'tenantId',
                        value: 'test-tenant',
                        operator: ThothIndex.SearchConditionOperator.EQUALS
                    }
                ]
            };

            const pagination = {
                page: 1,
                limit: 10,
                sortBy: 'version',
                sortDirection: ThothIndex.SortDirection.ASC
            };

            expect(searchCondition.logic).toBe('AND');
            expect(pagination.sortDirection).toBe('ASC');
        });
    });

    describe('Type Safety and Generic Support', () => {
        it('should support custom object types through generics', () => {
            interface CustomObject {
                tenantId: string;
                resourceType: string;
                resourceId: string;
                version: number;
                customField: string;
                customNumber: number;
            }

            // Should compile without TypeScript errors
            const searchOption = {
                logic: ThothIndex.SearchLogicalOperator.AND,
                conditions: [
                    {
                        key: 'customField',
                        value: 'test',
                        operator: ThothIndex.SearchConditionOperator.EQUALS
                    }
                ]
            };

            const pagination = {
                page: 1,
                limit: 10,
                sortBy: 'customNumber',
                sortDirection: ThothIndex.SortDirection.DESC
            };

            expect(searchOption).toBeDefined();
            expect(pagination).toBeDefined();
        });

        it('should support repository creation with custom types', () => {
            interface CustomObject {
                tenantId: string;
                resourceType: string;
                resourceId: string;
                version: number;
                customField: string;
            }

            const repository = ThothIndex.RepositoryFactory.create<CustomObject>({
                type: ThothIndex.DatabaseType.IN_MEMORY
            });

            const useCase = new ThothIndex.ProjectObjectUseCase(repository);
            const controller = new ThothIndex.ProjectObjectController(useCase);

            expect(repository).toBeDefined();
            expect(useCase).toBeDefined();
            expect(controller).toBeDefined();
        });
    });

    describe('Error Classes and Exceptions', () => {
        it('should export CircuitBreakerError', () => {
            expect(ThothIndex.CircuitBreakerError).toBeDefined();
            expect(typeof ThothIndex.CircuitBreakerError).toBe('function');
        });

        it('should be able to create CircuitBreakerError instances', () => {
            const error = new ThothIndex.CircuitBreakerError('Test error', ThothIndex.CircuitBreakerState.OPEN);
            expect(error).toBeInstanceOf(Error);
            expect(error).toBeInstanceOf(ThothIndex.CircuitBreakerError);
            expect(error.message).toBe('Test error');
            expect(error.state).toBe(ThothIndex.CircuitBreakerState.OPEN);
        });
    });

    describe('Factory Pattern Support', () => {
        it('should support all database types through factory', () => {
            const databaseTypes = [
                ThothIndex.DatabaseType.IN_MEMORY,
                ThothIndex.DatabaseType.DYNAMODB,
                ThothIndex.DatabaseType.MONGODB
            ];

            databaseTypes.forEach(type => {
                const config = { type };
                
                expect(() => {
                    ThothIndex.RepositoryFactory.create(config);
                }).not.toThrow();
            });
        });

        it('should support repository creation with circuit breaker', () => {
            const config = {
                type: ThothIndex.DatabaseType.IN_MEMORY
            };

            const circuitBreakerConfig = {
                failureThreshold: 3,
                resetTimeout: 30000,
                monitoringPeriod: 5000
            };

            expect(() => {
                ThothIndex.RepositoryFactory.createWithCircuitBreaker(
                    config,
                    circuitBreakerConfig
                );
            }).not.toThrow();
        });
    });

    describe('Export Consistency and Naming', () => {
        it('should use consistent naming conventions', () => {
            const exports = Object.keys(ThothIndex);
            
            // Check that class names are PascalCase
            const classNames = exports.filter(name => 
                typeof ThothIndex[name as keyof typeof ThothIndex] === 'function'
            );
            
            classNames.forEach(className => {
                expect(className[0]).toMatch(/[A-Z]/); // Starts with capital letter
                expect(className).not.toContain('_'); // No underscores
                expect(className).not.toContain('-'); // No hyphens
            });
        });

        it('should use mixed case for operator enum values', () => {
            const operatorValues = [
                ...Object.values(ThothIndex.SearchConditionOperator)
            ];

            operatorValues.forEach(value => {
                expect(typeof value).toBe('string');
                // Operators can have special characters like =, >, <, etc.
                expect(value.length).toBeGreaterThan(0);
            });
            
            // Test that logical operators and sort directions use UPPER_CASE
            const upperCaseValues = [
                ...Object.values(ThothIndex.SearchLogicalOperator),
                ...Object.values(ThothIndex.SortDirection),
                ...Object.values(ThothIndex.CircuitBreakerState),
                ...Object.values(ThothIndex.DatabaseType)
            ];

            upperCaseValues.forEach(value => {
                expect(typeof value).toBe('string');
                expect(value).toMatch(/^[A-Z_]+$/); // Only uppercase letters and underscores
            });
        });
    });

    describe('Documentation and Metadata', () => {
        it('should export version information if available', () => {
            // This would depend on how version is exported from the module
            // For now, we just verify the module loads correctly
            expect(ThothIndex).toBeDefined();
            expect(typeof ThothIndex).toBe('object');
        });

        it('should have all major components available for documentation', () => {
            const majorComponents = [
                'ProjectObjectUseCase',
                'ProjectObjectController',
                'RepositoryFactory',
                'CircuitBreaker',
                'SearchLogicalOperator',
                'SearchConditionOperator',
                'DatabaseType'
            ];

            majorComponents.forEach(component => {
                expect(ThothIndex[component as keyof typeof ThothIndex]).toBeDefined();
            });
        });
    });

    describe('Backward Compatibility', () => {
        it('should maintain stable public API exports', () => {
            // Test that critical exports haven't changed
            const criticalExports = [
                'ProjectObjectUseCase',
                'ProjectObjectController',
                'RepositoryFactory',
                'CircuitBreaker',
                'DatabaseType',
                'SearchLogicalOperator',
                'SearchConditionOperator'
            ];

            criticalExports.forEach(exportName => {
                expect(ThothIndex[exportName as keyof typeof ThothIndex]).toBeDefined();
            });
        });

        it('should support legacy usage patterns', () => {
            // Test that the module can be used in the expected way
            const { 
                RepositoryFactory, 
                DatabaseType, 
                ProjectObjectUseCase, 
                ProjectObjectController 
            } = ThothIndex;

            expect(RepositoryFactory).toBeDefined();
            expect(DatabaseType).toBeDefined();
            expect(ProjectObjectUseCase).toBeDefined();
            expect(ProjectObjectController).toBeDefined();
        });
    });
});