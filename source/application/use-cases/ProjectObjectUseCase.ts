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

    async updateObject(obj: T): Promise<T> {
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

    async deleteObject(key: ProjectObjectKey): Promise<boolean> {
        const exists = await this.repository.findByKey(key);
        if (!exists) {
            return false;
        }
        
        return this.repository.delete(key);
    }

    async getObject(key: ProjectObjectKey): Promise<T | null> {
        return this.repository.findByKey(key);
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