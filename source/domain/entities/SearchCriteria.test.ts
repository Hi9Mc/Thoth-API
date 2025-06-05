/**
 * @jest-environment node
 */
import '@jest/globals';
import 'jest';
import {
    SearchConditionOperator,
    SearchLogicalOperator,
    SortDirection,
    SearchParameter,
    SearchOption,
    PaginationOption
} from './SearchCriteria';

describe('SearchCriteria Domain Entities', () => {
    describe('SearchConditionOperator Enum', () => {
        it('should contain all standard comparison operators', () => {
            expect(SearchConditionOperator.EQUALS).toBe('=');
            expect(SearchConditionOperator.NOT_EQUALS).toBe('!=');
            expect(SearchConditionOperator.GREATER_THAN).toBe('>');
            expect(SearchConditionOperator.GREATER_THAN_OR_EQUAL).toBe('>=');
            expect(SearchConditionOperator.LESS_THAN).toBe('<');
            expect(SearchConditionOperator.LESS_THAN_OR_EQUAL).toBe('<=');
        });

        it('should contain pattern matching operators', () => {
            expect(SearchConditionOperator.LIKE).toBe('LIKE');
            expect(SearchConditionOperator.NOT_LIKE).toBe('NOT LIKE');
        });

        it('should contain set operators', () => {
            expect(SearchConditionOperator.IN).toBe('IN');
            expect(SearchConditionOperator.NOT_IN).toBe('NOT IN');
        });

        it('should contain range operator', () => {
            expect(SearchConditionOperator.BETWEEN).toBe('BETWEEN');
        });

        it('should have exactly 11 operators', () => {
            const operators = Object.values(SearchConditionOperator);
            expect(operators).toHaveLength(11);
        });
    });

    describe('SearchLogicalOperator Enum', () => {
        it('should contain AND operator', () => {
            expect(SearchLogicalOperator.AND).toBe('AND');
        });

        it('should contain OR operator', () => {
            expect(SearchLogicalOperator.OR).toBe('OR');
        });

        it('should have exactly 2 logical operators', () => {
            const operators = Object.values(SearchLogicalOperator);
            expect(operators).toHaveLength(2);
        });
    });

    describe('SortDirection Enum', () => {
        it('should contain ascending direction', () => {
            expect(SortDirection.ASC).toBe('ASC');
        });

        it('should contain descending direction', () => {
            expect(SortDirection.DESC).toBe('DESC');
        });

        it('should have exactly 2 sort directions', () => {
            const directions = Object.values(SortDirection);
            expect(directions).toHaveLength(2);
        });
    });

    describe('SearchParameter Interface', () => {
        interface TestObject {
            id: string;
            name: string;
            age: number;
            active: boolean;
        }

        it('should support string value searches', () => {
            const parameter: SearchParameter<TestObject> = {
                key: 'name',
                value: 'John Doe',
                operator: SearchConditionOperator.EQUALS
            };

            expect(parameter.key).toBe('name');
            expect(parameter.value).toBe('John Doe');
            expect(parameter.operator).toBe(SearchConditionOperator.EQUALS);
        });

        it('should support number value searches', () => {
            const parameter: SearchParameter<TestObject> = {
                key: 'age',
                value: 25,
                operator: SearchConditionOperator.GREATER_THAN
            };

            expect(parameter.key).toBe('age');
            expect(parameter.value).toBe(25);
            expect(parameter.operator).toBe(SearchConditionOperator.GREATER_THAN);
        });

        it('should support boolean value searches', () => {
            const parameter: SearchParameter<TestObject> = {
                key: 'active',
                value: true,
                operator: SearchConditionOperator.EQUALS
            };

            expect(parameter.key).toBe('active');
            expect(parameter.value).toBe(true);
            expect(parameter.operator).toBe(SearchConditionOperator.EQUALS);
        });

        it('should support array value searches', () => {
            const parameter: SearchParameter<TestObject> = {
                key: 'age',
                value: [18, 25, 30],
                operator: SearchConditionOperator.IN
            };

            expect(parameter.key).toBe('age');
            expect(Array.isArray(parameter.value)).toBe(true);
            expect(parameter.value).toEqual([18, 25, 30]);
            expect(parameter.operator).toBe(SearchConditionOperator.IN);
        });

        it('should support mixed array value searches', () => {
            const parameter: SearchParameter<TestObject> = {
                key: 'name',
                value: ['John', 'Jane', 'Bob'],
                operator: SearchConditionOperator.NOT_IN
            };

            expect(parameter.key).toBe('name');
            expect(Array.isArray(parameter.value)).toBe(true);
            expect(parameter.value).toEqual(['John', 'Jane', 'Bob']);
            expect(parameter.operator).toBe(SearchConditionOperator.NOT_IN);
        });
    });

    describe('SearchOption Type', () => {
        interface TestObject {
            id: string;
            name: string;
            age: number;
            active: boolean;
        }

        it('should support simple parameter conditions', () => {
            const searchOption: SearchOption<TestObject> = {
                logic: SearchLogicalOperator.AND,
                conditions: [
                    {
                        key: 'name',
                        value: 'John',
                        operator: SearchConditionOperator.EQUALS
                    },
                    {
                        key: 'age',
                        value: 25,
                        operator: SearchConditionOperator.GREATER_THAN
                    }
                ]
            };

            expect(searchOption.logic).toBe(SearchLogicalOperator.AND);
            expect(searchOption.conditions).toHaveLength(2);
            expect(searchOption.conditions[0]).toHaveProperty('key', 'name');
            expect(searchOption.conditions[1]).toHaveProperty('key', 'age');
        });

        it('should support nested search options', () => {
            const nestedOption: SearchOption<TestObject> = {
                logic: SearchLogicalOperator.OR,
                conditions: [
                    {
                        key: 'name',
                        value: 'John',
                        operator: SearchConditionOperator.EQUALS
                    },
                    {
                        key: 'name',
                        value: 'Jane',
                        operator: SearchConditionOperator.EQUALS
                    }
                ]
            };

            const mainOption: SearchOption<TestObject> = {
                logic: SearchLogicalOperator.AND,
                conditions: [
                    {
                        key: 'active',
                        value: true,
                        operator: SearchConditionOperator.EQUALS
                    },
                    nestedOption
                ]
            };

            expect(mainOption.logic).toBe(SearchLogicalOperator.AND);
            expect(mainOption.conditions).toHaveLength(2);
            expect(mainOption.conditions[1]).toEqual(nestedOption);
        });

        it('should support complex nested structures', () => {
            const deeplyNested: SearchOption<TestObject> = {
                logic: SearchLogicalOperator.AND,
                conditions: [
                    {
                        logic: SearchLogicalOperator.OR,
                        conditions: [
                            {
                                key: 'age',
                                value: [18, 25],
                                operator: SearchConditionOperator.IN
                            },
                            {
                                key: 'age',
                                value: 65,
                                operator: SearchConditionOperator.GREATER_THAN
                            }
                        ]
                    },
                    {
                        logic: SearchLogicalOperator.AND,
                        conditions: [
                            {
                                key: 'active',
                                value: true,
                                operator: SearchConditionOperator.EQUALS
                            },
                            {
                                key: 'name',
                                value: 'test%',
                                operator: SearchConditionOperator.LIKE
                            }
                        ]
                    }
                ]
            };

            expect(deeplyNested.logic).toBe(SearchLogicalOperator.AND);
            expect(deeplyNested.conditions).toHaveLength(2);
            
            const firstCondition = deeplyNested.conditions[0] as SearchOption<TestObject>;
            expect(firstCondition.logic).toBe(SearchLogicalOperator.OR);
            expect(firstCondition.conditions).toHaveLength(2);
        });
    });

    describe('PaginationOption Interface', () => {
        interface TestObject {
            id: string;
            name: string;
            age: number;
            createdAt: Date;
        }

        it('should support basic pagination', () => {
            const pagination: PaginationOption<TestObject> = {
                page: 1,
                limit: 10
            };

            expect(pagination.page).toBe(1);
            expect(pagination.limit).toBe(10);
            expect(pagination.sortBy).toBeUndefined();
            expect(pagination.sortDirection).toBeUndefined();
        });

        it('should support sorting options', () => {
            const pagination: PaginationOption<TestObject> = {
                page: 2,
                limit: 20,
                sortBy: 'name',
                sortDirection: SortDirection.ASC
            };

            expect(pagination.page).toBe(2);
            expect(pagination.limit).toBe(20);
            expect(pagination.sortBy).toBe('name');
            expect(pagination.sortDirection).toBe(SortDirection.ASC);
        });

        it('should support different sort fields', () => {
            const paginationByAge: PaginationOption<TestObject> = {
                sortBy: 'age',
                sortDirection: SortDirection.DESC
            };

            const paginationByDate: PaginationOption<TestObject> = {
                sortBy: 'createdAt',
                sortDirection: SortDirection.ASC
            };

            expect(paginationByAge.sortBy).toBe('age');
            expect(paginationByAge.sortDirection).toBe(SortDirection.DESC);
            expect(paginationByDate.sortBy).toBe('createdAt');
            expect(paginationByDate.sortDirection).toBe(SortDirection.ASC);
        });

        it('should allow partial options', () => {
            const pageOnly: PaginationOption<TestObject> = {
                page: 5
            };

            const limitOnly: PaginationOption<TestObject> = {
                limit: 50
            };

            const sortOnly: PaginationOption<TestObject> = {
                sortBy: 'name',
                sortDirection: SortDirection.DESC
            };

            expect(pageOnly.page).toBe(5);
            expect(pageOnly.limit).toBeUndefined();
            
            expect(limitOnly.limit).toBe(50);
            expect(limitOnly.page).toBeUndefined();
            
            expect(sortOnly.sortBy).toBe('name');
            expect(sortOnly.sortDirection).toBe(SortDirection.DESC);
            expect(sortOnly.page).toBeUndefined();
            expect(sortOnly.limit).toBeUndefined();
        });

        it('should support empty pagination options', () => {
            const empty: PaginationOption<TestObject> = {};

            expect(empty.page).toBeUndefined();
            expect(empty.limit).toBeUndefined();
            expect(empty.sortBy).toBeUndefined();
            expect(empty.sortDirection).toBeUndefined();
        });
    });

    describe('Type Safety and Integration', () => {
        interface TestObject {
            id: string;
            name: string;
            age: number;
            active: boolean;
            tags: string[];
        }

        it('should enforce type safety across all interfaces', () => {
            const searchParameter: SearchParameter<TestObject> = {
                key: 'name', // Must be keyof TestObject
                value: 'John',
                operator: SearchConditionOperator.EQUALS
            };

            const searchOption: SearchOption<TestObject> = {
                logic: SearchLogicalOperator.AND,
                conditions: [searchParameter]
            };

            const pagination: PaginationOption<TestObject> = {
                page: 1,
                limit: 10,
                sortBy: 'age', // Must be keyof TestObject
                sortDirection: SortDirection.DESC
            };

            expect(searchParameter.key).toBe('name');
            expect(searchOption.conditions[0]).toEqual(searchParameter);
            expect(pagination.sortBy).toBe('age');
        });

        it('should work with complex search scenarios', () => {
            const complexSearch: SearchOption<TestObject> = {
                logic: SearchLogicalOperator.AND,
                conditions: [
                    {
                        key: 'active',
                        value: true,
                        operator: SearchConditionOperator.EQUALS
                    },
                    {
                        logic: SearchLogicalOperator.OR,
                        conditions: [
                            {
                                key: 'age',
                                value: [18, 25, 30],
                                operator: SearchConditionOperator.IN
                            },
                            {
                                key: 'name',
                                value: 'Admin%',
                                operator: SearchConditionOperator.LIKE
                            }
                        ]
                    }
                ]
            };

            const complexPagination: PaginationOption<TestObject> = {
                page: 1,
                limit: 100,
                sortBy: 'name',
                sortDirection: SortDirection.ASC
            };

            expect(complexSearch.logic).toBe(SearchLogicalOperator.AND);
            expect(complexSearch.conditions).toHaveLength(2);
            expect(complexPagination.limit).toBe(100);
            expect(complexPagination.sortBy).toBe('name');
        });
    });
});