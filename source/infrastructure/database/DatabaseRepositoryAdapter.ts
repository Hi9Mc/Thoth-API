import { ProjectObject, ProjectObjectKey } from '../../domain/entities/ProjectObject';
import { SearchOption, PaginationOption } from '../../domain/entities/SearchCriteria';
import { ProjectObjectRepository } from '../../domain/repositories/ProjectObjectRepository';
import { IDatabaseService } from './IDatabaseService';

/**
 * Adapter that converts the domain repository interface to the legacy database service interface
 * This implements the Adapter pattern to bridge the Clean Architecture domain layer 
 * with the existing database infrastructure
 */
export class DatabaseRepositoryAdapter<T extends ProjectObject = ProjectObject> implements ProjectObjectRepository<T> {
    constructor(private databaseService: IDatabaseService<T>) {}

    async create(obj: T): Promise<T> {
        return this.databaseService.create(obj);
    }

    async update(obj: T): Promise<T> {
        return this.databaseService.update(obj);
    }

    async delete(key: ProjectObjectKey): Promise<boolean> {
        return this.databaseService.delete(key.tenantId, key.resourceType, key.resourceId);
    }

    async findByKey(key: ProjectObjectKey): Promise<T | null> {
        return this.databaseService.getByKey(key.tenantId, key.resourceType, key.resourceId);
    }

    async search(condition: SearchOption<T>, pagination: PaginationOption<T>): Promise<{ results: T[], total: number }> {
        return this.databaseService.search(condition, pagination);
    }

    async exists(condition: SearchOption<T>): Promise<boolean> {
        return this.databaseService.exists(condition);
    }

    async count(condition: SearchOption<T>): Promise<number> {
        return this.databaseService.count(condition);
    }
}