"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * @jest-environment node
 */
require("@jest/globals");
require("jest");
const SearchCriteria_1 = require("./SearchCriteria");
describe('SearchCriteria Domain Entities', () => {
    describe('SearchConditionOperator Enum', () => {
        it('should contain all standard comparison operators', () => {
            expect(SearchCriteria_1.SearchConditionOperator.EQUALS).toBe('=');
            expect(SearchCriteria_1.SearchConditionOperator.NOT_EQUALS).toBe('!=');
            expect(SearchCriteria_1.SearchConditionOperator.GREATER_THAN).toBe('>');
            expect(SearchCriteria_1.SearchConditionOperator.GREATER_THAN_OR_EQUAL).toBe('>=');
            expect(SearchCriteria_1.SearchConditionOperator.LESS_THAN).toBe('<');
            expect(SearchCriteria_1.SearchConditionOperator.LESS_THAN_OR_EQUAL).toBe('<=');
        });
        it('should contain pattern matching operators', () => {
            expect(SearchCriteria_1.SearchConditionOperator.LIKE).toBe('LIKE');
            expect(SearchCriteria_1.SearchConditionOperator.NOT_LIKE).toBe('NOT LIKE');
        });
        it('should contain set operators', () => {
            expect(SearchCriteria_1.SearchConditionOperator.IN).toBe('IN');
            expect(SearchCriteria_1.SearchConditionOperator.NOT_IN).toBe('NOT IN');
        });
        it('should contain range operator', () => {
            expect(SearchCriteria_1.SearchConditionOperator.BETWEEN).toBe('BETWEEN');
        });
        it('should have exactly 11 operators', () => {
            const operators = Object.values(SearchCriteria_1.SearchConditionOperator);
            expect(operators).toHaveLength(11);
        });
    });
    describe('SearchLogicalOperator Enum', () => {
        it('should contain AND operator', () => {
            expect(SearchCriteria_1.SearchLogicalOperator.AND).toBe('AND');
        });
        it('should contain OR operator', () => {
            expect(SearchCriteria_1.SearchLogicalOperator.OR).toBe('OR');
        });
        it('should have exactly 2 logical operators', () => {
            const operators = Object.values(SearchCriteria_1.SearchLogicalOperator);
            expect(operators).toHaveLength(2);
        });
    });
    describe('SortDirection Enum', () => {
        it('should contain ascending direction', () => {
            expect(SearchCriteria_1.SortDirection.ASC).toBe('ASC');
        });
        it('should contain descending direction', () => {
            expect(SearchCriteria_1.SortDirection.DESC).toBe('DESC');
        });
        it('should have exactly 2 sort directions', () => {
            const directions = Object.values(SearchCriteria_1.SortDirection);
            expect(directions).toHaveLength(2);
        });
    });
    describe('SearchParameter Interface', () => {
        it('should support string value searches', () => {
            const parameter = {
                key: 'name',
                value: 'John Doe',
                operator: SearchCriteria_1.SearchConditionOperator.EQUALS
            };
            expect(parameter.key).toBe('name');
            expect(parameter.value).toBe('John Doe');
            expect(parameter.operator).toBe(SearchCriteria_1.SearchConditionOperator.EQUALS);
        });
        it('should support number value searches', () => {
            const parameter = {
                key: 'age',
                value: 25,
                operator: SearchCriteria_1.SearchConditionOperator.GREATER_THAN
            };
            expect(parameter.key).toBe('age');
            expect(parameter.value).toBe(25);
            expect(parameter.operator).toBe(SearchCriteria_1.SearchConditionOperator.GREATER_THAN);
        });
        it('should support boolean value searches', () => {
            const parameter = {
                key: 'active',
                value: true,
                operator: SearchCriteria_1.SearchConditionOperator.EQUALS
            };
            expect(parameter.key).toBe('active');
            expect(parameter.value).toBe(true);
            expect(parameter.operator).toBe(SearchCriteria_1.SearchConditionOperator.EQUALS);
        });
        it('should support array value searches', () => {
            const parameter = {
                key: 'age',
                value: [18, 25, 30],
                operator: SearchCriteria_1.SearchConditionOperator.IN
            };
            expect(parameter.key).toBe('age');
            expect(Array.isArray(parameter.value)).toBe(true);
            expect(parameter.value).toEqual([18, 25, 30]);
            expect(parameter.operator).toBe(SearchCriteria_1.SearchConditionOperator.IN);
        });
        it('should support mixed array value searches', () => {
            const parameter = {
                key: 'name',
                value: ['John', 'Jane', 'Bob'],
                operator: SearchCriteria_1.SearchConditionOperator.NOT_IN
            };
            expect(parameter.key).toBe('name');
            expect(Array.isArray(parameter.value)).toBe(true);
            expect(parameter.value).toEqual(['John', 'Jane', 'Bob']);
            expect(parameter.operator).toBe(SearchCriteria_1.SearchConditionOperator.NOT_IN);
        });
    });
    describe('SearchOption Type', () => {
        it('should support simple parameter conditions', () => {
            const searchOption = {
                logic: SearchCriteria_1.SearchLogicalOperator.AND,
                conditions: [
                    {
                        key: 'name',
                        value: 'John',
                        operator: SearchCriteria_1.SearchConditionOperator.EQUALS
                    },
                    {
                        key: 'age',
                        value: 25,
                        operator: SearchCriteria_1.SearchConditionOperator.GREATER_THAN
                    }
                ]
            };
            expect(searchOption.logic).toBe(SearchCriteria_1.SearchLogicalOperator.AND);
            expect(searchOption.conditions).toHaveLength(2);
            expect(searchOption.conditions[0]).toHaveProperty('key', 'name');
            expect(searchOption.conditions[1]).toHaveProperty('key', 'age');
        });
        it('should support nested search options', () => {
            const nestedOption = {
                logic: SearchCriteria_1.SearchLogicalOperator.OR,
                conditions: [
                    {
                        key: 'name',
                        value: 'John',
                        operator: SearchCriteria_1.SearchConditionOperator.EQUALS
                    },
                    {
                        key: 'name',
                        value: 'Jane',
                        operator: SearchCriteria_1.SearchConditionOperator.EQUALS
                    }
                ]
            };
            const mainOption = {
                logic: SearchCriteria_1.SearchLogicalOperator.AND,
                conditions: [
                    {
                        key: 'active',
                        value: true,
                        operator: SearchCriteria_1.SearchConditionOperator.EQUALS
                    },
                    nestedOption
                ]
            };
            expect(mainOption.logic).toBe(SearchCriteria_1.SearchLogicalOperator.AND);
            expect(mainOption.conditions).toHaveLength(2);
            expect(mainOption.conditions[1]).toEqual(nestedOption);
        });
        it('should support complex nested structures', () => {
            const deeplyNested = {
                logic: SearchCriteria_1.SearchLogicalOperator.AND,
                conditions: [
                    {
                        logic: SearchCriteria_1.SearchLogicalOperator.OR,
                        conditions: [
                            {
                                key: 'age',
                                value: [18, 25],
                                operator: SearchCriteria_1.SearchConditionOperator.IN
                            },
                            {
                                key: 'age',
                                value: 65,
                                operator: SearchCriteria_1.SearchConditionOperator.GREATER_THAN
                            }
                        ]
                    },
                    {
                        logic: SearchCriteria_1.SearchLogicalOperator.AND,
                        conditions: [
                            {
                                key: 'active',
                                value: true,
                                operator: SearchCriteria_1.SearchConditionOperator.EQUALS
                            },
                            {
                                key: 'name',
                                value: 'test%',
                                operator: SearchCriteria_1.SearchConditionOperator.LIKE
                            }
                        ]
                    }
                ]
            };
            expect(deeplyNested.logic).toBe(SearchCriteria_1.SearchLogicalOperator.AND);
            expect(deeplyNested.conditions).toHaveLength(2);
            const firstCondition = deeplyNested.conditions[0];
            expect(firstCondition.logic).toBe(SearchCriteria_1.SearchLogicalOperator.OR);
            expect(firstCondition.conditions).toHaveLength(2);
        });
    });
    describe('PaginationOption Interface', () => {
        it('should support basic pagination', () => {
            const pagination = {
                page: 1,
                limit: 10
            };
            expect(pagination.page).toBe(1);
            expect(pagination.limit).toBe(10);
            expect(pagination.sortBy).toBeUndefined();
            expect(pagination.sortDirection).toBeUndefined();
        });
        it('should support sorting options', () => {
            const pagination = {
                page: 2,
                limit: 20,
                sortBy: 'name',
                sortDirection: SearchCriteria_1.SortDirection.ASC
            };
            expect(pagination.page).toBe(2);
            expect(pagination.limit).toBe(20);
            expect(pagination.sortBy).toBe('name');
            expect(pagination.sortDirection).toBe(SearchCriteria_1.SortDirection.ASC);
        });
        it('should support different sort fields', () => {
            const paginationByAge = {
                sortBy: 'age',
                sortDirection: SearchCriteria_1.SortDirection.DESC
            };
            const paginationByDate = {
                sortBy: 'createdAt',
                sortDirection: SearchCriteria_1.SortDirection.ASC
            };
            expect(paginationByAge.sortBy).toBe('age');
            expect(paginationByAge.sortDirection).toBe(SearchCriteria_1.SortDirection.DESC);
            expect(paginationByDate.sortBy).toBe('createdAt');
            expect(paginationByDate.sortDirection).toBe(SearchCriteria_1.SortDirection.ASC);
        });
        it('should allow partial options', () => {
            const pageOnly = {
                page: 5
            };
            const limitOnly = {
                limit: 50
            };
            const sortOnly = {
                sortBy: 'name',
                sortDirection: SearchCriteria_1.SortDirection.DESC
            };
            expect(pageOnly.page).toBe(5);
            expect(pageOnly.limit).toBeUndefined();
            expect(limitOnly.limit).toBe(50);
            expect(limitOnly.page).toBeUndefined();
            expect(sortOnly.sortBy).toBe('name');
            expect(sortOnly.sortDirection).toBe(SearchCriteria_1.SortDirection.DESC);
            expect(sortOnly.page).toBeUndefined();
            expect(sortOnly.limit).toBeUndefined();
        });
        it('should support empty pagination options', () => {
            const empty = {};
            expect(empty.page).toBeUndefined();
            expect(empty.limit).toBeUndefined();
            expect(empty.sortBy).toBeUndefined();
            expect(empty.sortDirection).toBeUndefined();
        });
    });
    describe('Type Safety and Integration', () => {
        it('should enforce type safety across all interfaces', () => {
            const searchParameter = {
                key: 'name', // Must be keyof TestObject
                value: 'John',
                operator: SearchCriteria_1.SearchConditionOperator.EQUALS
            };
            const searchOption = {
                logic: SearchCriteria_1.SearchLogicalOperator.AND,
                conditions: [searchParameter]
            };
            const pagination = {
                page: 1,
                limit: 10,
                sortBy: 'age', // Must be keyof TestObject
                sortDirection: SearchCriteria_1.SortDirection.DESC
            };
            expect(searchParameter.key).toBe('name');
            expect(searchOption.conditions[0]).toEqual(searchParameter);
            expect(pagination.sortBy).toBe('age');
        });
        it('should work with complex search scenarios', () => {
            const complexSearch = {
                logic: SearchCriteria_1.SearchLogicalOperator.AND,
                conditions: [
                    {
                        key: 'active',
                        value: true,
                        operator: SearchCriteria_1.SearchConditionOperator.EQUALS
                    },
                    {
                        logic: SearchCriteria_1.SearchLogicalOperator.OR,
                        conditions: [
                            {
                                key: 'age',
                                value: [18, 25, 30],
                                operator: SearchCriteria_1.SearchConditionOperator.IN
                            },
                            {
                                key: 'name',
                                value: 'Admin%',
                                operator: SearchCriteria_1.SearchConditionOperator.LIKE
                            }
                        ]
                    }
                ]
            };
            const complexPagination = {
                page: 1,
                limit: 100,
                sortBy: 'name',
                sortDirection: SearchCriteria_1.SortDirection.ASC
            };
            expect(complexSearch.logic).toBe(SearchCriteria_1.SearchLogicalOperator.AND);
            expect(complexSearch.conditions).toHaveLength(2);
            expect(complexPagination.limit).toBe(100);
            expect(complexPagination.sortBy).toBe('name');
        });
    });
});
