/**
 * @jest-environment node
 */
import '@jest/globals';
import 'jest';
import { ProjectObjectRepository } from './ProjectObjectRepository';
import { ProjectObject, ProjectObjectKey } from '../entities/ProjectObject';
import { SearchOption, PaginationOption, SearchLogicalOperator, SearchConditionOperator, SortDirection } from '../entities/SearchCriteria';

// Mock implementation for testing the repository interface
class MockProjectObjectRepository implements ProjectObjectRepository<ProjectObject> {
    private storage: Map<string, ProjectObject> = new Map();

    private createKey(key: ProjectObjectKey): string {
        return `${key.tenantId}:${key.resourceType}:${key.resourceId}:${key.version}`;
    }

    async create(obj: ProjectObject): Promise<ProjectObject> {
        const key = this.createKey(obj);
        this.storage.set(key, { ...obj });
        return obj;
    }

    async update(obj: ProjectObject): Promise<ProjectObject> {
        const key = this.createKey(obj);
        if (!this.storage.has(key)) {
            throw new Error('Object not found');
        }
        this.storage.set(key, { ...obj });
        return obj;
    }

    async delete(key: ProjectObjectKey): Promise<boolean> {
        const keyStr = this.createKey(key);
        return this.storage.delete(keyStr);
    }

    async findByKey(key: ProjectObjectKey): Promise<ProjectObject | null> {
        const keyStr = this.createKey(key);
        return this.storage.get(keyStr) || null;
    }

    async search(condition: SearchOption<ProjectObject>, pagination: PaginationOption<ProjectObject>): Promise<{ results: ProjectObject[], total: number }> {
        const allObjects = Array.from(this.storage.values());
        const filtered = allObjects.filter(() => true); // Simplified for mock
        
        const page = pagination.page || 1;
        const limit = pagination.limit || 10;
        const start = (page - 1) * limit;
        const end = start + limit;
        
        const results = filtered.slice(start, end);
        return { results, total: filtered.length };
    }

    async exists(condition: SearchOption<ProjectObject>): Promise<boolean> {
        const result = await this.search(condition, { page: 1, limit: 1 });
        return result.total > 0;
    }

    async count(condition: SearchOption<ProjectObject>): Promise<number> {
        const result = await this.search(condition, { page: 1, limit: 1 });
        return result.total;
    }
}

