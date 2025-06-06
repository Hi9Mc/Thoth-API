import { ProjectObject, ProjectObjectKey } from '../../domain/entities/ProjectObject';
import { SearchOption, PaginationOption } from '../../domain/entities/SearchCriteria';
import { ProjectObjectUseCase } from '../../application/use-cases/ProjectObjectUseCase';

/**
 * Controller for handling ProjectObject operations
 * This is part of the Interface Adapters layer in Clean Architecture
 */
export class ProjectObjectController<T extends ProjectObject = ProjectObject> {
    constructor(private useCase: ProjectObjectUseCase<T>) {}

    async create(obj: T): Promise<{ success: boolean; data?: T; error?: string }> {
        try {
            const result = await this.useCase.createObject(obj);
            return { success: true, data: result };
        } catch (error) {
            return { 
                success: false, 
                error: error instanceof Error ? error.message : 'Unknown error occurred' 
            };
        }
    }

    async update(obj: T): Promise<{ success: boolean; data?: T; error?: string }> {
        try {
            const result = await this.useCase.updateObject(obj);
            return { success: true, data: result };
        } catch (error) {
            return { 
                success: false, 
                error: error instanceof Error ? error.message : 'Unknown error occurred' 
            };
        }
    }

    async delete(tenantId: string, resourceType: string, resourceId: string): Promise<{ success: boolean; error?: string }> {
        try {
            const key: ProjectObjectKey = { tenantId, resourceType, resourceId };
            const result = await this.useCase.deleteObject(key);
            return { success: result };
        } catch (error) {
            return { 
                success: false, 
                error: error instanceof Error ? error.message : 'Unknown error occurred' 
            };
        }
    }

    async getByKey(tenantId: string, resourceType: string, resourceId: string): Promise<{ success: boolean; data?: T | null; error?: string }> {
        try {
            const key: ProjectObjectKey = { tenantId, resourceType, resourceId };
            const result = await this.useCase.getObject(key);
            return { success: true, data: result };
        } catch (error) {
            return { 
                success: false, 
                error: error instanceof Error ? error.message : 'Unknown error occurred' 
            };
        }
    }

    async search(
        condition: SearchOption<T>, 
        pagination?: PaginationOption<T>
    ): Promise<{ success: boolean; data?: { results: T[], total: number }; error?: string }> {
        try {
            const result = await this.useCase.searchObjects(condition, pagination || {});
            return { success: true, data: result };
        } catch (error) {
            return { 
                success: false, 
                error: error instanceof Error ? error.message : 'Unknown error occurred' 
            };
        }
    }

    async exists(condition: SearchOption<T>): Promise<{ success: boolean; data?: boolean; error?: string }> {
        try {
            const result = await this.useCase.objectExists(condition);
            return { success: true, data: result };
        } catch (error) {
            return { 
                success: false, 
                error: error instanceof Error ? error.message : 'Unknown error occurred' 
            };
        }
    }

    async count(condition: SearchOption<T>): Promise<{ success: boolean; data?: number; error?: string }> {
        try {
            const result = await this.useCase.countObjects(condition);
            return { success: true, data: result };
        } catch (error) {
            return { 
                success: false, 
                error: error instanceof Error ? error.message : 'Unknown error occurred' 
            };
        }
    }
}