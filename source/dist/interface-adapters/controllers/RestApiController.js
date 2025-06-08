"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RestApiController = void 0;
/**
 * REST API Controller for handling HTTP requests
 * Provides two endpoint patterns as specified in the requirements:
 * 1. /tenants/{tenantId}/resources/{resourceType}/{resourceId}
 * 2. /resources/{resourceId} with headers X-Tenant-Id and X-Resource-Type
 */
class RestApiController {
    constructor(useCase) {
        this.useCase = useCase;
    }
    /**
     * GET /tenants/{tenantId}/resources/{resourceType}/{resourceId}
     * Get a specific resource by tenant, type, and ID
     */
    async getResourceByPath(tenantId, resourceType, resourceId) {
        try {
            const key = { tenantId, resourceType, resourceId };
            const result = await this.useCase.getObject(key);
            if (result === null) {
                return { status: 404, error: 'Resource not found' };
            }
            return { status: 200, data: result };
        }
        catch (error) {
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
    async createResourceByPath(tenantId, resourceType, resourceId, body) {
        try {
            const resourceObject = {
                ...body,
                tenantId,
                resourceType,
                resourceId,
                // Version will be set to 1 in the use case
            };
            const result = await this.useCase.createObject(resourceObject);
            return { status: 201, data: result };
        }
        catch (error) {
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
    async updateResourceByPath(tenantId, resourceType, resourceId, body) {
        try {
            // Version is required in body for optimistic locking
            if (!body.version) {
                return { status: 400, error: 'Version is required for updates' };
            }
            const resourceObject = {
                ...body,
                tenantId,
                resourceType,
                resourceId,
            };
            const result = await this.useCase.updateObject(resourceObject);
            return { status: 200, data: result };
        }
        catch (error) {
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
    async deleteResourceByPath(tenantId, resourceType, resourceId) {
        try {
            const key = { tenantId, resourceType, resourceId };
            const result = await this.useCase.deleteObject(key);
            if (!result) {
                return { status: 404, error: 'Resource not found' };
            }
            return { status: 204 };
        }
        catch (error) {
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
    async getResourceByIdWithHeaders(resourceId, tenantId, resourceType) {
        try {
            const key = { tenantId, resourceType, resourceId };
            const result = await this.useCase.getObject(key);
            if (result === null) {
                return { status: 404, error: 'Resource not found' };
            }
            return { status: 200, data: result };
        }
        catch (error) {
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
    async createResourceByIdWithHeaders(resourceId, tenantId, resourceType, body) {
        try {
            const resourceObject = {
                ...body,
                tenantId,
                resourceType,
                resourceId,
                // Version will be set to 1 in the use case
            };
            const result = await this.useCase.createObject(resourceObject);
            return { status: 201, data: result };
        }
        catch (error) {
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
    async updateResourceByIdWithHeaders(resourceId, tenantId, resourceType, body) {
        try {
            // Version is required in body for optimistic locking
            if (!body.version) {
                return { status: 400, error: 'Version is required for updates' };
            }
            const resourceObject = {
                ...body,
                tenantId,
                resourceType,
                resourceId,
            };
            const result = await this.useCase.updateObject(resourceObject);
            return { status: 200, data: result };
        }
        catch (error) {
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
    async deleteResourceByIdWithHeaders(resourceId, tenantId, resourceType) {
        try {
            const key = { tenantId, resourceType, resourceId };
            const result = await this.useCase.deleteObject(key);
            if (!result) {
                return { status: 404, error: 'Resource not found' };
            }
            return { status: 204 };
        }
        catch (error) {
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
    async searchResourcesByPath(tenantId, resourceType, query = {}) {
        try {
            const condition = {
                logic: 'AND',
                conditions: [
                    { key: 'tenantId', value: tenantId, operator: '=' },
                    { key: 'resourceType', value: resourceType, operator: '=' }
                ]
            };
            const pagination = {
                page: query.page || 1,
                limit: query.limit || 20,
                sortBy: query.sortBy,
                sortDirection: query.sortDirection
            };
            const result = await this.useCase.searchObjects(condition, pagination);
            return { status: 200, data: result };
        }
        catch (error) {
            return {
                status: 500,
                error: error instanceof Error ? error.message : 'Internal server error'
            };
        }
    }
    /**
     * GET /resources/search
     * Search resources by optional headers and/or filter query
     */
    async searchResourcesByHeaders(tenantId, resourceType, resourceId, query = {}) {
        try {
            const conditions = [];
            // Add conditions based on provided headers
            if (tenantId) {
                conditions.push({ key: 'tenantId', value: tenantId, operator: '=' });
            }
            if (resourceType) {
                conditions.push({ key: 'resourceType', value: resourceType, operator: '=' });
            }
            if (resourceId) {
                conditions.push({ key: 'resourceId', value: resourceId, operator: '=' });
            }
            // Handle 'q' query parameter for text search
            if (query.q) {
                // Add a text search condition - this would need to be adapted based on your specific search implementation
                // For now, we'll search in common text fields that might exist in the data
                const textSearchConditions = [
                    { key: 'data', value: query.q, operator: 'contains' }
                ];
                conditions.push(...textSearchConditions);
            }
            const condition = conditions.length > 0 ? {
                logic: 'AND',
                conditions
            } : undefined;
            const pagination = {
                page: parseInt(query.page) || 1,
                limit: parseInt(query.limit) || 10,
                sortBy: query.sortBy,
                sortDirection: query.sortDirection
            };
            const result = await this.useCase.searchObjects(condition, pagination);
            return { status: 200, data: result };
        }
        catch (error) {
            return {
                status: 500,
                error: error instanceof Error ? error.message : 'Internal server error'
            };
        }
    }
}
exports.RestApiController = RestApiController;
