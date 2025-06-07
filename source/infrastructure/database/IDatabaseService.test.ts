/**
 * @jest-environment node
 */
import '@jest/globals';
import 'jest';
import { 
    IDatabaseService, 
    ProjectObject, 
    SearchConditionOperator, 
    SearchLogicalOperator, 
    SortDirection,
    SearchOption,
    PaginationOption,
    IDatabaseServiceConstructor
} from './IDatabaseService';

describe('IDatabaseService Interface', () => {
    describe('SearchConditionOperator Enum', () => {
        it('should have all required comparison operators', () => {
            expect(SearchConditionOperator.EQUALS).toBe('=');
            expect(SearchConditionOperator.NOT_EQUALS).toBe('!=');
            expect(SearchConditionOperator.GREATER_THAN).toBe('>');
            expect(SearchConditionOperator.GREATER_THAN_OR_EQUAL).toBe('>=');
            expect(SearchConditionOperator.LESS_THAN).toBe('<');
            expect(SearchConditionOperator.LESS_THAN_OR_EQUAL).toBe('<=');
        });

        it('should have pattern matching operators', () => {
            expect(SearchConditionOperator.LIKE).toBe('LIKE');
            expect(SearchConditionOperator.NOT_LIKE).toBe('NOT LIKE');
        });

        it('should have set operators', () => {
            expect(SearchConditionOperator.IN).toBe('IN');
            expect(SearchConditionOperator.NOT_IN).toBe('NOT IN');
        });

        it('should have range operators', () => {
            expect(SearchConditionOperator.BETWEEN).toBe('BETWEEN');
        });

        it('should have all operators as string values', () => {
            Object.values(SearchConditionOperator).forEach(operator => {
                expect(typeof operator).toBe('string');
                expect(operator.length).toBeGreaterThan(0);
            });
        });
    });

    describe('SearchLogicalOperator Enum', () => {
        it('should have logical operators', () => {
            expect(SearchLogicalOperator.AND).toBe('AND');
            expect(SearchLogicalOperator.OR).toBe('OR');
        });

        it('should have all operators as string values', () => {
            Object.values(SearchLogicalOperator).forEach(operator => {
                expect(typeof operator).toBe('string');
                expect(operator.length).toBeGreaterThan(0);
            });
        });
    });

    describe('SortDirection Enum', () => {
        it('should have sorting directions', () => {
            expect(SortDirection.ASC).toBe('ASC');
            expect(SortDirection.DESC).toBe('DESC');
        });

        it('should have all directions as string values', () => {
            Object.values(SortDirection).forEach(direction => {
                expect(typeof direction).toBe('string');
                expect(direction.length).toBeGreaterThan(0);
            });
        });
    });

    describe('ProjectObject Interface', () => {
        it('should enforce required properties', () => {
            const projectObject: ProjectObject = {
                tenantId: 'test-tenant',
                resourceType: 'document',
                resourceId: 'doc-123',
                version: 1
            };

            expect(projectObject.tenantId).toBe('test-tenant');
            expect(projectObject.resourceType).toBe('document');
            expect(projectObject.resourceId).toBe('doc-123');
            expect(projectObject.version).toBe(1);
        });

        it('should allow additional properties through index signature', () => {
            const projectObject: ProjectObject = {
                tenantId: 'test-tenant',
                resourceType: 'document',
                resourceId: 'doc-123',
                version: 1,
                title: 'Test Document',
                content: 'Test content',
                metadata: {
                    createdAt: '2023-01-01',
                    tags: ['test', 'example']
                }
            };

            expect(projectObject.title).toBe('Test Document');
            expect(projectObject.content).toBe('Test content');
            expect(projectObject.metadata).toEqual({
                createdAt: '2023-01-01',
                tags: ['test', 'example']
            });
        });

        it('should handle different data types in additional properties', () => {
            const projectObject: ProjectObject = {
                tenantId: 'test-tenant',
                resourceType: 'document',
                resourceId: 'doc-123',
                version: 1,
                stringProperty: 'string value',
                numberProperty: 42,
                booleanProperty: true,
                arrayProperty: ['item1', 'item2'],
                objectProperty: { nested: 'value' },
                nullProperty: null,
                undefinedProperty: undefined
            };

            expect(typeof projectObject.stringProperty).toBe('string');
            expect(typeof projectObject.numberProperty).toBe('number');
            expect(typeof projectObject.booleanProperty).toBe('boolean');
            expect(Array.isArray(projectObject.arrayProperty)).toBe(true);
            expect(typeof projectObject.objectProperty).toBe('object');
            expect(projectObject.nullProperty).toBeNull();
            expect(projectObject.undefinedProperty).toBeUndefined();
        });
    });

    describe('SearchParameter Interface', () => {
        interface TestObject {
            id: string;
            name: string;
            age: number;
            active: boolean;
            tags: string[];
        }

        it('should support string key references', () => {
            const parameter = {
                key: 'name' as keyof TestObject,
                value: 'John',
                operator: SearchConditionOperator.EQUALS
            };

            expect(parameter.key).toBe('name');
            expect(parameter.value).toBe('John');
            expect(parameter.operator).toBe(SearchConditionOperator.EQUALS);
        });

        it('should support number values', () => {
            const parameter = {
                key: 'age' as keyof TestObject,
                value: 25,
                operator: SearchConditionOperator.GREATER_THAN
            };

            expect(parameter.key).toBe('age');
            expect(parameter.value).toBe(25);
            expect(parameter.operator).toBe(SearchConditionOperator.GREATER_THAN);
        });

        it('should support boolean values', () => {
            const parameter = {
                key: 'active' as keyof TestObject,
                value: true,
                operator: SearchConditionOperator.EQUALS
            };

            expect(parameter.key).toBe('active');
            expect(parameter.value).toBe(true);
            expect(parameter.operator).toBe(SearchConditionOperator.EQUALS);
        });

        it('should support array values', () => {
            const parameter = {
                key: 'age' as keyof TestObject,
                value: [18, 25, 30],
                operator: SearchConditionOperator.IN
            };

            expect(parameter.key).toBe('age');
            expect(Array.isArray(parameter.value)).toBe(true);
            expect(parameter.value).toEqual([18, 25, 30]);
            expect(parameter.operator).toBe(SearchConditionOperator.IN);
        });

        it('should support mixed array values', () => {
            const parameter = {
                key: 'tags' as keyof TestObject,
                value: ['tag1', 'tag2'],
                operator: SearchConditionOperator.IN
            };

            expect(parameter.key).toBe('tags');
            expect(Array.isArray(parameter.value)).toBe(true);
            expect(parameter.value).toEqual(['tag1', 'tag2']);
            expect(parameter.operator).toBe(SearchConditionOperator.IN);
        });
    });

    describe('SearchOption Interface', () => {
        interface TestObject {
            id: string;
            name: string;
            age: number;
            active: boolean;
        }

        it('should support simple parameter conditions', () => {
            const searchOption: SearchOption<TestObject> = {
                logic: SearchLogicalOperator.AND,
                conditions: [
                    {
                        key: 'name',
                        value: 'John',
                        operator: SearchConditionOperator.EQUALS
                    },
                    {
                        key: 'age',
                        value: 25,
                        operator: SearchConditionOperator.GREATER_THAN
                    }
                ]
            };

            expect(searchOption.logic).toBe(SearchLogicalOperator.AND);
            expect(searchOption.conditions).toHaveLength(2);
            expect(searchOption.conditions[0]).toHaveProperty('key', 'name');
            expect(searchOption.conditions[1]).toHaveProperty('key', 'age');
        });

        it('should support nested SearchOption conditions', () => {
            const nestedOption: SearchOption<TestObject> = {
                logic: SearchLogicalOperator.OR,
                conditions: [
                    {
                        key: 'name',
                        value: 'John',
                        operator: SearchConditionOperator.EQUALS
                    },
                    {
                        logic: SearchLogicalOperator.AND,
                        conditions: [
                            {
                                key: 'age',
                                value: 18,
                                operator: SearchConditionOperator.GREATER_THAN_OR_EQUAL
                            },
                            {
                                key: 'active',
                                value: true,
                                operator: SearchConditionOperator.EQUALS
                            }
                        ]
                    }
                ]
            };

            expect(nestedOption.logic).toBe(SearchLogicalOperator.OR);
            expect(nestedOption.conditions).toHaveLength(2);
            
            const nestedCondition = nestedOption.conditions[1] as SearchOption<TestObject>;
            expect(nestedCondition.logic).toBe(SearchLogicalOperator.AND);
            expect(nestedCondition.conditions).toHaveLength(2);
        });

        it('should support complex nested structures', () => {
            const complexOption: SearchOption<TestObject> = {
                logic: SearchLogicalOperator.AND,
                conditions: [
                    {
                        key: 'active',
                        value: true,
                        operator: SearchConditionOperator.EQUALS
                    },
                    {
                        logic: SearchLogicalOperator.OR,
                        conditions: [
                            {
                                key: 'age',
                                value: [18, 25, 30],
                                operator: SearchConditionOperator.IN
                            },
                            {
                                logic: SearchLogicalOperator.AND,
                                conditions: [
                                    {
                                        key: 'name',
                                        value: 'Admin%',
                                        operator: SearchConditionOperator.LIKE
                                    },
                                    {
                                        key: 'age',
                                        value: 21,
                                        operator: SearchConditionOperator.GREATER_THAN_OR_EQUAL
                                    }
                                ]
                            }
                        ]
                    }
                ]
            };

            expect(complexOption.logic).toBe(SearchLogicalOperator.AND);
            expect(complexOption.conditions).toHaveLength(2);
            
            const orCondition = complexOption.conditions[1] as SearchOption<TestObject>;
            expect(orCondition.logic).toBe(SearchLogicalOperator.OR);
            expect(orCondition.conditions).toHaveLength(2);
            
            const nestedAndCondition = orCondition.conditions[1] as SearchOption<TestObject>;
            expect(nestedAndCondition.logic).toBe(SearchLogicalOperator.AND);
            expect(nestedAndCondition.conditions).toHaveLength(2);
        });
    });

    describe('PaginationOption Interface', () => {
        interface TestObject {
            id: string;
            name: string;
            age: number;
            createdAt: Date;
        }

        it('should support basic pagination', () => {
            const pagination: PaginationOption<TestObject> = {
                page: 1,
                limit: 10
            };

            expect(pagination.page).toBe(1);
            expect(pagination.limit).toBe(10);
        });

        it('should support sorting options', () => {
            const pagination: PaginationOption<TestObject> = {
                page: 2,
                limit: 20,
                sortBy: 'name',
                sortDirection: SortDirection.ASC
            };

            expect(pagination.page).toBe(2);
            expect(pagination.limit).toBe(20);
            expect(pagination.sortBy).toBe('name');
            expect(pagination.sortDirection).toBe(SortDirection.ASC);
        });

        it('should allow optional properties', () => {
            const pagination1: PaginationOption<TestObject> = {};
            const pagination2: PaginationOption<TestObject> = { page: 1 };
            const pagination3: PaginationOption<TestObject> = { limit: 50 };
            const pagination4: PaginationOption<TestObject> = { sortBy: 'age' };
            const pagination5: PaginationOption<TestObject> = { sortDirection: SortDirection.DESC };

            expect(pagination1).toEqual({});
            expect(pagination2.page).toBe(1);
            expect(pagination3.limit).toBe(50);
            expect(pagination4.sortBy).toBe('age');
            expect(pagination5.sortDirection).toBe(SortDirection.DESC);
        });

        it('should support type-safe sortBy field', () => {
            // This test ensures that sortBy is constrained to keys of T
            const pagination: PaginationOption<TestObject> = {
                sortBy: 'name', // Valid key
                sortDirection: SortDirection.DESC
            };

            expect(pagination.sortBy).toBe('name');
            
            // These would cause TypeScript compilation errors:
            // sortBy: 'nonExistentField' // Error: not a key of TestObject
            // sortBy: 123 // Error: not a string key
        });
    });

    describe('IDatabaseService Interface', () => {
        // Mock implementation for testing interface compliance
        class MockDatabaseService implements IDatabaseService<ProjectObject> {
            async create(obj: ProjectObject): Promise<ProjectObject> {
                return Promise.resolve(obj);
            }

            async update(obj: ProjectObject): Promise<ProjectObject> {
                return Promise.resolve(obj);
            }

            async delete(tenantId: string, resourceType: string, resourceId: string): Promise<boolean> {
                return Promise.resolve(true);
            }

            async getByKey(tenantId: string, resourceType: string, resourceId: string): Promise<ProjectObject | null> {
                return Promise.resolve(null);
            }

            async search(condition: SearchOption<ProjectObject>, pagination: PaginationOption<ProjectObject>): Promise<{ results: ProjectObject[], total: number }> {
                return Promise.resolve({ results: [], total: 0 });
            }

            async exists(condition: SearchOption<ProjectObject>): Promise<boolean> {
                return Promise.resolve(false);
            }

            async count(condition: SearchOption<ProjectObject>): Promise<number> {
                return Promise.resolve(0);
            }
        }

        let service: IDatabaseService<ProjectObject>;

        beforeEach(() => {
            service = new MockDatabaseService();
        });

        it('should have create method with correct signature', async () => {
            const testObj: ProjectObject = {
                tenantId: 'test',
                resourceType: 'doc',
                resourceId: 'id',
                version: 1
            };

            const result = await service.create(testObj);
            expect(result).toEqual(testObj);
        });

        it('should have update method with correct signature', async () => {
            const testObj: ProjectObject = {
                tenantId: 'test',
                resourceType: 'doc',
                resourceId: 'id',
                version: 2
            };

            const result = await service.update(testObj);
            expect(result).toEqual(testObj);
        });

        it('should have delete method with correct signature', async () => {
            const result = await service.delete('tenant', 'type', 'id');
            expect(typeof result).toBe('boolean');
        });

        it('should have getByKey method with correct signature', async () => {
            const result = await service.getByKey('tenant', 'type', 'id');
            expect(result).toBeNull();
        });

        it('should have search method with correct signature', async () => {
            const condition: SearchOption<ProjectObject> = {
                logic: SearchLogicalOperator.AND,
                conditions: []
            };
            const pagination: PaginationOption<ProjectObject> = { page: 1, limit: 10 };

            const result = await service.search(condition, pagination);
            
            expect(result).toHaveProperty('results');
            expect(result).toHaveProperty('total');
            expect(Array.isArray(result.results)).toBe(true);
            expect(typeof result.total).toBe('number');
        });

        it('should have exists method with correct signature', async () => {
            const condition: SearchOption<ProjectObject> = {
                logic: SearchLogicalOperator.AND,
                conditions: []
            };

            const result = await service.exists(condition);
            expect(typeof result).toBe('boolean');
        });

        it('should have count method with correct signature', async () => {
            const condition: SearchOption<ProjectObject> = {
                logic: SearchLogicalOperator.AND,
                conditions: []
            };

            const result = await service.count(condition);
            expect(typeof result).toBe('number');
        });
    });

    describe('IDatabaseServiceConstructor Interface', () => {
        // Mock constructor implementation for testing
        class MockDatabaseServiceConstructor {
            private static instance: IDatabaseService<ProjectObject>;
            private static instances: Map<string, IDatabaseService<ProjectObject>> = new Map();

            constructor() {
                // Constructor implementation
            }

            static getInstance(): IDatabaseService<ProjectObject> {
                if (!this.instance) {
                    this.instance = new MockDatabaseService();
                }
                return this.instance;
            }

            static getInstanceByTenantId(tenantId: string): IDatabaseService<ProjectObject> {
                if (!this.instances.has(tenantId)) {
                    this.instances.set(tenantId, new MockDatabaseService());
                }
                return this.instances.get(tenantId)!;
            }
        }

        // Mock service for constructor testing
        class MockDatabaseService implements IDatabaseService<ProjectObject> {
            async create(obj: ProjectObject): Promise<ProjectObject> {
                return obj;
            }
            async update(obj: ProjectObject): Promise<ProjectObject> {
                return obj;
            }
            async delete(tenantId: string, resourceType: string, resourceId: string): Promise<boolean> {
                return true;
            }
            async getByKey(tenantId: string, resourceType: string, resourceId: string): Promise<ProjectObject | null> {
                return null;
            }
            async search(condition: SearchOption<ProjectObject>, pagination: PaginationOption<ProjectObject>): Promise<{ results: ProjectObject[], total: number }> {
                return { results: [], total: 0 };
            }
            async exists(condition: SearchOption<ProjectObject>): Promise<boolean> {
                return false;
            }
            async count(condition: SearchOption<ProjectObject>): Promise<number> {
                return 0;
            }
        }

        it('should support constructor creation', () => {
            const instance = new MockDatabaseServiceConstructor();
            expect(instance).toBeInstanceOf(MockDatabaseServiceConstructor);
        });

        it('should support singleton getInstance pattern', () => {
            const instance1 = MockDatabaseServiceConstructor.getInstance();
            const instance2 = MockDatabaseServiceConstructor.getInstance();

            expect(instance1).toBe(instance2); // Same instance
            expect(instance1).toBeDefined();
        });

        it('should support tenant-specific instances', () => {
            const tenant1Instance = MockDatabaseServiceConstructor.getInstanceByTenantId('tenant1');
            const tenant2Instance = MockDatabaseServiceConstructor.getInstanceByTenantId('tenant2');
            const tenant1Instance2 = MockDatabaseServiceConstructor.getInstanceByTenantId('tenant1');

            expect(tenant1Instance).not.toBe(tenant2Instance); // Different instances
            expect(tenant1Instance).toBe(tenant1Instance2); // Same instance for same tenant
            expect(tenant1Instance).toBeDefined();
            expect(tenant2Instance).toBeDefined();
        });
    });

    describe('Type Generic Support', () => {
        interface CustomObject {
            tenantId: string;
            resourceType: string;
            resourceId: string;
            version: number;
            customField: string;
            customNumber: number;
        }

        it('should support custom object types', () => {
            const customObj: CustomObject = {
                tenantId: 'test',
                resourceType: 'custom',
                resourceId: 'custom-1',
                version: 1,
                customField: 'custom value',
                customNumber: 42
            };

            expect(customObj.customField).toBe('custom value');
            expect(customObj.customNumber).toBe(42);
        });

        it('should support SearchOption with custom types', () => {
            const searchOption: SearchOption<CustomObject> = {
                logic: SearchLogicalOperator.AND,
                conditions: [
                    {
                        key: 'customField',
                        value: 'test',
                        operator: SearchConditionOperator.EQUALS
                    },
                    {
                        key: 'customNumber',
                        value: 42,
                        operator: SearchConditionOperator.GREATER_THAN
                    }
                ]
            };

            const condition1 = searchOption.conditions[0] as any;
            const condition2 = searchOption.conditions[1] as any;
            
            expect(condition1.key).toBe('customField');
            expect(condition2.key).toBe('customNumber');
        });

        it('should support PaginationOption with custom types', () => {
            const pagination: PaginationOption<CustomObject> = {
                page: 1,
                limit: 10,
                sortBy: 'customField',
                sortDirection: SortDirection.ASC
            };

            expect(pagination.sortBy).toBe('customField');
        });
    });

    describe('Interface Compliance Validation', () => {
        it('should ensure all enum values are valid strings', () => {
            // Test SearchConditionOperator values
            Object.values(SearchConditionOperator).forEach(value => {
                expect(typeof value).toBe('string');
                expect(value.trim()).toBe(value); // No leading/trailing whitespace
                expect(value.length).toBeGreaterThan(0);
            });

            // Test SearchLogicalOperator values
            Object.values(SearchLogicalOperator).forEach(value => {
                expect(typeof value).toBe('string');
                expect(value.trim()).toBe(value);
                expect(value.length).toBeGreaterThan(0);
            });

            // Test SortDirection values
            Object.values(SortDirection).forEach(value => {
                expect(typeof value).toBe('string');
                expect(value.trim()).toBe(value);
                expect(value.length).toBeGreaterThan(0);
            });
        });

        it('should validate ProjectObject required fields', () => {
            const validateProjectObject = (obj: any): obj is ProjectObject => {
                return (
                    typeof obj === 'object' &&
                    obj !== null &&
                    typeof obj.tenantId === 'string' &&
                    typeof obj.resourceType === 'string' &&
                    typeof obj.resourceId === 'string' &&
                    typeof obj.version === 'number'
                );
            };

            const validObject: ProjectObject = {
                tenantId: 'test',
                resourceType: 'doc',
                resourceId: 'id',
                version: 1
            };

            const invalidObjects = [
                null,
                undefined,
                {},
                { tenantId: 'test' },
                { tenantId: 'test', resourceType: 'doc' },
                { tenantId: 'test', resourceType: 'doc', resourceId: 'id' },
                { tenantId: 123, resourceType: 'doc', resourceId: 'id', version: 1 },
                { tenantId: 'test', resourceType: 123, resourceId: 'id', version: 1 },
                { tenantId: 'test', resourceType: 'doc', resourceId: 123, version: 1 },
                { tenantId: 'test', resourceType: 'doc', resourceId: 'id', version: '1' }
            ];

            expect(validateProjectObject(validObject)).toBe(true);
            invalidObjects.forEach(obj => {
                expect(validateProjectObject(obj)).toBe(false);
            });
        });
    });
});