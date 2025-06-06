"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InMemoryDatabaseService = void 0;
const IDatabaseService_1 = require("./IDatabaseService");
function matchCondition(item, param) {
    const value = item[param.key];
    const condValue = param.value;
    switch (param.operator) {
        case IDatabaseService_1.SearchConditionOperator.EQUALS:
            return value === condValue;
        case IDatabaseService_1.SearchConditionOperator.NOT_EQUALS:
            return value !== condValue;
        case IDatabaseService_1.SearchConditionOperator.GREATER_THAN:
            return value > condValue;
        case IDatabaseService_1.SearchConditionOperator.GREATER_THAN_OR_EQUAL:
            return value >= condValue;
        case IDatabaseService_1.SearchConditionOperator.LESS_THAN:
            return value < condValue;
        case IDatabaseService_1.SearchConditionOperator.LESS_THAN_OR_EQUAL:
            return value <= condValue;
        case IDatabaseService_1.SearchConditionOperator.LIKE:
            return typeof value === 'string' && typeof condValue === 'string' && value.includes(condValue);
        case IDatabaseService_1.SearchConditionOperator.NOT_LIKE:
            return typeof value === 'string' && typeof condValue === 'string' && !value.includes(condValue);
        case IDatabaseService_1.SearchConditionOperator.IN:
            return Array.isArray(condValue) && condValue.includes(value);
        case IDatabaseService_1.SearchConditionOperator.NOT_IN:
            return Array.isArray(condValue) && !condValue.includes(value);
        case IDatabaseService_1.SearchConditionOperator.BETWEEN:
            return Array.isArray(condValue) && value >= condValue[0] && value <= condValue[1];
        default:
            return false;
    }
}
function matchOption(item, option) {
    if (!option.conditions.length)
        return true;
    if (option.logic === IDatabaseService_1.SearchLogicalOperator.AND) {
        return option.conditions.every(cond => 'key' in cond ? matchCondition(item, cond) : matchOption(item, cond));
    }
    else {
        return option.conditions.some(cond => 'key' in cond ? matchCondition(item, cond) : matchOption(item, cond));
    }
}
class InMemoryDatabaseService {
    constructor() {
        this.data = [];
    }
    create(obj) {
        this.data.push(obj);
        return Promise.resolve(obj);
    }
    update(obj) {
        const idx = this.data.findIndex(o => o.tenantId === obj.tenantId && o.resourceType === obj.resourceType && o.resourceId === obj.resourceId && o.version === obj.version);
        if (idx === -1)
            throw new Error('Object not found');
        this.data[idx] = obj;
        return Promise.resolve(obj);
    }
    delete(tenantId, resourceType, resourceId, version) {
        const idx = this.data.findIndex(o => o.tenantId === tenantId && o.resourceType === resourceType && o.resourceId === resourceId && o.version === version);
        if (idx === -1)
            return Promise.resolve(false);
        this.data.splice(idx, 1);
        return Promise.resolve(true);
    }
    getByKey(tenantId, resourceType, resourceId, version) {
        const obj = this.data.find(o => o.tenantId === tenantId && o.resourceType === resourceType && o.resourceId === resourceId && o.version === version);
        return Promise.resolve(obj !== null && obj !== void 0 ? obj : null);
    }
    search(condition, pagination) {
        var _a, _b;
        let filtered = this.data.filter(item => matchOption(item, condition));
        const total = filtered.length;
        if (pagination.sortBy) {
            filtered = filtered.sort((a, b) => {
                if (a[pagination.sortBy] < b[pagination.sortBy])
                    return pagination.sortDirection === 'DESC' ? 1 : -1;
                if (a[pagination.sortBy] > b[pagination.sortBy])
                    return pagination.sortDirection === 'DESC' ? -1 : 1;
                return 0;
            });
        }
        const page = (_a = pagination.page) !== null && _a !== void 0 ? _a : 1;
        const limit = (_b = pagination.limit) !== null && _b !== void 0 ? _b : 20;
        const start = (page - 1) * limit;
        const results = filtered.slice(start, start + limit);
        return Promise.resolve({ results, total });
    }
    exists(condition) {
        return Promise.resolve(this.data.some(item => matchOption(item, condition)));
    }
    count(condition) {
        return Promise.resolve(this.data.filter(item => matchOption(item, condition)).length);
    }
}
exports.InMemoryDatabaseService = InMemoryDatabaseService;
