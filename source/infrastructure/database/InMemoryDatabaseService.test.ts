/**
 * @jest-environment node
 */
import { InMemoryDatabaseService } from './InMemoryDatabaseService';
import { ProjectObject, SearchConditionOperator, SearchLogicalOperator, SearchOption, PaginationOption, SortDirection } from './IDatabaseService';
import '@jest/globals';
import 'jest';

describe('InMemoryDatabaseService', () => {
  let db: InMemoryDatabaseService<ProjectObject>;
  const obj1: ProjectObject = { tenantId: 'p1', resourceType: 'typeA', resourceId: 'c1', version: 1, name: 'Alpha' };
  const obj2: ProjectObject = { tenantId: 'p1', resourceType: 'typeA', resourceId: 'c2', version: 1, name: 'Beta' };
  const obj3: ProjectObject = { tenantId: 'p2', resourceType: 'typeB', resourceId: 'c3', version: 2, name: 'Gamma' };

  beforeEach(async () => {
    db = new InMemoryDatabaseService<ProjectObject>();
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
    expect(found?.name).toBe('AlphaX');
  });

  it('should delete', async () => {
    const result = await db.delete('p1', 'typeA', 'c1', 1);
    expect(result).toBe(true);
    const found = await db.getByKey('p1', 'typeA', 'c1', 1);
    expect(found).toBeNull();
  });

  it('should search with AND condition', async () => {
    const condition: SearchOption<ProjectObject> = {
      logic: SearchLogicalOperator.AND,
      conditions: [
        { key: 'tenantId', value: 'p1', operator: SearchConditionOperator.EQUALS },
        { key: 'resourceType', value: 'typeA', operator: SearchConditionOperator.EQUALS },
      ],
    };
    const pagination: PaginationOption<ProjectObject> = { page: 1, limit: 10 };
    const { results, total } = await db.search(condition, pagination);
    expect(total).toBe(2);
    expect(results).toEqual(expect.arrayContaining([obj1, obj2]));
  });

  it('should search with OR condition', async () => {
    const condition: SearchOption<ProjectObject> = {
      logic: SearchLogicalOperator.OR,
      conditions: [
        { key: 'resourceId', value: 'c1', operator: SearchConditionOperator.EQUALS },
        { key: 'resourceId', value: 'c3', operator: SearchConditionOperator.EQUALS },
      ],
    };
    const pagination: PaginationOption<ProjectObject> = { page: 1, limit: 10 };
    const { results, total } = await db.search(condition, pagination);
    expect(total).toBe(2);
    expect(results).toEqual(expect.arrayContaining([obj1, obj3]));
  });

  it('should support exists and count', async () => {
    const condition: SearchOption<ProjectObject> = {
      logic: SearchLogicalOperator.AND,
      conditions: [
        { key: 'tenantId', value: 'p2', operator: SearchConditionOperator.EQUALS },
      ],
    };
    expect(await db.exists(condition)).toBe(true);
    expect(await db.count(condition)).toBe(1);
  });

  it('should support pagination and sorting', async () => {
    const condition: SearchOption<ProjectObject> = {
      logic: SearchLogicalOperator.OR,
      conditions: [
        { key: 'tenantId', value: 'p1', operator: SearchConditionOperator.EQUALS },
        { key: 'tenantId', value: 'p2', operator: SearchConditionOperator.EQUALS },
      ],
    };
    const pagination: PaginationOption<ProjectObject> = { page: 1, limit: 2, sortBy: 'name', sortDirection: SortDirection.ASC };
    const { results, total } = await db.search(condition, pagination);
    expect(total).toBe(3);
    expect(results.length).toBe(2);
    expect(results[0].name < results[1].name).toBe(true);
  });

  // Logic test: Nested AND/OR
  it('should handle nested AND/OR logic in search', async () => {
    const condition: SearchOption<ProjectObject> = {
      logic: SearchLogicalOperator.OR,
      conditions: [
        {
          logic: SearchLogicalOperator.AND,
          conditions: [
            { key: 'tenantId', value: 'p1', operator: SearchConditionOperator.EQUALS },
            { key: 'name', value: 'Alpha', operator: SearchConditionOperator.EQUALS },
          ],
        },
        { key: 'resourceId', value: 'c3', operator: SearchConditionOperator.EQUALS },
      ],
    };
    const pagination: PaginationOption<ProjectObject> = { page: 1, limit: 10 };
    const { results, total } = await db.search(condition, pagination);
    expect(total).toBe(2);
    expect(results).toEqual(expect.arrayContaining([obj1, obj3]));
  });

  // Performance test: Insert and search 10,000 records
  it('should perform search efficiently with 10,000 records', async () => {
    const manyObjs: ProjectObject[] = Array.from({ length: 10000 }, (_, i) => ({
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
    const condition: SearchOption<ProjectObject> = {
      logic: SearchLogicalOperator.AND,
      conditions: [
        { key: 'tenantId', value: 'pX', operator: SearchConditionOperator.EQUALS },
        { key: 'name', value: 'Name9999', operator: SearchConditionOperator.EQUALS },
      ],
    };
    const pagination: PaginationOption<ProjectObject> = { page: 1, limit: 1 };
    const { results, total } = await db.search(condition, pagination);
    const duration = Date.now() - start;
    expect(total).toBe(1);
    expect(results[0].name).toBe('Name9999');
    // Performance: should finish within 500ms
    expect(duration).toBeLessThan(500);
  });
});
