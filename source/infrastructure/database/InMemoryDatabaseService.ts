import {
  IDatabaseService,
  IDatabaseServiceConstructor,
  ProjectObject,
  SearchConditionOperator,
  SearchLogicalOperator,
  SearchOption,
  PaginationOption,
  SearchParameter
} from './IDatabaseService';

function matchCondition<T>(item: T, param: SearchParameter<T>): boolean {
  const value = item[param.key];
  const condValue = param.value;
  switch (param.operator) {
    case SearchConditionOperator.EQUALS:
      return value === condValue;
    case SearchConditionOperator.NOT_EQUALS:
      return value !== condValue;
    case SearchConditionOperator.GREATER_THAN:
      return value > condValue;
    case SearchConditionOperator.GREATER_THAN_OR_EQUAL:
      return value >= condValue;
    case SearchConditionOperator.LESS_THAN:
      return value < condValue;
    case SearchConditionOperator.LESS_THAN_OR_EQUAL:
      return value <= condValue;
    case SearchConditionOperator.LIKE:
      return typeof value === 'string' && typeof condValue === 'string' && value.includes(condValue);
    case SearchConditionOperator.NOT_LIKE:
      return typeof value === 'string' && typeof condValue === 'string' && !value.includes(condValue);
    case SearchConditionOperator.IN:
      return Array.isArray(condValue) && condValue.includes(value as any);
    case SearchConditionOperator.NOT_IN:
      return Array.isArray(condValue) && !condValue.includes(value as any);
    case SearchConditionOperator.BETWEEN:
      return Array.isArray(condValue) && value >= condValue[0] && value <= condValue[1];
    default:
      return false;
  }
}

function matchOption<T>(item: T, option: SearchOption<T>): boolean {
  if (!option.conditions.length) return true;
  if (option.logic === SearchLogicalOperator.AND) {
    return option.conditions.every(cond =>
      'key' in cond ? matchCondition(item, cond) : matchOption(item, cond)
    );
  } else {
    return option.conditions.some(cond =>
      'key' in cond ? matchCondition(item, cond) : matchOption(item, cond)
    );
  }
}

export class InMemoryDatabaseService<T extends ProjectObject = ProjectObject> implements IDatabaseService<T> {
  private data: T[] = [];

  create(obj: T): Promise<T> {
    // Check if object already exists (by key without version)
    const existing = this.data.find(
      o => o.tenantId === obj.tenantId && o.resourceType === obj.resourceType && o.resourceId === obj.resourceId
    );
    if (existing) {
      throw new Error('Object already exists');
    }
    
    // Ensure version is 1 for new objects
    const newObj = { ...obj, version: 1 } as T;
    this.data.push(newObj);
    return Promise.resolve(newObj);
  }

  update(obj: T): Promise<T> {
    const existingIndex = this.data.findIndex(
      o => o.tenantId === obj.tenantId && o.resourceType === obj.resourceType && o.resourceId === obj.resourceId
    );
    
    if (existingIndex === -1) {
      throw new Error('Object not found');
    }
    
    const existing = this.data[existingIndex];
    
    // Optimistic locking: check version
    if (obj.version !== existing.version + 1) {
      throw new Error(`Version mismatch. Expected ${existing.version + 1}, got ${obj.version}`);
    }
    
    // Update the object with incremented version
    this.data[existingIndex] = obj;
    return Promise.resolve(obj);
  }

  delete(tenantId: string, resourceType: string, resourceId: string): Promise<boolean> {
    const idx = this.data.findIndex(
      o => o.tenantId === tenantId && o.resourceType === resourceType && o.resourceId === resourceId
    );
    if (idx === -1) return Promise.resolve(false);
    this.data.splice(idx, 1);
    return Promise.resolve(true);
  }

  getByKey(tenantId: string, resourceType: string, resourceId: string): Promise<T | null> {
    const obj = this.data.find(
      o => o.tenantId === tenantId && o.resourceType === resourceType && o.resourceId === resourceId
    );
    return Promise.resolve(obj ?? null);
  }

  search(condition: SearchOption<T>, pagination: PaginationOption<T>): Promise<{ results: T[]; total: number }> {
    let filtered = this.data.filter(item => matchOption(item, condition));
    const total = filtered.length;
    if (pagination.sortBy) {
      filtered = filtered.sort((a, b) => {
        if (a[pagination.sortBy!] < b[pagination.sortBy!]) return pagination.sortDirection === 'DESC' ? 1 : -1;
        if (a[pagination.sortBy!] > b[pagination.sortBy!]) return pagination.sortDirection === 'DESC' ? -1 : 1;
        return 0;
      });
    }
    const page = pagination.page ?? 1;
    const limit = pagination.limit ?? 20;
    const start = (page - 1) * limit;
    const results = filtered.slice(start, start + limit);
    return Promise.resolve({ results, total });
  }

  exists(condition: SearchOption<T>): Promise<boolean> {
    return Promise.resolve(this.data.some(item => matchOption(item, condition)));
  }

  count(condition: SearchOption<T>): Promise<number> {
    return Promise.resolve(this.data.filter(item => matchOption(item, condition)).length);
  }
}
