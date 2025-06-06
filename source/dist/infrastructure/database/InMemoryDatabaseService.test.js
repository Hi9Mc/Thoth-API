"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * @jest-environment node
 */
const InMemoryDatabaseService_1 = require("./InMemoryDatabaseService");
const IDatabaseService_1 = require("./IDatabaseService");
require("@jest/globals");
require("jest");
describe('InMemoryDatabaseService', () => {
    let db;
    const obj1 = { tenantId: 'p1', resourceType: 'typeA', resourceId: 'c1', version: 1, name: 'Alpha' };
    const obj2 = { tenantId: 'p1', resourceType: 'typeA', resourceId: 'c2', version: 1, name: 'Beta' };
    const obj3 = { tenantId: 'p2', resourceType: 'typeB', resourceId: 'c3', version: 2, name: 'Gamma' };
    beforeEach(async () => {
        db = new InMemoryDatabaseService_1.InMemoryDatabaseService();
        await db.create(obj1);
        await db.create(obj2);
        await db.create(obj3);
    });
    it('should create and getByKey', async () => {
        const found = await db.getByKey('p1', 'typeA', 'c1', 1);
        expect(found).toEqual(obj1);
    });
    it('should update', async () => {
        const updated = { ...obj1, name: 'AlphaX' };
        await db.update(updated);
        const found = await db.getByKey('p1', 'typeA', 'c1', 1);
        expect(found === null || found === void 0 ? void 0 : found.name).toBe('AlphaX');
    });
    it('should delete', async () => {
        const result = await db.delete('p1', 'typeA', 'c1', 1);
        expect(result).toBe(true);
        const found = await db.getByKey('p1', 'typeA', 'c1', 1);
        expect(found).toBeNull();
    });
    it('should search with AND condition', async () => {
        const condition = {
            logic: IDatabaseService_1.SearchLogicalOperator.AND,
            conditions: [
                { key: 'tenantId', value: 'p1', operator: IDatabaseService_1.SearchConditionOperator.EQUALS },
                { key: 'resourceType', value: 'typeA', operator: IDatabaseService_1.SearchConditionOperator.EQUALS },
            ],
        };
        const pagination = { page: 1, limit: 10 };
        const { results, total } = await db.search(condition, pagination);
        expect(total).toBe(2);
        expect(results).toEqual(expect.arrayContaining([obj1, obj2]));
    });
    it('should search with OR condition', async () => {
        const condition = {
            logic: IDatabaseService_1.SearchLogicalOperator.OR,
            conditions: [
                { key: 'resourceId', value: 'c1', operator: IDatabaseService_1.SearchConditionOperator.EQUALS },
                { key: 'resourceId', value: 'c3', operator: IDatabaseService_1.SearchConditionOperator.EQUALS },
            ],
        };
        const pagination = { page: 1, limit: 10 };
        const { results, total } = await db.search(condition, pagination);
        expect(total).toBe(2);
        expect(results).toEqual(expect.arrayContaining([obj1, obj3]));
    });
    it('should support exists and count', async () => {
        const condition = {
            logic: IDatabaseService_1.SearchLogicalOperator.AND,
            conditions: [
                { key: 'tenantId', value: 'p2', operator: IDatabaseService_1.SearchConditionOperator.EQUALS },
            ],
        };
        expect(await db.exists(condition)).toBe(true);
        expect(await db.count(condition)).toBe(1);
    });
    it('should support pagination and sorting', async () => {
        const condition = {
            logic: IDatabaseService_1.SearchLogicalOperator.OR,
            conditions: [
                { key: 'tenantId', value: 'p1', operator: IDatabaseService_1.SearchConditionOperator.EQUALS },
                { key: 'tenantId', value: 'p2', operator: IDatabaseService_1.SearchConditionOperator.EQUALS },
            ],
        };
        const pagination = { page: 1, limit: 2, sortBy: 'name', sortDirection: IDatabaseService_1.SortDirection.ASC };
        const { results, total } = await db.search(condition, pagination);
        expect(total).toBe(3);
        expect(results.length).toBe(2);
        expect(results[0].name < results[1].name).toBe(true);
    });
    // Logic test: Nested AND/OR
    it('should handle nested AND/OR logic in search', async () => {
        const condition = {
            logic: IDatabaseService_1.SearchLogicalOperator.OR,
            conditions: [
                {
                    logic: IDatabaseService_1.SearchLogicalOperator.AND,
                    conditions: [
                        { key: 'tenantId', value: 'p1', operator: IDatabaseService_1.SearchConditionOperator.EQUALS },
                        { key: 'name', value: 'Alpha', operator: IDatabaseService_1.SearchConditionOperator.EQUALS },
                    ],
                },
                { key: 'resourceId', value: 'c3', operator: IDatabaseService_1.SearchConditionOperator.EQUALS },
            ],
        };
        const pagination = { page: 1, limit: 10 };
        const { results, total } = await db.search(condition, pagination);
        expect(total).toBe(2);
        expect(results).toEqual(expect.arrayContaining([obj1, obj3]));
    });
    // Performance test: Insert and search 10,000 records
    it('should perform search efficiently with 10,000 records', async () => {
        const manyObjs = Array.from({ length: 10000 }, (_, i) => ({
            tenantId: 'pX',
            resourceType: 'typeP',
            resourceId: `c${i + 10}`,
            version: 1,
            name: `Name${i}`,
        }));
        for (const obj of manyObjs) {
            await db.create(obj);
        }
        const start = Date.now();
        const condition = {
            logic: IDatabaseService_1.SearchLogicalOperator.AND,
            conditions: [
                { key: 'tenantId', value: 'pX', operator: IDatabaseService_1.SearchConditionOperator.EQUALS },
                { key: 'name', value: 'Name9999', operator: IDatabaseService_1.SearchConditionOperator.EQUALS },
            ],
        };
        const pagination = { page: 1, limit: 1 };
        const { results, total } = await db.search(condition, pagination);
        const duration = Date.now() - start;
        expect(total).toBe(1);
        expect(results[0].name).toBe('Name9999');
        // Performance: should finish within 500ms
        expect(duration).toBeLessThan(500);
    });
});
