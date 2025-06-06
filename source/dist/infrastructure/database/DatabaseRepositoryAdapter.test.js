"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * @jest-environment node
 */
require("@jest/globals");
require("jest");
const DatabaseRepositoryAdapter_1 = require("./DatabaseRepositoryAdapter");
const SearchCriteria_1 = require("../../domain/entities/SearchCriteria");
// Mock database service for testing the adapter
class MockDatabaseService {
    constructor() {
        this.storage = new Map();
        this.shouldThrowError = false;
        this.errorMessage = 'Mock database error';
    }
    setError(shouldThrow, message = 'Mock database error') {
        this.shouldThrowError = shouldThrow;
        this.errorMessage = message;
    }
    createKey(tenantId, resourceType, resourceId, version) {
        return `${tenantId}:${resourceType}:${resourceId}:${version}`;
    }
    async create(obj) {
        if (this.shouldThrowError)
            throw new Error(this.errorMessage);
        const key = this.createKey(obj.tenantId, obj.resourceType, obj.resourceId, obj.version);
        this.storage.set(key, { ...obj });
        return obj;
    }
    async update(obj) {
        if (this.shouldThrowError)
            throw new Error(this.errorMessage);
        const key = this.createKey(obj.tenantId, obj.resourceType, obj.resourceId, obj.version);
        if (!this.storage.has(key)) {
            throw new Error('Object not found for update');
        }
        this.storage.set(key, { ...obj });
        return obj;
    }
    async delete(tenantId, resourceType, resourceId, version) {
        if (this.shouldThrowError)
            throw new Error(this.errorMessage);
        const key = this.createKey(tenantId, resourceType, resourceId, version);
        return this.storage.delete(key);
    }
    async getByKey(tenantId, resourceType, resourceId, version) {
        if (this.shouldThrowError)
            throw new Error(this.errorMessage);
        const key = this.createKey(tenantId, resourceType, resourceId, version);
        return this.storage.get(key) || null;
    }
    async search(condition, pagination) {
        if (this.shouldThrowError)
            throw new Error(this.errorMessage);
        const allObjects = Array.from(this.storage.values());
        const page = pagination.page || 1;
        const limit = pagination.limit || 10;
        const start = (page - 1) * limit;
        const end = start + limit;
        const results = allObjects.slice(start, end);
        return { results, total: allObjects.length };
    }
    async exists(condition) {
        if (this.shouldThrowError)
            throw new Error(this.errorMessage);
        return this.storage.size > 0;
    }
    async count(condition) {
        if (this.shouldThrowError)
            throw new Error(this.errorMessage);
        return this.storage.size;
    }
}
describe('DatabaseRepositoryAdapter Infrastructure', () => {
    let adapter;
    let mockDatabaseService;
    beforeEach(() => {
        mockDatabaseService = new MockDatabaseService();
        adapter = new DatabaseRepositoryAdapter_1.DatabaseRepositoryAdapter(mockDatabaseService);
    });
    describe('Adapter Pattern Implementation', () => {
        it('should create adapter with database service dependency', () => {
            expect(adapter).toBeInstanceOf(DatabaseRepositoryAdapter_1.DatabaseRepositoryAdapter);
        });
        it('should implement ProjectObjectRepository interface', () => {
            expect(typeof adapter.create).toBe('function');
            expect(typeof adapter.update).toBe('function');
            expect(typeof adapter.delete).toBe('function');
            expect(typeof adapter.findByKey).toBe('function');
            expect(typeof adapter.search).toBe('function');
            expect(typeof adapter.exists).toBe('function');
            expect(typeof adapter.count).toBe('function');
        });
    });
    describe('Create Operations', () => {
        const testObject = {
            tenantId: 'test-project-123',
            resourceType: 'document',
            resourceId: 'doc-456',
            version: 1,
            title: 'Test Document',
            content: 'This is test content'
        };
        it('should delegate create to database service', async () => {
            const createSpy = jest.spyOn(mockDatabaseService, 'create');
            const result = await adapter.create(testObject);
            expect(createSpy).toHaveBeenCalledWith(testObject);
            expect(result).toEqual(testObject);
        });
        it('should propagate create errors from database service', async () => {
            mockDatabaseService.setError(true, 'Database create failed');
            await expect(adapter.create(testObject)).rejects.toThrow('Database create failed');
        });
    });
    describe('Update Operations', () => {
        const testObject = {
            tenantId: 'test-project-123',
            resourceType: 'document',
            resourceId: 'doc-456',
            version: 1,
            title: 'Updated Title'
        };
        it('should delegate update to database service', async () => {
            // First create the object
            await mockDatabaseService.create(testObject);
            const updateSpy = jest.spyOn(mockDatabaseService, 'update');
            const updatedObject = { ...testObject, title: 'New Title' };
            const result = await adapter.update(updatedObject);
            expect(updateSpy).toHaveBeenCalledWith(updatedObject);
            expect(result.title).toBe('New Title');
        });
        it('should propagate update errors from database service', async () => {
            mockDatabaseService.setError(true, 'Database update failed');
            await expect(adapter.update(testObject)).rejects.toThrow('Database update failed');
        });
    });
    describe('Delete Operations', () => {
        const testKey = {
            tenantId: 'test-project-123',
            resourceType: 'document',
            resourceId: 'doc-456',
            version: 1
        };
        it('should convert ProjectObjectKey to individual parameters for database service', async () => {
            const deleteSpy = jest.spyOn(mockDatabaseService, 'delete');
            const result = await adapter.delete(testKey);
            expect(deleteSpy).toHaveBeenCalledWith(testKey.tenantId, testKey.resourceType, testKey.resourceId, testKey.version);
            expect(typeof result).toBe('boolean');
        });
        it('should return true when deletion succeeds', async () => {
            // First create the object
            await mockDatabaseService.create({
                ...testKey,
                title: 'Test'
            });
            const result = await adapter.delete(testKey);
            expect(result).toBe(true);
        });
        it('should return false when object does not exist', async () => {
            const result = await adapter.delete(testKey);
            expect(result).toBe(false);
        });
        it('should propagate delete errors from database service', async () => {
            mockDatabaseService.setError(true, 'Database delete failed');
            await expect(adapter.delete(testKey)).rejects.toThrow('Database delete failed');
        });
    });
    describe('Find Operations', () => {
        const testKey = {
            tenantId: 'test-project-123',
            resourceType: 'document',
            resourceId: 'doc-456',
            version: 1
        };
        const testObject = {
            ...testKey,
            title: 'Test Document'
        };
        it('should convert ProjectObjectKey to individual parameters for database service', async () => {
            const getByKeySpy = jest.spyOn(mockDatabaseService, 'getByKey');
            await adapter.findByKey(testKey);
            expect(getByKeySpy).toHaveBeenCalledWith(testKey.tenantId, testKey.resourceType, testKey.resourceId, testKey.version);
        });
        it('should return object when it exists', async () => {
            await mockDatabaseService.create(testObject);
            const result = await adapter.findByKey(testKey);
            expect(result).toEqual(testObject);
        });
        it('should return null when object does not exist', async () => {
            const result = await adapter.findByKey(testKey);
            expect(result).toBeNull();
        });
        it('should propagate find errors from database service', async () => {
            mockDatabaseService.setError(true, 'Database find failed');
            await expect(adapter.findByKey(testKey)).rejects.toThrow('Database find failed');
        });
    });
    describe('Search Operations', () => {
        const searchCondition = {
            logic: SearchCriteria_1.SearchLogicalOperator.AND,
            conditions: [
                {
                    key: 'projectId',
                    value: 'test-project',
                    operator: SearchCriteria_1.SearchConditionOperator.EQUALS
                }
            ]
        };
        const paginationOptions = {
            page: 1,
            limit: 10,
            sortBy: 'version',
            sortDirection: SearchCriteria_1.SortDirection.ASC
        };
        it('should delegate search to database service with same parameters', async () => {
            const searchSpy = jest.spyOn(mockDatabaseService, 'search');
            await adapter.search(searchCondition, paginationOptions);
            expect(searchSpy).toHaveBeenCalledWith(searchCondition, paginationOptions);
        });
        it('should return search results from database service', async () => {
            const result = await adapter.search(searchCondition, paginationOptions);
            expect(result).toHaveProperty('results');
            expect(result).toHaveProperty('total');
            expect(Array.isArray(result.results)).toBe(true);
            expect(typeof result.total).toBe('number');
        });
        it('should propagate search errors from database service', async () => {
            mockDatabaseService.setError(true, 'Database search failed');
            await expect(adapter.search(searchCondition, paginationOptions)).rejects.toThrow('Database search failed');
        });
    });
    describe('Exists Operations', () => {
        const searchCondition = {
            logic: SearchCriteria_1.SearchLogicalOperator.AND,
            conditions: [
                {
                    key: 'projectId',
                    value: 'test-project',
                    operator: SearchCriteria_1.SearchConditionOperator.EQUALS
                }
            ]
        };
        it('should delegate exists to database service', async () => {
            const existsSpy = jest.spyOn(mockDatabaseService, 'exists');
            await adapter.exists(searchCondition);
            expect(existsSpy).toHaveBeenCalledWith(searchCondition);
        });
        it('should return boolean result from database service', async () => {
            const result = await adapter.exists(searchCondition);
            expect(typeof result).toBe('boolean');
        });
        it('should propagate exists errors from database service', async () => {
            mockDatabaseService.setError(true, 'Database exists check failed');
            await expect(adapter.exists(searchCondition)).rejects.toThrow('Database exists check failed');
        });
    });
    describe('Count Operations', () => {
        const searchCondition = {
            logic: SearchCriteria_1.SearchLogicalOperator.AND,
            conditions: [
                {
                    key: 'projectId',
                    value: 'test-project',
                    operator: SearchCriteria_1.SearchConditionOperator.EQUALS
                }
            ]
        };
        it('should delegate count to database service', async () => {
            const countSpy = jest.spyOn(mockDatabaseService, 'count');
            await adapter.count(searchCondition);
            expect(countSpy).toHaveBeenCalledWith(searchCondition);
        });
        it('should return number result from database service', async () => {
            const result = await adapter.count(searchCondition);
            expect(typeof result).toBe('number');
            expect(result).toBeGreaterThanOrEqual(0);
        });
        it('should propagate count errors from database service', async () => {
            mockDatabaseService.setError(true, 'Database count failed');
            await expect(adapter.count(searchCondition)).rejects.toThrow('Database count failed');
        });
    });
    describe('Method Delegation Integrity', () => {
        it('should call database service methods exactly once for each adapter method', async () => {
            const testObject = {
                tenantId: 'test',
                resourceType: 'doc',
                resourceId: 'test',
                version: 1
            };
            const testKey = {
                tenantId: 'test',
                resourceType: 'doc',
                resourceId: 'test',
                version: 1
            };
            const searchCondition = {
                logic: SearchCriteria_1.SearchLogicalOperator.AND,
                conditions: []
            };
            const pagination = {};
            const createSpy = jest.spyOn(mockDatabaseService, 'create');
            const updateSpy = jest.spyOn(mockDatabaseService, 'update');
            const deleteSpy = jest.spyOn(mockDatabaseService, 'delete');
            const getByKeySpy = jest.spyOn(mockDatabaseService, 'getByKey');
            const searchSpy = jest.spyOn(mockDatabaseService, 'search');
            const existsSpy = jest.spyOn(mockDatabaseService, 'exists');
            const countSpy = jest.spyOn(mockDatabaseService, 'count');
            await adapter.create(testObject);
            await adapter.update(testObject);
            await adapter.delete(testKey);
            await adapter.findByKey(testKey);
            await adapter.search(searchCondition, pagination);
            await adapter.exists(searchCondition);
            await adapter.count(searchCondition);
            expect(createSpy).toHaveBeenCalledTimes(1);
            expect(updateSpy).toHaveBeenCalledTimes(1);
            expect(deleteSpy).toHaveBeenCalledTimes(1);
            expect(getByKeySpy).toHaveBeenCalledTimes(1);
            expect(searchSpy).toHaveBeenCalledTimes(1);
            expect(existsSpy).toHaveBeenCalledTimes(1);
            expect(countSpy).toHaveBeenCalledTimes(1);
        });
    });
    describe('Type Safety', () => {
        it('should support custom ProjectObject types', async () => {
            const customMockService = mockDatabaseService;
            const customAdapter = new DatabaseRepositoryAdapter_1.DatabaseRepositoryAdapter(customMockService);
            const customObject = {
                tenantId: 'custom-project',
                resourceType: 'custom-doc',
                resourceId: 'custom-123',
                version: 1,
                customField: 'custom value'
            };
            const result = await customAdapter.create(customObject);
            expect(result.customField).toBe('custom value');
        });
    });
    describe('Error Propagation', () => {
        it('should not modify errors from database service', async () => {
            const originalError = new Error('Original database error');
            jest.spyOn(mockDatabaseService, 'create').mockRejectedValueOnce(originalError);
            const testObject = {
                tenantId: 'test',
                resourceType: 'doc',
                resourceId: 'test',
                version: 1
            };
            try {
                await adapter.create(testObject);
                fail('Expected error to be thrown');
            }
            catch (error) {
                expect(error).toBe(originalError);
                expect(error.message).toBe('Original database error');
            }
        });
    });
});
