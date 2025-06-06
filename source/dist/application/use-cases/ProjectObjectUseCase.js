"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProjectObjectUseCase = void 0;
/**
 * Use case for managing ProjectObjects
 * This follows Clean Architecture principles by encapsulating business logic
 */
class ProjectObjectUseCase {
    constructor(repository) {
        this.repository = repository;
    }
    async createObject(obj) {
        // Business logic: Validate object before creation
        this.validateProjectObject(obj);
        // Check if object already exists
        const existing = await this.repository.findByKey({
            tenantId: obj.tenantId,
            resourceType: obj.resourceType,
            resourceId: obj.resourceId,
            version: obj.version
        });
        if (existing) {
            throw new Error(`Object with key ${obj.tenantId}#${obj.resourceType}#${obj.resourceId}#${obj.version} already exists`);
        }
        return this.repository.create(obj);
    }
    async updateObject(obj) {
        this.validateProjectObject(obj);
        // Check if object exists
        const existing = await this.repository.findByKey({
            tenantId: obj.tenantId,
            resourceType: obj.resourceType,
            resourceId: obj.resourceId,
            version: obj.version
        });
        if (!existing) {
            throw new Error(`Object with key ${obj.tenantId}#${obj.resourceType}#${obj.resourceId}#${obj.version} not found`);
        }
        return this.repository.update(obj);
    }
    async deleteObject(key) {
        const exists = await this.repository.findByKey(key);
        if (!exists) {
            return false;
        }
        return this.repository.delete(key);
    }
    async getObject(key) {
        return this.repository.findByKey(key);
    }
    async searchObjects(condition, pagination) {
        // Apply default pagination if not provided
        const paginationWithDefaults = {
            page: 1,
            limit: 20,
            ...pagination
        };
        return this.repository.search(condition, paginationWithDefaults);
    }
    async objectExists(condition) {
        return this.repository.exists(condition);
    }
    async countObjects(condition) {
        return this.repository.count(condition);
    }
    validateProjectObject(obj) {
        if (!obj.tenantId || typeof obj.tenantId !== 'string') {
            throw new Error('TenantId is required and must be a string');
        }
        if (!obj.resourceType || typeof obj.resourceType !== 'string') {
            throw new Error('ResourceType is required and must be a string');
        }
        if (!obj.resourceId || typeof obj.resourceId !== 'string') {
            throw new Error('ResourceId is required and must be a string');
        }
        if (typeof obj.version !== 'number' || obj.version < 0) {
            throw new Error('Version is required and must be a non-negative number');
        }
    }
}
exports.ProjectObjectUseCase = ProjectObjectUseCase;
