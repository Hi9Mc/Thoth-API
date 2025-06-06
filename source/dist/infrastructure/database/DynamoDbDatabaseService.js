"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DynamoDbDatabaseService = void 0;
const IDatabaseService_1 = require("./IDatabaseService");
const client_dynamodb_1 = require("@aws-sdk/client-dynamodb");
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
class DynamoDbDatabaseService {
    constructor(tableName = 'ThothObjects', region = 'us-east-1') {
        this.tableName = tableName;
        this.client = new client_dynamodb_1.DynamoDBClient({ region });
        this.docClient = lib_dynamodb_1.DynamoDBDocumentClient.from(this.client);
    }
    static getInstance() {
        const key = 'default';
        if (!this.instances.has(key)) {
            this.instances.set(key, new DynamoDbDatabaseService());
        }
        return this.instances.get(key);
    }
    static getInstanceByTenantId(tenantId) {
        const key = `tenant_${tenantId}`;
        if (!this.instances.has(key)) {
            const instance = new DynamoDbDatabaseService(tenantId);
            // Automatically ensure table exists for the tenant (only in non-test environments)
            if (process.env.NODE_ENV !== 'test') {
                instance.ensureTable().catch(error => {
                    console.warn(`Failed to ensure table for tenant ${tenantId}:`, error);
                });
            }
            this.instances.set(key, instance);
        }
        return this.instances.get(key);
    }
    generateKey(tenantId, resourceType, resourceId, version) {
        return {
            pk: tenantId,
            sk: `${resourceType}#${resourceId}#${version}`
        };
    }
    async create(obj) {
        // Only ensure table in non-test environments
        if (process.env.NODE_ENV !== 'test') {
            await this.ensureTable();
        }
        const { pk, sk } = this.generateKey(obj.tenantId, obj.resourceType, obj.resourceId, obj.version);
        const item = {
            ...obj,
            pk,
            sk
        };
        const command = new lib_dynamodb_1.PutCommand({
            TableName: this.tableName,
            Item: item
        });
        await this.docClient.send(command);
        return obj;
    }
    async update(obj) {
        // Only ensure table in non-test environments
        if (process.env.NODE_ENV !== 'test') {
            await this.ensureTable();
        }
        const { pk, sk } = this.generateKey(obj.tenantId, obj.resourceType, obj.resourceId, obj.version);
        // First check if the item exists
        const existing = await this.getByKey(obj.tenantId, obj.resourceType, obj.resourceId, obj.version);
        if (!existing) {
            throw new Error('Object not found');
        }
        const item = {
            ...obj,
            pk,
            sk
        };
        const command = new lib_dynamodb_1.PutCommand({
            TableName: this.tableName,
            Item: item
        });
        await this.docClient.send(command);
        return obj;
    }
    async delete(tenantId, resourceType, resourceId, version) {
        const { pk, sk } = this.generateKey(tenantId, resourceType, resourceId, version);
        const command = new lib_dynamodb_1.DeleteCommand({
            TableName: this.tableName,
            Key: { pk, sk },
            ReturnValues: 'ALL_OLD'
        });
        const result = await this.docClient.send(command);
        return !!result.Attributes;
    }
    async getByKey(tenantId, resourceType, resourceId, version) {
        // Only ensure table in non-test environments
        if (process.env.NODE_ENV !== 'test') {
            await this.ensureTable();
        }
        const { pk, sk } = this.generateKey(tenantId, resourceType, resourceId, version);
        const command = new lib_dynamodb_1.GetCommand({
            TableName: this.tableName,
            Key: { pk, sk }
        });
        const result = await this.docClient.send(command);
        if (!result.Item) {
            return null;
        }
        const { pk: _, sk: __, ...item } = result.Item;
        return item;
    }
    async search(condition, pagination) {
        var _a, _b;
        // Only ensure table in non-test environments
        if (process.env.NODE_ENV !== 'test') {
            await this.ensureTable();
        }
        // For complex searches, we'll use scan operation
        // This could be optimized with better table design for specific query patterns
        const command = new lib_dynamodb_1.ScanCommand({
            TableName: this.tableName,
            FilterExpression: this.buildFilterExpression(condition),
            ExpressionAttributeNames: this.buildExpressionAttributeNames(condition),
            ExpressionAttributeValues: this.buildExpressionAttributeValues(condition)
        });
        const result = await this.docClient.send(command);
        let items = (result.Items || []).map(item => {
            const { pk, sk, ...cleanItem } = item;
            return cleanItem;
        });
        // Apply sorting
        if (pagination.sortBy) {
            items = items.sort((a, b) => {
                const aVal = a[pagination.sortBy];
                const bVal = b[pagination.sortBy];
                if (aVal < bVal)
                    return pagination.sortDirection === 'DESC' ? 1 : -1;
                if (aVal > bVal)
                    return pagination.sortDirection === 'DESC' ? -1 : 1;
                return 0;
            });
        }
        const total = items.length;
        // Apply pagination
        const page = (_a = pagination.page) !== null && _a !== void 0 ? _a : 1;
        const limit = (_b = pagination.limit) !== null && _b !== void 0 ? _b : 20;
        const start = (page - 1) * limit;
        const results = items.slice(start, start + limit);
        return { results, total };
    }
    async exists(condition) {
        var _a;
        const command = new lib_dynamodb_1.ScanCommand({
            TableName: this.tableName,
            FilterExpression: this.buildFilterExpression(condition),
            ExpressionAttributeNames: this.buildExpressionAttributeNames(condition),
            ExpressionAttributeValues: this.buildExpressionAttributeValues(condition),
            Limit: 1
        });
        const result = await this.docClient.send(command);
        return (((_a = result.Items) === null || _a === void 0 ? void 0 : _a.length) || 0) > 0;
    }
    async count(condition) {
        const command = new lib_dynamodb_1.ScanCommand({
            TableName: this.tableName,
            FilterExpression: this.buildFilterExpression(condition),
            ExpressionAttributeNames: this.buildExpressionAttributeNames(condition),
            ExpressionAttributeValues: this.buildExpressionAttributeValues(condition),
            Select: 'COUNT'
        });
        const result = await this.docClient.send(command);
        return result.Count || 0;
    }
    buildFilterExpression(condition) {
        if (!condition.conditions.length)
            return '';
        const expressions = condition.conditions.map((cond, index) => {
            if ('key' in cond) {
                return this.buildConditionExpression(cond, index);
            }
            else {
                return `(${this.buildFilterExpression(cond)})`;
            }
        });
        const operator = condition.logic === IDatabaseService_1.SearchLogicalOperator.AND ? ' AND ' : ' OR ';
        return expressions.join(operator);
    }
    buildConditionExpression(param, index) {
        const attrName = `#attr${index}`;
        const attrValue = `:val${index}`;
        switch (param.operator) {
            case IDatabaseService_1.SearchConditionOperator.EQUALS:
                return `${attrName} = ${attrValue}`;
            case IDatabaseService_1.SearchConditionOperator.NOT_EQUALS:
                return `${attrName} <> ${attrValue}`;
            case IDatabaseService_1.SearchConditionOperator.GREATER_THAN:
                return `${attrName} > ${attrValue}`;
            case IDatabaseService_1.SearchConditionOperator.GREATER_THAN_OR_EQUAL:
                return `${attrName} >= ${attrValue}`;
            case IDatabaseService_1.SearchConditionOperator.LESS_THAN:
                return `${attrName} < ${attrValue}`;
            case IDatabaseService_1.SearchConditionOperator.LESS_THAN_OR_EQUAL:
                return `${attrName} <= ${attrValue}`;
            case IDatabaseService_1.SearchConditionOperator.LIKE:
                return `contains(${attrName}, ${attrValue})`;
            case IDatabaseService_1.SearchConditionOperator.NOT_LIKE:
                return `NOT contains(${attrName}, ${attrValue})`;
            case IDatabaseService_1.SearchConditionOperator.IN:
                if (Array.isArray(param.value)) {
                    const valueList = param.value.map((_, i) => `${attrValue}_${i}`).join(', ');
                    return `${attrName} IN (${valueList})`;
                }
                return `${attrName} = ${attrValue}`;
            case IDatabaseService_1.SearchConditionOperator.NOT_IN:
                if (Array.isArray(param.value)) {
                    const valueList = param.value.map((_, i) => `${attrValue}_${i}`).join(', ');
                    return `NOT ${attrName} IN (${valueList})`;
                }
                return `${attrName} <> ${attrValue}`;
            case IDatabaseService_1.SearchConditionOperator.BETWEEN:
                return `${attrName} BETWEEN ${attrValue}_0 AND ${attrValue}_1`;
            default:
                return '';
        }
    }
    buildExpressionAttributeNames(condition) {
        const names = {};
        this.collectAttributeNames(condition, names, 0);
        return names;
    }
    collectAttributeNames(condition, names, startIndex) {
        let index = startIndex;
        for (const cond of condition.conditions) {
            if ('key' in cond) {
                names[`#attr${index}`] = String(cond.key);
                index++;
            }
            else {
                index = this.collectAttributeNames(cond, names, index);
            }
        }
        return index;
    }
    buildExpressionAttributeValues(condition) {
        const values = {};
        this.collectAttributeValues(condition, values, 0);
        return values;
    }
    collectAttributeValues(condition, values, startIndex) {
        let index = startIndex;
        for (const cond of condition.conditions) {
            if ('key' in cond) {
                if (cond.operator === IDatabaseService_1.SearchConditionOperator.IN || cond.operator === IDatabaseService_1.SearchConditionOperator.NOT_IN) {
                    if (Array.isArray(cond.value)) {
                        cond.value.forEach((val, i) => {
                            values[`:val${index}_${i}`] = val;
                        });
                    }
                    else {
                        values[`:val${index}`] = cond.value;
                    }
                }
                else if (cond.operator === IDatabaseService_1.SearchConditionOperator.BETWEEN) {
                    if (Array.isArray(cond.value) && cond.value.length >= 2) {
                        values[`:val${index}_0`] = cond.value[0];
                        values[`:val${index}_1`] = cond.value[1];
                    }
                }
                else {
                    values[`:val${index}`] = cond.value;
                }
                index++;
            }
            else {
                index = this.collectAttributeValues(cond, values, index);
            }
        }
        return index;
    }
    // Utility method to create table if it doesn't exist (for testing purposes)
    async ensureTable() {
        try {
            await this.client.send(new client_dynamodb_1.DescribeTableCommand({ TableName: this.tableName }));
        }
        catch (error) {
            if (error instanceof client_dynamodb_1.ResourceNotFoundException) {
                await this.createTable();
            }
            else {
                throw error;
            }
        }
    }
    async createTable() {
        var _a;
        const command = new client_dynamodb_1.CreateTableCommand({
            TableName: this.tableName,
            KeySchema: [
                { AttributeName: 'pk', KeyType: 'HASH' },
                { AttributeName: 'sk', KeyType: 'RANGE' }
            ],
            AttributeDefinitions: [
                { AttributeName: 'pk', AttributeType: 'S' },
                { AttributeName: 'sk', AttributeType: 'S' }
            ],
            BillingMode: 'PAY_PER_REQUEST'
        });
        await this.client.send(command);
        // Wait for table to be active
        let tableStatus = '';
        while (tableStatus !== 'ACTIVE') {
            await new Promise(resolve => setTimeout(resolve, 1000));
            const describeResult = await this.client.send(new client_dynamodb_1.DescribeTableCommand({ TableName: this.tableName }));
            tableStatus = ((_a = describeResult.Table) === null || _a === void 0 ? void 0 : _a.TableStatus) || '';
        }
    }
    // Utility method to delete table (for testing cleanup)
    async deleteTable() {
        try {
            await this.client.send(new client_dynamodb_1.DeleteTableCommand({ TableName: this.tableName }));
        }
        catch (error) {
            if (!(error instanceof client_dynamodb_1.ResourceNotFoundException)) {
                throw error;
            }
        }
    }
}
exports.DynamoDbDatabaseService = DynamoDbDatabaseService;
DynamoDbDatabaseService.instances = new Map();
