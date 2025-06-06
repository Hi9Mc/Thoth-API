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
        // For create operations, validate if version is provided, otherwise set to 1
        if (obj.version !== undefined && obj.version !== null) {
            // If version is explicitly provided, validate it
            this.validateProjectObject(obj);
        }
        // Set version to 1 for new objects (create operations always start at version 1)
        const newObj = { ...obj, version: 1 };
        // Validate the complete object
        this.validateProjectObject(newObj);
        // Check if object already exists (by key without version)
        const existing = await this.repository.findByKey({
            tenantId: newObj.tenantId,
            resourceType: newObj.resourceType,
            resourceId: newObj.resourceId
        });
        if (existing) {
            throw new Error(`Object with key ${newObj.tenantId}#${newObj.resourceType}#${newObj.resourceId} already exists`);
        }
        return this.repository.create(newObj);
    }
    async getObject(key) {
        return this.repository.findByKey(key);
    }
    async updateObject(obj) {
        this.validateProjectObject(obj);
        // Check if object exists (get current version)
        const existing = await this.repository.findByKey({
            tenantId: obj.tenantId,
            resourceType: obj.resourceType,
            resourceId: obj.resourceId
        });
        if (!existing) {
            throw new Error(`Object with key ${obj.tenantId}#${obj.resourceType}#${obj.resourceId} not found`);
        }
        // Validate version for optimistic locking
        if (obj.version !== existing.version + 1) {
            throw new Error(`Version mismatch. Expected ${existing.version + 1}, got ${obj.version}`);
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
