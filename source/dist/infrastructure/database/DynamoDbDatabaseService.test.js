"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * @jest-environment node
 */
const DynamoDbDatabaseService_1 = require("./DynamoDbDatabaseService");
const IDatabaseService_1 = require("./IDatabaseService");
const aws_sdk_client_mock_1 = require("aws-sdk-client-mock");
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
require("@jest/globals");
require("jest");
// Mock DynamoDB client
const ddbMock = (0, aws_sdk_client_mock_1.mockClient)(lib_dynamodb_1.DynamoDBDocumentClient);
describe('DynamoDbDatabaseService', () => {
    let db;
    const obj1 = { tenantId: 'p1', resourceType: 'typeA', resourceId: 'c1', version: 1, name: 'Alpha' };
    const obj2 = { tenantId: 'p1', resourceType: 'typeA', resourceId: 'c2', version: 1, name: 'Beta' };
    const obj3 = { tenantId: 'p2', resourceType: 'typeB', resourceId: 'c3', version: 2, name: 'Gamma' };
    beforeEach(() => {
        ddbMock.reset();
        db = new DynamoDbDatabaseService_1.DynamoDbDatabaseService('test-table', 'us-east-1');
    });
    describe('create', () => {
        it('should create an object successfully', async () => {
            ddbMock.on(lib_dynamodb_1.PutCommand).resolves({});
            const result = await db.create(obj1);
            expect(result).toEqual(obj1);
            expect(ddbMock.commandCalls(lib_dynamodb_1.PutCommand)).toHaveLength(1);
            const putCall = ddbMock.commandCalls(lib_dynamodb_1.PutCommand)[0];
            expect(putCall.args[0].input).toMatchObject({
                TableName: 'test-table',
                Item: {
                    ...obj1,
                    pk: 'p1',
                    sk: 'typeA#c1#1'
                }
            });
        });
    });
    describe('getByKey', () => {
        it('should retrieve an object by key', async () => {
            const dynamoItem = {
                ...obj1,
                pk: 'p1',
                sk: 'typeA#c1#1'
            };
            ddbMock.on(lib_dynamodb_1.GetCommand).resolves({
                Item: dynamoItem
            });
            const result = await db.getByKey('p1', 'typeA', 'c1', 1);
            expect(result).toEqual(obj1);
            expect(ddbMock.commandCalls(lib_dynamodb_1.GetCommand)).toHaveLength(1);
            const getCall = ddbMock.commandCalls(lib_dynamodb_1.GetCommand)[0];
            expect(getCall.args[0].input).toMatchObject({
                TableName: 'test-table',
                Key: { pk: 'p1', sk: 'typeA#c1#1' }
            });
        });
        it('should return null when object not found', async () => {
            ddbMock.on(lib_dynamodb_1.GetCommand).resolves({});
            const result = await db.getByKey('p1', 'typeA', 'c1', 1);
            expect(result).toBeNull();
        });
    });
    describe('update', () => {
        it('should update an existing object', async () => {
            const dynamoItem = {
                ...obj1,
                pk: 'p1',
                sk: 'typeA#c1#1'
            };
            // Mock getByKey call first
            ddbMock.on(lib_dynamodb_1.GetCommand).resolves({
                Item: dynamoItem
            });
            // Mock update call
            ddbMock.on(lib_dynamodb_1.PutCommand).resolves({});
            const updatedObj = { ...obj1, name: 'AlphaX' };
            const result = await db.update(updatedObj);
            expect(result).toEqual(updatedObj);
            expect(ddbMock.commandCalls(lib_dynamodb_1.GetCommand)).toHaveLength(1);
            expect(ddbMock.commandCalls(lib_dynamodb_1.PutCommand)).toHaveLength(1);
        });
        it('should throw error when object not found', async () => {
            ddbMock.on(lib_dynamodb_1.GetCommand).resolves({});
            const updatedObj = { ...obj1, name: 'AlphaX' };
            await expect(db.update(updatedObj)).rejects.toThrow('Object not found');
        });
    });
    describe('delete', () => {
        it('should delete an existing object', async () => {
            ddbMock.on(lib_dynamodb_1.DeleteCommand).resolves({
                Attributes: { ...obj1, pk: 'p1', sk: 'typeA#c1#1' }
            });
            const result = await db.delete('p1', 'typeA', 'c1', 1);
            expect(result).toBe(true);
            expect(ddbMock.commandCalls(lib_dynamodb_1.DeleteCommand)).toHaveLength(1);
            const deleteCall = ddbMock.commandCalls(lib_dynamodb_1.DeleteCommand)[0];
            expect(deleteCall.args[0].input).toMatchObject({
                TableName: 'test-table',
                Key: { pk: 'p1', sk: 'typeA#c1#1' },
                ReturnValues: 'ALL_OLD'
            });
        });
        it('should return false when object not found', async () => {
            ddbMock.on(lib_dynamodb_1.DeleteCommand).resolves({});
            const result = await db.delete('p1', 'typeA', 'c1', 1);
            expect(result).toBe(false);
        });
    });
    describe('search', () => {
        it('should search with AND condition', async () => {
            const items = [
                { ...obj1, pk: 'p1', sk: 'typeA#c1#1' },
                { ...obj2, pk: 'p1', sk: 'typeA#c2#1' }
            ];
            ddbMock.on(lib_dynamodb_1.ScanCommand).resolves({
                Items: items
            });
            const condition = {
                logic: IDatabaseService_1.SearchLogicalOperator.AND,
                conditions: [
                    { key: 'projectId', value: 'p1', operator: IDatabaseService_1.SearchConditionOperator.EQUALS },
                    { key: 'contentType', value: 'typeA', operator: IDatabaseService_1.SearchConditionOperator.EQUALS },
                ],
            };
            const pagination = { page: 1, limit: 10 };
            const { results, total } = await db.search(condition, pagination);
            expect(total).toBe(2);
            expect(results).toEqual(expect.arrayContaining([obj1, obj2]));
            expect(ddbMock.commandCalls(lib_dynamodb_1.ScanCommand)).toHaveLength(1);
        });
        it('should handle pagination and sorting', async () => {
            const items = [
                { ...obj1, pk: 'p1', sk: 'typeA#c1#1' },
                { ...obj2, pk: 'p1', sk: 'typeA#c2#1' },
                { ...obj3, pk: 'p2', sk: 'typeB#c3#2' }
            ];
            ddbMock.on(lib_dynamodb_1.ScanCommand).resolves({
                Items: items
            });
            const condition = {
                logic: IDatabaseService_1.SearchLogicalOperator.OR,
                conditions: [
                    { key: 'projectId', value: 'p1', operator: IDatabaseService_1.SearchConditionOperator.EQUALS },
                    { key: 'projectId', value: 'p2', operator: IDatabaseService_1.SearchConditionOperator.EQUALS },
                ],
            };
            const pagination = {
                page: 1,
                limit: 2,
                sortBy: 'name',
                sortDirection: IDatabaseService_1.SortDirection.ASC
            };
            const { results, total } = await db.search(condition, pagination);
            expect(total).toBe(3);
            expect(results.length).toBe(2);
            expect(results[0].name < results[1].name).toBe(true);
        });
        it('should handle nested AND/OR logic in search', async () => {
            const items = [
                { ...obj1, pk: 'p1', sk: 'typeA#c1#1' },
                { ...obj3, pk: 'p2', sk: 'typeB#c3#2' }
            ];
            ddbMock.on(lib_dynamodb_1.ScanCommand).resolves({
                Items: items
            });
            const condition = {
                logic: IDatabaseService_1.SearchLogicalOperator.OR,
                conditions: [
                    {
                        logic: IDatabaseService_1.SearchLogicalOperator.AND,
                        conditions: [
                            { key: 'projectId', value: 'p1', operator: IDatabaseService_1.SearchConditionOperator.EQUALS },
                            { key: 'name', value: 'Alpha', operator: IDatabaseService_1.SearchConditionOperator.EQUALS },
                        ],
                    },
                    {
                        logic: IDatabaseService_1.SearchLogicalOperator.AND,
                        conditions: [
                            { key: 'projectId', value: 'p2', operator: IDatabaseService_1.SearchConditionOperator.EQUALS },
                            { key: 'contentType', value: 'typeB', operator: IDatabaseService_1.SearchConditionOperator.EQUALS },
                        ],
                    },
                ],
            };
            const pagination = { page: 1, limit: 10 };
            const { results, total } = await db.search(condition, pagination);
            expect(total).toBe(2);
            expect(results).toEqual(expect.arrayContaining([obj1, obj3]));
        });
        it('should handle different search operators', async () => {
            const items = [
                { ...obj1, pk: 'p1', sk: 'typeA#c1#1' },
                { ...obj2, pk: 'p1', sk: 'typeA#c2#1' }
            ];
            ddbMock.on(lib_dynamodb_1.ScanCommand).resolves({
                Items: items
            });
            // Test LIKE operator
            const likeCondition = {
                logic: IDatabaseService_1.SearchLogicalOperator.AND,
                conditions: [
                    { key: 'name', value: 'Alp', operator: IDatabaseService_1.SearchConditionOperator.LIKE },
                ],
            };
            const pagination = { page: 1, limit: 10 };
            await db.search(likeCondition, pagination);
            expect(ddbMock.commandCalls(lib_dynamodb_1.ScanCommand)).toHaveLength(1);
            const scanCall = ddbMock.commandCalls(lib_dynamodb_1.ScanCommand)[0];
            expect(scanCall.args[0].input.FilterExpression).toContain('contains');
        });
        it('should handle IN operator', async () => {
            const items = [
                { ...obj1, pk: 'p1', sk: 'typeA#c1#1' },
                { ...obj2, pk: 'p1', sk: 'typeA#c2#1' }
            ];
            ddbMock.on(lib_dynamodb_1.ScanCommand).resolves({
                Items: items
            });
            const condition = {
                logic: IDatabaseService_1.SearchLogicalOperator.AND,
                conditions: [
                    { key: 'contentId', value: ['c1', 'c2'], operator: IDatabaseService_1.SearchConditionOperator.IN },
                ],
            };
            const pagination = { page: 1, limit: 10 };
            await db.search(condition, pagination);
            expect(ddbMock.commandCalls(lib_dynamodb_1.ScanCommand)).toHaveLength(1);
            const scanCall = ddbMock.commandCalls(lib_dynamodb_1.ScanCommand)[0];
            expect(scanCall.args[0].input.FilterExpression).toContain('IN');
        });
        it('should handle BETWEEN operator', async () => {
            const items = [
                { ...obj1, pk: 'p1', sk: 'typeA#c1#1' },
                { ...obj3, pk: 'p2', sk: 'typeB#c3#2' }
            ];
            ddbMock.on(lib_dynamodb_1.ScanCommand).resolves({
                Items: items
            });
            const condition = {
                logic: IDatabaseService_1.SearchLogicalOperator.AND,
                conditions: [
                    { key: 'version', value: [1, 2], operator: IDatabaseService_1.SearchConditionOperator.BETWEEN },
                ],
            };
            const pagination = { page: 1, limit: 10 };
            await db.search(condition, pagination);
            expect(ddbMock.commandCalls(lib_dynamodb_1.ScanCommand)).toHaveLength(1);
            const scanCall = ddbMock.commandCalls(lib_dynamodb_1.ScanCommand)[0];
            expect(scanCall.args[0].input.FilterExpression).toContain('BETWEEN');
        });
    });
    describe('exists', () => {
        it('should return true when condition matches', async () => {
            ddbMock.on(lib_dynamodb_1.ScanCommand).resolves({
                Items: [{ ...obj1, pk: 'p1', sk: 'typeA#c1#1' }]
            });
            const condition = {
                logic: IDatabaseService_1.SearchLogicalOperator.AND,
                conditions: [
                    { key: 'projectId', value: 'p1', operator: IDatabaseService_1.SearchConditionOperator.EQUALS },
                ],
            };
            const result = await db.exists(condition);
            expect(result).toBe(true);
            expect(ddbMock.commandCalls(lib_dynamodb_1.ScanCommand)).toHaveLength(1);
            const scanCall = ddbMock.commandCalls(lib_dynamodb_1.ScanCommand)[0];
            expect(scanCall.args[0].input.Limit).toBe(1);
        });
        it('should return false when condition does not match', async () => {
            ddbMock.on(lib_dynamodb_1.ScanCommand).resolves({
                Items: []
            });
            const condition = {
                logic: IDatabaseService_1.SearchLogicalOperator.AND,
                conditions: [
                    { key: 'projectId', value: 'nonexistent', operator: IDatabaseService_1.SearchConditionOperator.EQUALS },
                ],
            };
            const result = await db.exists(condition);
            expect(result).toBe(false);
        });
    });
    describe('count', () => {
        it('should return count of matching items', async () => {
            ddbMock.on(lib_dynamodb_1.ScanCommand).resolves({
                Count: 5
            });
            const condition = {
                logic: IDatabaseService_1.SearchLogicalOperator.AND,
                conditions: [
                    { key: 'projectId', value: 'p1', operator: IDatabaseService_1.SearchConditionOperator.EQUALS },
                ],
            };
            const result = await db.count(condition);
            expect(result).toBe(5);
            expect(ddbMock.commandCalls(lib_dynamodb_1.ScanCommand)).toHaveLength(1);
            const scanCall = ddbMock.commandCalls(lib_dynamodb_1.ScanCommand)[0];
            expect(scanCall.args[0].input.Select).toBe('COUNT');
        });
    });
    describe('singleton pattern', () => {
        it('should return same instance for getInstance', () => {
            const instance1 = DynamoDbDatabaseService_1.DynamoDbDatabaseService.getInstance();
            const instance2 = DynamoDbDatabaseService_1.DynamoDbDatabaseService.getInstance();
            expect(instance1).toBe(instance2);
        });
        it('should return tenant-specific instances for getInstanceByTenantId', () => {
            const instance1 = DynamoDbDatabaseService_1.DynamoDbDatabaseService.getInstanceByTenantId('tenant1');
            const instance2 = DynamoDbDatabaseService_1.DynamoDbDatabaseService.getInstanceByTenantId('tenant1');
            const instance3 = DynamoDbDatabaseService_1.DynamoDbDatabaseService.getInstanceByTenantId('tenant2');
            expect(instance1).toBe(instance2);
            expect(instance1).not.toBe(instance3);
        });
    });
    describe('edge cases', () => {
        it('should handle empty search conditions', async () => {
            ddbMock.on(lib_dynamodb_1.ScanCommand).resolves({
                Items: [
                    { ...obj1, pk: 'p1', sk: 'typeA#c1#1' },
                    { ...obj2, pk: 'p1', sk: 'typeA#c2#1' }
                ]
            });
            const condition = {
                logic: IDatabaseService_1.SearchLogicalOperator.AND,
                conditions: []
            };
            const pagination = { page: 1, limit: 10 };
            const { results, total } = await db.search(condition, pagination);
            expect(total).toBe(2);
            expect(results.length).toBe(2);
        });
        it('should handle default pagination values', async () => {
            ddbMock.on(lib_dynamodb_1.ScanCommand).resolves({
                Items: Array.from({ length: 25 }, (_, i) => ({
                    ...obj1,
                    contentId: `c${i}`,
                    pk: 'p1',
                    sk: `typeA#c${i}#1`
                }))
            });
            const condition = {
                logic: IDatabaseService_1.SearchLogicalOperator.AND,
                conditions: [
                    { key: 'projectId', value: 'p1', operator: IDatabaseService_1.SearchConditionOperator.EQUALS },
                ]
            };
            const pagination = {}; // No page/limit specified
            const { results, total } = await db.search(condition, pagination);
            expect(total).toBe(25);
            expect(results.length).toBe(20); // Default limit
        });
        it('should handle sorting with DESC direction', async () => {
            const items = [
                { ...obj1, pk: 'p1', sk: 'typeA#c1#1' },
                { ...obj2, pk: 'p1', sk: 'typeA#c2#1' },
                { ...obj3, pk: 'p2', sk: 'typeB#c3#2' }
            ];
            ddbMock.on(lib_dynamodb_1.ScanCommand).resolves({
                Items: items
            });
            const condition = {
                logic: IDatabaseService_1.SearchLogicalOperator.OR,
                conditions: [
                    { key: 'projectId', value: 'p1', operator: IDatabaseService_1.SearchConditionOperator.EQUALS },
                    { key: 'projectId', value: 'p2', operator: IDatabaseService_1.SearchConditionOperator.EQUALS },
                ],
            };
            const pagination = {
                page: 1,
                limit: 10,
                sortBy: 'name',
                sortDirection: IDatabaseService_1.SortDirection.DESC
            };
            const { results, total } = await db.search(condition, pagination);
            expect(total).toBe(3);
            expect(results.length).toBe(3);
            expect(results[0].name > results[1].name).toBe(true);
        });
        it('should handle NOT_EQUALS operator', async () => {
            const items = [
                { ...obj2, pk: 'p1', sk: 'typeA#c2#1' },
                { ...obj3, pk: 'p2', sk: 'typeB#c3#2' }
            ];
            ddbMock.on(lib_dynamodb_1.ScanCommand).resolves({
                Items: items
            });
            const condition = {
                logic: IDatabaseService_1.SearchLogicalOperator.AND,
                conditions: [
                    { key: 'name', value: 'Alpha', operator: IDatabaseService_1.SearchConditionOperator.NOT_EQUALS },
                ],
            };
            const pagination = { page: 1, limit: 10 };
            await db.search(condition, pagination);
            expect(ddbMock.commandCalls(lib_dynamodb_1.ScanCommand)).toHaveLength(1);
            const scanCall = ddbMock.commandCalls(lib_dynamodb_1.ScanCommand)[0];
            expect(scanCall.args[0].input.FilterExpression).toContain('<>');
        });
        it('should handle NOT_LIKE operator', async () => {
            ddbMock.on(lib_dynamodb_1.ScanCommand).resolves({
                Items: [{ ...obj2, pk: 'p1', sk: 'typeA#c2#1' }]
            });
            const condition = {
                logic: IDatabaseService_1.SearchLogicalOperator.AND,
                conditions: [
                    { key: 'name', value: 'Alpha', operator: IDatabaseService_1.SearchConditionOperator.NOT_LIKE },
                ],
            };
            const pagination = { page: 1, limit: 10 };
            await db.search(condition, pagination);
            expect(ddbMock.commandCalls(lib_dynamodb_1.ScanCommand)).toHaveLength(1);
            const scanCall = ddbMock.commandCalls(lib_dynamodb_1.ScanCommand)[0];
            expect(scanCall.args[0].input.FilterExpression).toContain('NOT contains');
        });
        it('should handle NOT_IN operator', async () => {
            ddbMock.on(lib_dynamodb_1.ScanCommand).resolves({
                Items: [{ ...obj3, pk: 'p2', sk: 'typeB#c3#2' }]
            });
            const condition = {
                logic: IDatabaseService_1.SearchLogicalOperator.AND,
                conditions: [
                    { key: 'contentId', value: ['c1', 'c2'], operator: IDatabaseService_1.SearchConditionOperator.NOT_IN },
                ],
            };
            const pagination = { page: 1, limit: 10 };
            await db.search(condition, pagination);
            expect(ddbMock.commandCalls(lib_dynamodb_1.ScanCommand)).toHaveLength(1);
            const scanCall = ddbMock.commandCalls(lib_dynamodb_1.ScanCommand)[0];
            expect(scanCall.args[0].input.FilterExpression).toContain('NOT');
            expect(scanCall.args[0].input.FilterExpression).toContain('IN');
        });
        it('should handle comparison operators', async () => {
            ddbMock.on(lib_dynamodb_1.ScanCommand).resolves({
                Items: [{ ...obj3, pk: 'p2', sk: 'typeB#c3#2' }]
            });
            // Test GREATER_THAN
            const gtCondition = {
                logic: IDatabaseService_1.SearchLogicalOperator.AND,
                conditions: [
                    { key: 'version', value: 1, operator: IDatabaseService_1.SearchConditionOperator.GREATER_THAN },
                ],
            };
            await db.search(gtCondition, { page: 1, limit: 10 });
            // Test LESS_THAN_OR_EQUAL  
            const lteCondition = {
                logic: IDatabaseService_1.SearchLogicalOperator.AND,
                conditions: [
                    { key: 'version', value: 2, operator: IDatabaseService_1.SearchConditionOperator.LESS_THAN_OR_EQUAL },
                ],
            };
            await db.search(lteCondition, { page: 1, limit: 10 });
            expect(ddbMock.commandCalls(lib_dynamodb_1.ScanCommand)).toHaveLength(2);
        });
        it('should handle performance test with many items', async () => {
            const manyItems = Array.from({ length: 1000 }, (_, i) => ({
                projectId: 'pX',
                contentType: 'typeP',
                contentId: `c${i + 10}`,
                version: 1,
                name: `Name${i}`,
                pk: 'pX',
                sk: `typeP#c${i + 10}#1`
            }));
            ddbMock.on(lib_dynamodb_1.ScanCommand).resolves({
                Items: manyItems.slice(999, 1000) // Return the last item
            });
            const start = Date.now();
            const condition = {
                logic: IDatabaseService_1.SearchLogicalOperator.AND,
                conditions: [
                    { key: 'projectId', value: 'pX', operator: IDatabaseService_1.SearchConditionOperator.EQUALS },
                    { key: 'name', value: 'Name999', operator: IDatabaseService_1.SearchConditionOperator.EQUALS },
                ],
            };
            const pagination = { page: 1, limit: 1 };
            const { results, total } = await db.search(condition, pagination);
            const duration = Date.now() - start;
            expect(total).toBe(1);
            expect(results[0].name).toBe('Name999');
            // Performance: should finish quickly since it's mocked
            expect(duration).toBeLessThan(100);
        });
    });
});
