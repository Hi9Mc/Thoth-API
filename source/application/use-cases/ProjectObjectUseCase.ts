import { ProjectObject, ProjectObjectKey } from '../../domain/entities/ProjectObject';
import { SearchOption, PaginationOption } from '../../domain/entities/SearchCriteria';
import { ProjectObjectRepository } from '../../domain/repositories/ProjectObjectRepository';

/**
 * Use case for managing ProjectObjects
 * This follows Clean Architecture principles by encapsulating business logic
 */
export class ProjectObjectUseCase<T extends ProjectObject = ProjectObject> {
    constructor(private repository: ProjectObjectRepository<T>) {}

    async createObject(obj: T): Promise<T> {
        // For create operations, validate if version is provided, otherwise set to 1
        if (obj.version !== undefined && obj.version !== null) {
            // If version is explicitly provided, validate it
            this.validateProjectObject(obj);
        }
        
        // Set version to 1 for new objects (create operations always start at version 1)
        const newObj = { ...obj, version: 1 } as T;
        
        // Validate the complete object
        this.validateProjectObject(newObj);
        
        // Check if object already exists (by key without version)
        const existing = await this.repository.findByKey({
            tenantId: newObj.tenantId,
            resourceType: newObj.resourceType,
            resourceId: newObj.resourceId
        });

        if (existing) {
            // Provide a more helpful error message
            if (obj.version && obj.version > 1) {
                throw new Error(`Object with key ${newObj.tenantId}#${newObj.resourceType}#${newObj.resourceId} already exists. To update existing objects, use PUT instead of POST. Current version is ${existing.version}, use version ${existing.version + 1} for updates.`);
            } else {
                throw new Error(`Object with key ${newObj.tenantId}#${newObj.resourceType}#${newObj.resourceId} already exists. To update existing objects, use PUT instead of POST.`);
            }
        }

        return this.repository.create(newObj);
    }

    async getObject(key: ProjectObjectKey): Promise<T | null> {
        return this.repository.findByKey(key);
    }

    async updateObject(obj: T): Promise<T> {
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

    async deleteObject(key: ProjectObjectKey): Promise<boolean> {
        const exists = await this.repository.findByKey(key);
        if (!exists) {
            return false;
        }
        
        return this.repository.delete(key);
    }

    async searchObjects(condition: SearchOption<T>, pagination: PaginationOption<T>): Promise<{ results: T[], total: number }> {
        // Apply default pagination if not provided
        const paginationWithDefaults = {
            page: 1,
            limit: 20,
            ...pagination
        };

        return this.repository.search(condition, paginationWithDefaults);
    }

    async objectExists(condition: SearchOption<T>): Promise<boolean> {
        return this.repository.exists(condition);
    }

    async countObjects(condition: SearchOption<T>): Promise<number> {
        return this.repository.count(condition);
    }

    private validateProjectObject(obj: T): void {
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