"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * @jest-environment node
 */
require("@jest/globals");
require("jest");
const ProjectObjectController_1 = require("./ProjectObjectController");
const SearchCriteria_1 = require("../../domain/entities/SearchCriteria");
class MockProjectObjectUseCase {
    constructor() {
        this.storage = new Map();
        this.shouldThrowError = false;
        this.errorMessage = 'Mock error';
    }
    setError(shouldThrow, message = 'Mock error') {
        this.shouldThrowError = shouldThrow;
        this.errorMessage = message;
    }
    createKey(key) {
        return `${key.tenantId}:${key.resourceType}:${key.resourceId}:${key.version}`;
    }
    async createObject(obj) {
        if (this.shouldThrowError)
            throw new Error(this.errorMessage);
        const key = this.createKey(obj);
        this.storage.set(key, { ...obj });
        return obj;
    }
    async updateObject(obj) {
        if (this.shouldThrowError)
            throw new Error(this.errorMessage);
        const key = this.createKey(obj);
        if (!this.storage.has(key)) {
            throw new Error('Object not found');
        }
        this.storage.set(key, { ...obj });
        return obj;
    }
    async deleteObject(key) {
        if (this.shouldThrowError)
            throw new Error(this.errorMessage);
        const keyStr = this.createKey(key);
        return this.storage.delete(keyStr);
    }
    async getObject(key) {
        if (this.shouldThrowError)
            throw new Error(this.errorMessage);
        const keyStr = this.createKey(key);
        return this.storage.get(keyStr) || null;
    }
    async searchObjects(condition, pagination) {
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
    async objectExists(condition) {
        if (this.shouldThrowError)
            throw new Error(this.errorMessage);
        return this.storage.size > 0;
    }
    async countObjects(condition) {
        if (this.shouldThrowError)
            throw new Error(this.errorMessage);
        return this.storage.size;
    }
}
describe('ProjectObjectController Interface Adapter', () => {
    let controller;
    let mockUseCase;
    beforeEach(() => {
        mockUseCase = new MockProjectObjectUseCase();
        controller = new ProjectObjectController_1.ProjectObjectController(mockUseCase);
    });
    describe('Constructor', () => {
        it('should create controller with use case dependency', () => {
            expect(controller).toBeInstanceOf(ProjectObjectController_1.ProjectObjectController);
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
        it('should create object successfully', async () => {
            const result = await controller.create(testObject);
            expect(result.success).toBe(true);
            expect(result.data).toEqual(testObject);
            expect(result.error).toBeUndefined();
        });
        it('should handle create errors gracefully', async () => {
            mockUseCase.setError(true, 'Failed to create object');
            const result = await controller.create(testObject);
            expect(result.success).toBe(false);
            expect(result.data).toBeUndefined();
            expect(result.error).toBe('Failed to create object');
        });
        it('should handle unknown errors', async () => {
            mockUseCase.setError(true);
            // Simulate non-Error object being thrown
            jest.spyOn(mockUseCase, 'createObject').mockRejectedValueOnce('string error');
            const result = await controller.create(testObject);
            expect(result.success).toBe(false);
            expect(result.error).toBe('Unknown error occurred');
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
        it('should update object successfully', async () => {
            // First create the object
            await mockUseCase.createObject(testObject);
            const updatedObject = { ...testObject, title: 'New Title' };
            const result = await controller.update(updatedObject);
            expect(result.success).toBe(true);
            expect(result.data).toEqual(updatedObject);
            expect(result.error).toBeUndefined();
        });
        it('should handle update errors gracefully', async () => {
            mockUseCase.setError(true, 'Failed to update object');
            const result = await controller.update(testObject);
            expect(result.success).toBe(false);
            expect(result.data).toBeUndefined();
            expect(result.error).toBe('Failed to update object');
        });
    });
    describe('Delete Operations', () => {
        const testKey = {
            tenantId: 'test-project-123',
            resourceType: 'document',
            resourceId: 'doc-456',
            version: 1
        };
        it('should delete object successfully', async () => {
            // First create the object
            await mockUseCase.createObject({
                ...testKey,
                title: 'Test'
            });
            const result = await controller.delete(testKey.tenantId, testKey.resourceType, testKey.resourceId, testKey.version);
            expect(result.success).toBe(true);
            expect(result.error).toBeUndefined();
        });
        it('should handle delete errors gracefully', async () => {
            mockUseCase.setError(true, 'Failed to delete object');
            const result = await controller.delete(testKey.tenantId, testKey.resourceType, testKey.resourceId, testKey.version);
            expect(result.success).toBe(false);
            expect(result.error).toBe('Failed to delete object');
        });
        it('should construct ProjectObjectKey correctly', async () => {
            const deleteSpy = jest.spyOn(mockUseCase, 'deleteObject');
            await controller.delete('proj-1', 'doc', 'content-1', 2);
            expect(deleteSpy).toHaveBeenCalledWith({
                tenantId: 'proj-1',
                resourceType: 'doc',
                resourceId: 'content-1',
                version: 2
            });
        });
    });
    describe('Get Operations', () => {
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
        it('should get object successfully when it exists', async () => {
            await mockUseCase.createObject(testObject);
            const result = await controller.getByKey(testKey.tenantId, testKey.resourceType, testKey.resourceId, testKey.version);
            expect(result.success).toBe(true);
            expect(result.data).toEqual(testObject);
            expect(result.error).toBeUndefined();
        });
        it('should return null when object does not exist', async () => {
            const result = await controller.getByKey(testKey.tenantId, testKey.resourceType, testKey.resourceId, testKey.version);
            expect(result.success).toBe(true);
            expect(result.data).toBeNull();
            expect(result.error).toBeUndefined();
        });
        it('should handle get errors gracefully', async () => {
            mockUseCase.setError(true, 'Failed to get object');
            const result = await controller.getByKey(testKey.tenantId, testKey.resourceType, testKey.resourceId, testKey.version);
            expect(result.success).toBe(false);
            expect(result.data).toBeUndefined();
            expect(result.error).toBe('Failed to get object');
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
        it('should search objects successfully with pagination', async () => {
            var _a, _b;
            const result = await controller.search(searchCondition, paginationOptions);
            expect(result.success).toBe(true);
            expect(result.data).toHaveProperty('results');
            expect(result.data).toHaveProperty('total');
            expect(Array.isArray((_a = result.data) === null || _a === void 0 ? void 0 : _a.results)).toBe(true);
            expect(typeof ((_b = result.data) === null || _b === void 0 ? void 0 : _b.total)).toBe('number');
            expect(result.error).toBeUndefined();
        });
        it('should search objects successfully without pagination', async () => {
            const result = await controller.search(searchCondition);
            expect(result.success).toBe(true);
            expect(result.data).toHaveProperty('results');
            expect(result.data).toHaveProperty('total');
            expect(result.error).toBeUndefined();
        });
        it('should handle search errors gracefully', async () => {
            mockUseCase.setError(true, 'Failed to search objects');
            const result = await controller.search(searchCondition, paginationOptions);
            expect(result.success).toBe(false);
            expect(result.data).toBeUndefined();
            expect(result.error).toBe('Failed to search objects');
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
        it('should check object existence successfully', async () => {
            const result = await controller.exists(searchCondition);
            expect(result.success).toBe(true);
            expect(typeof result.data).toBe('boolean');
            expect(result.error).toBeUndefined();
        });
        it('should handle exists errors gracefully', async () => {
            mockUseCase.setError(true, 'Failed to check existence');
            const result = await controller.exists(searchCondition);
            expect(result.success).toBe(false);
            expect(result.data).toBeUndefined();
            expect(result.error).toBe('Failed to check existence');
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
        it('should count objects successfully', async () => {
            const result = await controller.count(searchCondition);
            expect(result.success).toBe(true);
            expect(typeof result.data).toBe('number');
            expect(result.data).toBeGreaterThanOrEqual(0);
            expect(result.error).toBeUndefined();
        });
        it('should handle count errors gracefully', async () => {
            mockUseCase.setError(true, 'Failed to count objects');
            const result = await controller.count(searchCondition);
            expect(result.success).toBe(false);
            expect(result.data).toBeUndefined();
            expect(result.error).toBe('Failed to count objects');
        });
    });
    describe('Response Format Consistency', () => {
        it('should maintain consistent response format across all operations', async () => {
            const testObject = {
                tenantId: 'test',
                resourceType: 'doc',
                resourceId: 'test',
                version: 1
            };
            const searchCondition = {
                logic: SearchCriteria_1.SearchLogicalOperator.AND,
                conditions: []
            };
            // Test all operations have success field
            const createResult = await controller.create(testObject);
            const updateResult = await controller.update(testObject);
            const deleteResult = await controller.delete('test', 'doc', 'test', 1);
            const getResult = await controller.getByKey('test', 'doc', 'test', 1);
            const searchResult = await controller.search(searchCondition);
            const existsResult = await controller.exists(searchCondition);
            const countResult = await controller.count(searchCondition);
            expect(createResult).toHaveProperty('success');
            expect(updateResult).toHaveProperty('success');
            expect(deleteResult).toHaveProperty('success');
            expect(getResult).toHaveProperty('success');
            expect(searchResult).toHaveProperty('success');
            expect(existsResult).toHaveProperty('success');
            expect(countResult).toHaveProperty('success');
        });
    });
    describe('Type Safety', () => {
        it('should support custom ProjectObject types', async () => {
            var _a;
            const customUseCase = mockUseCase;
            const customController = new ProjectObjectController_1.ProjectObjectController(customUseCase);
            const customObject = {
                tenantId: 'custom-project',
                resourceType: 'custom-doc',
                resourceId: 'custom-123',
                version: 1,
                customField: 'custom value'
            };
            const result = await customController.create(customObject);
            expect(result.success).toBe(true);
            expect((_a = result.data) === null || _a === void 0 ? void 0 : _a.customField).toBe('custom value');
        });
    });
    describe('Error Handling Edge Cases', () => {
        it('should handle null errors', async () => {
            jest.spyOn(mockUseCase, 'createObject').mockRejectedValueOnce(null);
            const testObject = {
                tenantId: 'test',
                resourceType: 'doc',
                resourceId: 'test',
                version: 1
            };
            const result = await controller.create(testObject);
            expect(result.success).toBe(false);
            expect(result.error).toBe('Unknown error occurred');
        });
        it('should handle undefined errors', async () => {
            jest.spyOn(mockUseCase, 'createObject').mockRejectedValueOnce(undefined);
            const testObject = {
                tenantId: 'test',
                resourceType: 'doc',
                resourceId: 'test',
                version: 1
            };
            const result = await controller.create(testObject);
            expect(result.success).toBe(false);
            expect(result.error).toBe('Unknown error occurred');
        });
    });
});
