import { ProjectObject, ProjectObjectKey } from '../../domain/entities/ProjectObject';
import { SearchOption, PaginationOption } from '../../domain/entities/SearchCriteria';
import { ProjectObjectUseCase } from '../../application/use-cases/ProjectObjectUseCase';

/**
 * REST API Controller for handling HTTP requests
 * Provides two endpoint patterns as specified in the requirements:
 * 1. /tenants/{tenantId}/resources/{resourceType}/{resourceId}
 * 2. /resources/{resourceId} with headers X-Tenant-Id and X-Resource-Type
 */
export class RestApiController<T extends ProjectObject = ProjectObject> {
    constructor(private useCase: ProjectObjectUseCase<T>) {}

    /**
     * GET /tenants/{tenantId}/resources/{resourceType}/{resourceId}
     * Get a specific resource by tenant, type, and ID
     */
    async getResourceByPath(tenantId: string, resourceType: string, resourceId: string): Promise<{ 
        status: number; 
        data?: T | null; 
        error?: string 
    }> {
        try {
            const key: ProjectObjectKey = { tenantId, resourceType, resourceId };
            const result = await this.useCase.getObject(key);
            
            if (result === null) {
                return { status: 404, error: 'Resource not found' };
            }
            
            return { status: 200, data: result };
        } catch (error) {
            return { 
                status: 500, 
                error: error instanceof Error ? error.message : 'Internal server error' 
            };
        }
    }

    /**
     * POST /tenants/{tenantId}/resources/{resourceType}/{resourceId}
     * Create a new resource
     */
    async createResourceByPath(tenantId: string, resourceType: string, resourceId: string, body: Partial<T>): Promise<{ 
        status: number; 
        data?: T; 
        error?: string 
    }> {
        try {
            const resourceObject: T = {
                ...body,
                tenantId,
                resourceType,
                resourceId,
                // Version will be set to 1 in the use case
            } as T;

            const result = await this.useCase.createObject(resourceObject);
            return { status: 201, data: result };
        } catch (error) {
            return { 
                status: 400, 
                error: error instanceof Error ? error.message : 'Bad request' 
            };
        }
    }

    /**
     * PUT /tenants/{tenantId}/resources/{resourceType}/{resourceId}
     * Update an existing resource
     */
    async updateResourceByPath(tenantId: string, resourceType: string, resourceId: string, body: Partial<T>): Promise<{ 
        status: number; 
        data?: T; 
        error?: string 
    }> {
        try {
            // Version is required in body for optimistic locking
            if (!(body as any).version) {
                return { status: 400, error: 'Version is required for updates' };
            }
            
            const resourceObject: T = {
                ...body,
                tenantId,
                resourceType,
                resourceId,
            } as T;

            const result = await this.useCase.updateObject(resourceObject);
            return { status: 200, data: result };
        } catch (error) {
            if (error instanceof Error && error.message.includes('not found')) {
                return { status: 404, error: error.message };
            }
            if (error instanceof Error && error.message.includes('Version mismatch')) {
                return { status: 409, error: error.message };
            }
            return { 
                status: 400, 
                error: error instanceof Error ? error.message : 'Bad request' 
            };
        }
    }

    /**
     * DELETE /tenants/{tenantId}/resources/{resourceType}/{resourceId}
     * Delete a resource
     */
    async deleteResourceByPath(tenantId: string, resourceType: string, resourceId: string): Promise<{ 
        status: number; 
        error?: string 
    }> {
        try {
            const key: ProjectObjectKey = { tenantId, resourceType, resourceId };
            const result = await this.useCase.deleteObject(key);
            
            if (!result) {
                return { status: 404, error: 'Resource not found' };
            }
            
            return { status: 204 };
        } catch (error) {
            return { 
                status: 500, 
                error: error instanceof Error ? error.message : 'Internal server error' 
            };
        }
    }

