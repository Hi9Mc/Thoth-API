"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProjectObjectController = void 0;
/**
 * Controller for handling ProjectObject operations
 * This is part of the Interface Adapters layer in Clean Architecture
 */
class ProjectObjectController {
    constructor(useCase) {
        this.useCase = useCase;
    }
    async create(obj) {
        try {
            const result = await this.useCase.createObject(obj);
            return { success: true, data: result };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error occurred'
            };
        }
    }
    async update(obj) {
        try {
            const result = await this.useCase.updateObject(obj);
            return { success: true, data: result };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error occurred'
            };
        }
    }
    async delete(tenantId, resourceType, resourceId, version) {
        try {
            const key = { tenantId, resourceType, resourceId, version };
            const result = await this.useCase.deleteObject(key);
            return { success: result };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error occurred'
            };
        }
    }
    async getByKey(tenantId, resourceType, resourceId, version) {
        try {
            const key = { tenantId, resourceType, resourceId, version };
            const result = await this.useCase.getObject(key);
            return { success: true, data: result };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error occurred'
            };
        }
    }
    async search(condition, pagination) {
        try {
            const result = await this.useCase.searchObjects(condition, pagination || {});
            return { success: true, data: result };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error occurred'
            };
        }
    }
    async exists(condition) {
        try {
            const result = await this.useCase.objectExists(condition);
            return { success: true, data: result };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error occurred'
            };
        }
    }
    async count(condition) {
        try {
            const result = await this.useCase.countObjects(condition);
            return { success: true, data: result };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error occurred'
            };
        }
    }
}
exports.ProjectObjectController = ProjectObjectController;
