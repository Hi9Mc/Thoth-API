export enum SearchConditionOperator {
    EQUALS = '=',
    NOT_EQUALS = '!=',
    GREATER_THAN = '>',
    GREATER_THAN_OR_EQUAL = '>=',
    LESS_THAN = '<',
    LESS_THAN_OR_EQUAL = '<=',
    LIKE = 'LIKE',
    NOT_LIKE = 'NOT LIKE',
    IN = 'IN',
    NOT_IN = 'NOT IN',
    BETWEEN = 'BETWEEN',
}

export enum SearchLogicalOperator {
    AND = 'AND',
    OR = 'OR',
}

export interface ProjectObject {
    projectId: string;
    contentType: string;
    contentId: string;
    version: number;
    [key: string]: any;
}

export interface SearchParameter<T = any> {
    key: keyof T;
    value: string | number | boolean | Array<string | number | boolean>;
    operator: SearchConditionOperator;
}

export type SearchOption<T = any> = {
    logic: SearchLogicalOperator;
    conditions: Array<SearchParameter<T> | SearchOption<T>>;
};

export interface PaginationOption<T = any> {
    page?: number;
    limit?: number;
    sortBy?: keyof T;
    sortDirection?: 'asc' | 'desc';
}

export interface IDatabaseService<T extends { [key: string]: any } = ProjectObject> {
    create(obj: T): Promise<T>;
    update(obj: T): Promise<T>;
    delete(projectId: string, contentType: string, contentId: string, version: number): Promise<boolean>;
    getById(projectId: string, contentType: string, contentId: string, version: number): Promise<T | null>;
    search(condition: SearchOption<T>, pagination: PaginationOption<T>): Promise<{ results: T[], total: number }>;
    exists(condition: SearchOption<T>): Promise<boolean>;
    count(condition: SearchOption<T>): Promise<number>;
}

export interface IDatabaseServiceConstructor<T extends { [key: string]: any } = ProjectObject> {
    new (): IDatabaseService<T>;
    getInstance(): IDatabaseService<T>;
    getInstanceByProjectId(projectId: string): IDatabaseService<T>;
} 