    /**
     * GET /resources/{resourceId}
     * Get resource by ID with tenant context in headers
     */
    async getResourceByIdWithHeaders(resourceId: string, tenantId: string, resourceType: string): Promise<{ 
        status: number; 
        data?: T | null; 
        error?: string 
    }> {
        try {
            const key: ProjectObjectKey = { tenantId, resourceType, resourceId };
            const result = await this.useCase.getObject(key);
            
            if (result === null) {
                return { status: 404, error: 'Resource not found' };
            }
            
            return { status: 200, data: result };
        } catch (error) {
            return { 
                status: 500, 
                error: error instanceof Error ? error.message : 'Internal server error' 
            };
        }
    }

    /**
     * POST /resources/{resourceId}
     * Create resource by ID with tenant context in headers
     */
    async createResourceByIdWithHeaders(resourceId: string, tenantId: string, resourceType: string, body: Partial<T>): Promise<{ 
        status: number; 
        data?: T; 
        error?: string 
    }> {
        try {
            const resourceObject: T = {
                ...body,
                tenantId,
                resourceType,
                resourceId,
                // Version will be set to 1 in the use case
            } as T;

            const result = await this.useCase.createObject(resourceObject);
            return { status: 201, data: result };
        } catch (error) {
            return { 
                status: 400, 
                error: error instanceof Error ? error.message : 'Bad request' 
            };
        }
    }

    /**
     * PUT /resources/{resourceId}
     * Update resource by ID with tenant context in headers
     */
    async updateResourceByIdWithHeaders(resourceId: string, tenantId: string, resourceType: string, body: Partial<T>): Promise<{ 
        status: number; 
        data?: T; 
        error?: string 
    }> {
        try {
            // Version is required in body for optimistic locking
            if (!(body as any).version) {
                return { status: 400, error: 'Version is required for updates' };
            }
            
            const resourceObject: T = {
                ...body,
                tenantId,
                resourceType,
                resourceId,
            } as T;

            const result = await this.useCase.updateObject(resourceObject);
            return { status: 200, data: result };
        } catch (error) {
            if (error instanceof Error && error.message.includes('not found')) {
                return { status: 404, error: error.message };
            }
            if (error instanceof Error && error.message.includes('Version mismatch')) {
                return { status: 409, error: error.message };
            }
            return { 
                status: 400, 
                error: error instanceof Error ? error.message : 'Bad request' 
            };
        }
    }

    /**
     * DELETE /resources/{resourceId}
     * Delete resource by ID with tenant context in headers
     */
    async deleteResourceByIdWithHeaders(resourceId: string, tenantId: string, resourceType: string): Promise<{ 
        status: number; 
        error?: string 
    }> {
        try {
            const key: ProjectObjectKey = { tenantId, resourceType, resourceId };
            const result = await this.useCase.deleteObject(key);
            
            if (!result) {
                return { status: 404, error: 'Resource not found' };
            }
            
            return { status: 204 };
        } catch (error) {
            return { 
                status: 500, 
                error: error instanceof Error ? error.message : 'Internal server error' 
            };
        }
    }

    /**
     * GET /tenants/{tenantId}/resources/{resourceType}
     * Search resources by tenant and type
     */
    async searchResourcesByPath(tenantId: string, resourceType: string, query: any = {}): Promise<{ 
        status: number; 
        data?: { results: T[], total: number }; 
        error?: string 
    }> {
        try {
            const condition: SearchOption<T> = {
                logic: 'AND' as any,
                conditions: [
                    { key: 'tenantId', value: tenantId, operator: '=' as any },
                    { key: 'resourceType', value: resourceType, operator: '=' as any }
                ]
            };

            const pagination: PaginationOption<T> = {
                page: query.page || 1,
                limit: query.limit || 20,
                sortBy: query.sortBy,
                sortDirection: query.sortDirection
            };

            const result = await this.useCase.searchObjects(condition, pagination);
            return { status: 200, data: result };
        } catch (error) {
            return { 
                status: 500, 
                error: error instanceof Error ? error.message : 'Internal server error' 
            };
        }
    }
}