describe('ProjectObjectRepository Domain Interface', () => {
    let repository: ProjectObjectRepository<ProjectObject>;
    
    beforeEach(() => {
        repository = new MockProjectObjectRepository();
    });

    describe('Interface Contract', () => {
        it('should define all required methods', () => {
            expect(typeof repository.create).toBe('function');
            expect(typeof repository.update).toBe('function');
            expect(typeof repository.delete).toBe('function');
            expect(typeof repository.findByKey).toBe('function');
            expect(typeof repository.search).toBe('function');
            expect(typeof repository.exists).toBe('function');
            expect(typeof repository.count).toBe('function');
        });
    });

    describe('CRUD Operations', () => {
        const testObject: ProjectObject = {
            tenantId: 'test-project-123',
            resourceType: 'document',
            resourceId: 'doc-456',
            version: 1,
            title: 'Test Document',
            content: 'This is test content'
        };

        const testKey: ProjectObjectKey = {
            tenantId: 'test-project-123',
            resourceType: 'document',
            resourceId: 'doc-456',
            version: 1
        };

        it('should create and return a project object', async () => {
            const result = await repository.create(testObject);
            
            expect(result).toEqual(testObject);
            expect(result.projectId).toBe(testObject.projectId);
            expect(result.contentType).toBe(testObject.contentType);
            expect(result.contentId).toBe(testObject.contentId);
            expect(result.version).toBe(testObject.version);
        });

        it('should find an object by its key', async () => {
            await repository.create(testObject);
            const result = await repository.findByKey(testKey);
            
            expect(result).toEqual(testObject);
        });

        it('should return null when object not found', async () => {
            const result = await repository.findByKey(testKey);
            
            expect(result).toBeNull();
        });

        it('should update an existing object', async () => {
            await repository.create(testObject);
            
            const updatedObject = {
                ...testObject,
                title: 'Updated Title',
                content: 'Updated content'
            };
            
            const result = await repository.update(updatedObject);
            
            expect(result.title).toBe('Updated Title');
            expect(result.content).toBe('Updated content');
        });

        it('should delete an object by key', async () => {
            await repository.create(testObject);
            
            const deleteResult = await repository.delete(testKey);
            expect(deleteResult).toBe(true);
            
            const findResult = await repository.findByKey(testKey);
            expect(findResult).toBeNull();
        });

        it('should return false when deleting non-existent object', async () => {
            const result = await repository.delete(testKey);
            expect(result).toBe(false);
        });
    });

    describe('Search Operations', () => {
        const searchCondition: SearchOption<ProjectObject> = {
            logic: SearchLogicalOperator.AND,
            conditions: [
                {
                    key: 'tenantId',
                    value: 'test-project',
                    operator: SearchConditionOperator.EQUALS
                }
            ]
        };

        const paginationOptions: PaginationOption<ProjectObject> = {
            page: 1,
            limit: 10,
            sortBy: 'version',
            sortDirection: SortDirection.ASC
        };

        it('should search with condition and pagination', async () => {
            const result = await repository.search(searchCondition, paginationOptions);
            
            expect(result).toHaveProperty('results');
            expect(result).toHaveProperty('total');
            expect(Array.isArray(result.results)).toBe(true);
            expect(typeof result.total).toBe('number');
        });

        it('should check if objects exist matching condition', async () => {
            const result = await repository.exists(searchCondition);
            
            expect(typeof result).toBe('boolean');
        });

        it('should count objects matching condition', async () => {
            const result = await repository.count(searchCondition);
            
            expect(typeof result).toBe('number');
            expect(result).toBeGreaterThanOrEqual(0);
        });
    });

    describe('Type Safety', () => {
        interface CustomProjectObject extends ProjectObject {
            customField: string;
            metadata: {
                tags: string[];
                priority: number;
            };
        }

        it('should support extended ProjectObject types', async () => {
            const customRepo: ProjectObjectRepository<CustomProjectObject> = new MockProjectObjectRepository() as any;
            
            const customObject: CustomProjectObject = {
                tenantId: 'custom-project',
                resourceType: 'custom-doc',
                resourceId: 'custom-123',
                version: 1,
                customField: 'custom value',
                metadata: {
                    tags: ['important', 'urgent'],
                    priority: 5
                }
            };

            const result = await customRepo.create(customObject);
            
            expect(result.customField).toBe('custom value');
            expect(result.metadata.tags).toEqual(['important', 'urgent']);
            expect(result.metadata.priority).toBe(5);
        });

        it('should maintain type safety in search operations', async () => {
            const searchWithCustomField: SearchOption<ProjectObject> = {
                logic: SearchLogicalOperator.AND,
                conditions: [
                    {
                        key: 'tenantId', // Type-safe: must be keyof ProjectObject
                        value: 'test',
                        operator: SearchConditionOperator.EQUALS
                    }
                ]
            };

            const paginationWithSort: PaginationOption<ProjectObject> = {
                page: 1,
                limit: 10,
                sortBy: 'version', // Type-safe: must be keyof ProjectObject
                sortDirection: SortDirection.DESC
            };

            const result = await repository.search(searchWithCustomField, paginationWithSort);
            
            expect(result).toHaveProperty('results');
            expect(result).toHaveProperty('total');
        });
    });

    describe('Error Handling', () => {
        it('should handle update of non-existent object', async () => {
            const testObject: ProjectObject = {
                tenantId: 'non-existent',
                resourceType: 'document',
                resourceId: 'doc-999',
                version: 1,
                title: 'Non-existent'
            };

            await expect(repository.update(testObject)).rejects.toThrow('Object not found');
        });
    });

    describe('Async Behavior', () => {
        it('should return promises for all methods', () => {
            const testObject: ProjectObject = {
                tenantId: 'test',
                resourceType: 'doc',
                resourceId: 'test',
                version: 1
            };

            const testKey: ProjectObjectKey = {
                tenantId: 'test',
                resourceType: 'doc',
                resourceId: 'test',
                version: 1
            };

            const searchCondition: SearchOption<ProjectObject> = {
                logic: SearchLogicalOperator.AND,
                conditions: []
            };

            const pagination: PaginationOption<ProjectObject> = {};

            expect(repository.create(testObject)).toBeInstanceOf(Promise);
            expect(repository.update(testObject)).toBeInstanceOf(Promise);
            expect(repository.delete(testKey)).toBeInstanceOf(Promise);
            expect(repository.findByKey(testKey)).toBeInstanceOf(Promise);
            expect(repository.search(searchCondition, pagination)).toBeInstanceOf(Promise);
            expect(repository.exists(searchCondition)).toBeInstanceOf(Promise);
            expect(repository.count(searchCondition)).toBeInstanceOf(Promise);
        });
    });
});