"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DatabaseRepositoryAdapter = void 0;
/**
 * Adapter that converts the domain repository interface to the legacy database service interface
 * This implements the Adapter pattern to bridge the Clean Architecture domain layer
 * with the existing database infrastructure
 */
class DatabaseRepositoryAdapter {
    constructor(databaseService) {
        this.databaseService = databaseService;
    }
    async create(obj) {
        return this.databaseService.create(obj);
    }
    async update(obj) {
        return this.databaseService.update(obj);
    }
    async delete(key) {
        return this.databaseService.delete(key.tenantId, key.resourceType, key.resourceId, key.version);
    }
    async findByKey(key) {
        return this.databaseService.getByKey(key.tenantId, key.resourceType, key.resourceId, key.version);
    }
    async search(condition, pagination) {
        return this.databaseService.search(condition, pagination);
    }
    async exists(condition) {
        return this.databaseService.exists(condition);
    }
    async count(condition) {
        return this.databaseService.count(condition);
    }
}
exports.DatabaseRepositoryAdapter = DatabaseRepositoryAdapter;
