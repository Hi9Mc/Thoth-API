/**
 * @jest-environment node
 */
import { DynamoDbDatabaseService } from './DynamoDbDatabaseService';
import { ProjectObject, SearchConditionOperator, SearchLogicalOperator, SearchOption, PaginationOption, SortDirection } from './IDatabaseService';
import { mockClient } from 'aws-sdk-client-mock';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, GetCommand, DeleteCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import '@jest/globals';
import 'jest';

// Mock DynamoDB client
const ddbMock = mockClient(DynamoDBDocumentClient);

describe('DynamoDbDatabaseService', () => {
  let db: DynamoDbDatabaseService<ProjectObject>;
  const obj1: ProjectObject = { projectId: 'p1', contentType: 'typeA', contentId: 'c1', version: 1, name: 'Alpha' };
  const obj2: ProjectObject = { projectId: 'p1', contentType: 'typeA', contentId: 'c2', version: 1, name: 'Beta' };
  const obj3: ProjectObject = { projectId: 'p2', contentType: 'typeB', contentId: 'c3', version: 2, name: 'Gamma' };

  beforeEach(() => {
    ddbMock.reset();
    db = new DynamoDbDatabaseService<ProjectObject>('test-table', 'us-east-1');
  });

  describe('create', () => {
    it('should create an object successfully', async () => {
      ddbMock.on(PutCommand).resolves({});

      const result = await db.create(obj1);

      expect(result).toEqual(obj1);
      expect(ddbMock.commandCalls(PutCommand)).toHaveLength(1);
      const putCall = ddbMock.commandCalls(PutCommand)[0];
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

      ddbMock.on(GetCommand).resolves({
        Item: dynamoItem
      });

      const result = await db.getByKey('p1', 'typeA', 'c1', 1);

      expect(result).toEqual(obj1);
      expect(ddbMock.commandCalls(GetCommand)).toHaveLength(1);
      const getCall = ddbMock.commandCalls(GetCommand)[0];
      expect(getCall.args[0].input).toMatchObject({
        TableName: 'test-table',
        Key: { pk: 'p1', sk: 'typeA#c1#1' }
      });
    });

    it('should return null when object not found', async () => {
      ddbMock.on(GetCommand).resolves({});

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
      ddbMock.on(GetCommand).resolves({
        Item: dynamoItem
      });

      // Mock update call
      ddbMock.on(PutCommand).resolves({});

      const updatedObj = { ...obj1, name: 'AlphaX' };
      const result = await db.update(updatedObj);

      expect(result).toEqual(updatedObj);
      expect(ddbMock.commandCalls(GetCommand)).toHaveLength(1);
      expect(ddbMock.commandCalls(PutCommand)).toHaveLength(1);
    });

    it('should throw error when object not found', async () => {
      ddbMock.on(GetCommand).resolves({});

      const updatedObj = { ...obj1, name: 'AlphaX' };

      await expect(db.update(updatedObj)).rejects.toThrow('Object not found');
    });
  });

  describe('delete', () => {
    it('should delete an existing object', async () => {
      ddbMock.on(DeleteCommand).resolves({
        Attributes: { ...obj1, pk: 'p1', sk: 'typeA#c1#1' }
      });

      const result = await db.delete('p1', 'typeA', 'c1', 1);

      expect(result).toBe(true);
      expect(ddbMock.commandCalls(DeleteCommand)).toHaveLength(1);
      const deleteCall = ddbMock.commandCalls(DeleteCommand)[0];
      expect(deleteCall.args[0].input).toMatchObject({
        TableName: 'test-table',
        Key: { pk: 'p1', sk: 'typeA#c1#1' },
        ReturnValues: 'ALL_OLD'
      });
    });

    it('should return false when object not found', async () => {
      ddbMock.on(DeleteCommand).resolves({});

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

      ddbMock.on(ScanCommand).resolves({
        Items: items
      });

      const condition: SearchOption<ProjectObject> = {
        logic: SearchLogicalOperator.AND,
        conditions: [
          { key: 'projectId', value: 'p1', operator: SearchConditionOperator.EQUALS },
          { key: 'contentType', value: 'typeA', operator: SearchConditionOperator.EQUALS },
        ],
      };
      const pagination: PaginationOption<ProjectObject> = { page: 1, limit: 10 };
      const { results, total } = await db.search(condition, pagination);

      expect(total).toBe(2);
      expect(results).toEqual(expect.arrayContaining([obj1, obj2]));
      expect(ddbMock.commandCalls(ScanCommand)).toHaveLength(1);
    });

    it('should handle pagination and sorting', async () => {
      const items = [
        { ...obj1, pk: 'p1', sk: 'typeA#c1#1' },
        { ...obj2, pk: 'p1', sk: 'typeA#c2#1' },
        { ...obj3, pk: 'p2', sk: 'typeB#c3#2' }
      ];

      ddbMock.on(ScanCommand).resolves({
        Items: items
      });

      const condition: SearchOption<ProjectObject> = {
        logic: SearchLogicalOperator.OR,
        conditions: [
          { key: 'projectId', value: 'p1', operator: SearchConditionOperator.EQUALS },
          { key: 'projectId', value: 'p2', operator: SearchConditionOperator.EQUALS },
        ],
      };
      const pagination: PaginationOption<ProjectObject> = { 
        page: 1, 
        limit: 2, 
        sortBy: 'name', 
        sortDirection: SortDirection.ASC 
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

      ddbMock.on(ScanCommand).resolves({
        Items: items
      });

      const condition: SearchOption<ProjectObject> = {
        logic: SearchLogicalOperator.OR,
        conditions: [
          {
            logic: SearchLogicalOperator.AND,
            conditions: [
              { key: 'projectId', value: 'p1', operator: SearchConditionOperator.EQUALS },
              { key: 'name', value: 'Alpha', operator: SearchConditionOperator.EQUALS },
            ],
          },
          {
            logic: SearchLogicalOperator.AND,
            conditions: [
              { key: 'projectId', value: 'p2', operator: SearchConditionOperator.EQUALS },
              { key: 'contentType', value: 'typeB', operator: SearchConditionOperator.EQUALS },
            ],
          },
        ],
      };
      const pagination: PaginationOption<ProjectObject> = { page: 1, limit: 10 };
      const { results, total } = await db.search(condition, pagination);

      expect(total).toBe(2);
      expect(results).toEqual(expect.arrayContaining([obj1, obj3]));
    });

    it('should handle different search operators', async () => {
      const items = [
        { ...obj1, pk: 'p1', sk: 'typeA#c1#1' },
        { ...obj2, pk: 'p1', sk: 'typeA#c2#1' }
      ];

      ddbMock.on(ScanCommand).resolves({
        Items: items
      });

      // Test LIKE operator
      const likeCondition: SearchOption<ProjectObject> = {
        logic: SearchLogicalOperator.AND,
        conditions: [
          { key: 'name', value: 'Alp', operator: SearchConditionOperator.LIKE },
        ],
      };
      const pagination: PaginationOption<ProjectObject> = { page: 1, limit: 10 };
      await db.search(likeCondition, pagination);

      expect(ddbMock.commandCalls(ScanCommand)).toHaveLength(1);
      const scanCall = ddbMock.commandCalls(ScanCommand)[0];
      expect(scanCall.args[0].input.FilterExpression).toContain('contains');
    });

    it('should handle IN operator', async () => {
      const items = [
        { ...obj1, pk: 'p1', sk: 'typeA#c1#1' },
        { ...obj2, pk: 'p1', sk: 'typeA#c2#1' }
      ];

      ddbMock.on(ScanCommand).resolves({
        Items: items
      });

      const condition: SearchOption<ProjectObject> = {
        logic: SearchLogicalOperator.AND,
        conditions: [
          { key: 'contentId', value: ['c1', 'c2'], operator: SearchConditionOperator.IN },
        ],
      };
      const pagination: PaginationOption<ProjectObject> = { page: 1, limit: 10 };
      await db.search(condition, pagination);

      expect(ddbMock.commandCalls(ScanCommand)).toHaveLength(1);
      const scanCall = ddbMock.commandCalls(ScanCommand)[0];
      expect(scanCall.args[0].input.FilterExpression).toContain('IN');
    });

    it('should handle BETWEEN operator', async () => {
      const items = [
        { ...obj1, pk: 'p1', sk: 'typeA#c1#1' },
        { ...obj3, pk: 'p2', sk: 'typeB#c3#2' }
      ];

      ddbMock.on(ScanCommand).resolves({
        Items: items
      });

      const condition: SearchOption<ProjectObject> = {
        logic: SearchLogicalOperator.AND,
        conditions: [
          { key: 'version', value: [1, 2], operator: SearchConditionOperator.BETWEEN },
        ],
      };
      const pagination: PaginationOption<ProjectObject> = { page: 1, limit: 10 };
      await db.search(condition, pagination);

      expect(ddbMock.commandCalls(ScanCommand)).toHaveLength(1);
      const scanCall = ddbMock.commandCalls(ScanCommand)[0];
      expect(scanCall.args[0].input.FilterExpression).toContain('BETWEEN');
    });
  });

  describe('exists', () => {
    it('should return true when condition matches', async () => {
      ddbMock.on(ScanCommand).resolves({
        Items: [{ ...obj1, pk: 'p1', sk: 'typeA#c1#1' }]
      });

      const condition: SearchOption<ProjectObject> = {
        logic: SearchLogicalOperator.AND,
        conditions: [
          { key: 'projectId', value: 'p1', operator: SearchConditionOperator.EQUALS },
        ],
      };

      const result = await db.exists(condition);

      expect(result).toBe(true);
      expect(ddbMock.commandCalls(ScanCommand)).toHaveLength(1);
      const scanCall = ddbMock.commandCalls(ScanCommand)[0];
      expect(scanCall.args[0].input.Limit).toBe(1);
    });

    it('should return false when condition does not match', async () => {
      ddbMock.on(ScanCommand).resolves({
        Items: []
      });

      const condition: SearchOption<ProjectObject> = {
        logic: SearchLogicalOperator.AND,
        conditions: [
          { key: 'projectId', value: 'nonexistent', operator: SearchConditionOperator.EQUALS },
        ],
      };

      const result = await db.exists(condition);

      expect(result).toBe(false);
    });
  });

  describe('count', () => {
    it('should return count of matching items', async () => {
      ddbMock.on(ScanCommand).resolves({
        Count: 5
      });

      const condition: SearchOption<ProjectObject> = {
        logic: SearchLogicalOperator.AND,
        conditions: [
          { key: 'projectId', value: 'p1', operator: SearchConditionOperator.EQUALS },
        ],
      };

      const result = await db.count(condition);

      expect(result).toBe(5);
      expect(ddbMock.commandCalls(ScanCommand)).toHaveLength(1);
      const scanCall = ddbMock.commandCalls(ScanCommand)[0];
      expect(scanCall.args[0].input.Select).toBe('COUNT');
    });
  });

  describe('singleton pattern', () => {
    it('should return same instance for getInstance', () => {
      const instance1 = DynamoDbDatabaseService.getInstance();
      const instance2 = DynamoDbDatabaseService.getInstance();

      expect(instance1).toBe(instance2);
    });

    it('should return project-specific instances for getInstanceByProjectId', () => {
      const instance1 = DynamoDbDatabaseService.getInstanceByProjectId('project1');
      const instance2 = DynamoDbDatabaseService.getInstanceByProjectId('project1');
      const instance3 = DynamoDbDatabaseService.getInstanceByProjectId('project2');

      expect(instance1).toBe(instance2);
      expect(instance1).not.toBe(instance3);
    });
  });

  describe('edge cases', () => {
    it('should handle empty search conditions', async () => {
      ddbMock.on(ScanCommand).resolves({
        Items: [
          { ...obj1, pk: 'p1', sk: 'typeA#c1#1' },
          { ...obj2, pk: 'p1', sk: 'typeA#c2#1' }
        ]
      });

      const condition: SearchOption<ProjectObject> = {
        logic: SearchLogicalOperator.AND,
        conditions: []
      };
      const pagination: PaginationOption<ProjectObject> = { page: 1, limit: 10 };
      const { results, total } = await db.search(condition, pagination);

      expect(total).toBe(2);
      expect(results.length).toBe(2);
    });

    it('should handle default pagination values', async () => {
      ddbMock.on(ScanCommand).resolves({
        Items: Array.from({ length: 25 }, (_, i) => ({
          ...obj1,
          contentId: `c${i}`,
          pk: 'p1',
          sk: `typeA#c${i}#1`
        }))
      });

      const condition: SearchOption<ProjectObject> = {
        logic: SearchLogicalOperator.AND,
        conditions: [
          { key: 'projectId', value: 'p1', operator: SearchConditionOperator.EQUALS },
        ]
      };
      const pagination: PaginationOption<ProjectObject> = {}; // No page/limit specified
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

      ddbMock.on(ScanCommand).resolves({
        Items: items
      });

      const condition: SearchOption<ProjectObject> = {
        logic: SearchLogicalOperator.OR,
        conditions: [
          { key: 'projectId', value: 'p1', operator: SearchConditionOperator.EQUALS },
          { key: 'projectId', value: 'p2', operator: SearchConditionOperator.EQUALS },
        ],
      };
      const pagination: PaginationOption<ProjectObject> = { 
        page: 1, 
        limit: 10, 
        sortBy: 'name', 
        sortDirection: SortDirection.DESC 
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

      ddbMock.on(ScanCommand).resolves({
        Items: items
      });

      const condition: SearchOption<ProjectObject> = {
        logic: SearchLogicalOperator.AND,
        conditions: [
          { key: 'name', value: 'Alpha', operator: SearchConditionOperator.NOT_EQUALS },
        ],
      };
      const pagination: PaginationOption<ProjectObject> = { page: 1, limit: 10 };
      await db.search(condition, pagination);

      expect(ddbMock.commandCalls(ScanCommand)).toHaveLength(1);
      const scanCall = ddbMock.commandCalls(ScanCommand)[0];
      expect(scanCall.args[0].input.FilterExpression).toContain('<>');
    });

    it('should handle NOT_LIKE operator', async () => {
      ddbMock.on(ScanCommand).resolves({
        Items: [{ ...obj2, pk: 'p1', sk: 'typeA#c2#1' }]
      });

      const condition: SearchOption<ProjectObject> = {
        logic: SearchLogicalOperator.AND,
        conditions: [
          { key: 'name', value: 'Alpha', operator: SearchConditionOperator.NOT_LIKE },
        ],
      };
      const pagination: PaginationOption<ProjectObject> = { page: 1, limit: 10 };
      await db.search(condition, pagination);

      expect(ddbMock.commandCalls(ScanCommand)).toHaveLength(1);
      const scanCall = ddbMock.commandCalls(ScanCommand)[0];
      expect(scanCall.args[0].input.FilterExpression).toContain('NOT contains');
    });

    it('should handle NOT_IN operator', async () => {
      ddbMock.on(ScanCommand).resolves({
        Items: [{ ...obj3, pk: 'p2', sk: 'typeB#c3#2' }]
      });

      const condition: SearchOption<ProjectObject> = {
        logic: SearchLogicalOperator.AND,
        conditions: [
          { key: 'contentId', value: ['c1', 'c2'], operator: SearchConditionOperator.NOT_IN },
        ],
      };
      const pagination: PaginationOption<ProjectObject> = { page: 1, limit: 10 };
      await db.search(condition, pagination);

      expect(ddbMock.commandCalls(ScanCommand)).toHaveLength(1);
      const scanCall = ddbMock.commandCalls(ScanCommand)[0];
      expect(scanCall.args[0].input.FilterExpression).toContain('NOT');
      expect(scanCall.args[0].input.FilterExpression).toContain('IN');
    });

    it('should handle comparison operators', async () => {
      ddbMock.on(ScanCommand).resolves({
        Items: [{ ...obj3, pk: 'p2', sk: 'typeB#c3#2' }]
      });

      // Test GREATER_THAN
      const gtCondition: SearchOption<ProjectObject> = {
        logic: SearchLogicalOperator.AND,
        conditions: [
          { key: 'version', value: 1, operator: SearchConditionOperator.GREATER_THAN },
        ],
      };
      await db.search(gtCondition, { page: 1, limit: 10 });

      // Test LESS_THAN_OR_EQUAL  
      const lteCondition: SearchOption<ProjectObject> = {
        logic: SearchLogicalOperator.AND,
        conditions: [
          { key: 'version', value: 2, operator: SearchConditionOperator.LESS_THAN_OR_EQUAL },
        ],
      };
      await db.search(lteCondition, { page: 1, limit: 10 });

      expect(ddbMock.commandCalls(ScanCommand)).toHaveLength(2);
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

      ddbMock.on(ScanCommand).resolves({
        Items: manyItems.slice(999, 1000) // Return the last item
      });

      const start = Date.now();
      const condition: SearchOption<ProjectObject> = {
        logic: SearchLogicalOperator.AND,
        conditions: [
          { key: 'projectId', value: 'pX', operator: SearchConditionOperator.EQUALS },
          { key: 'name', value: 'Name999', operator: SearchConditionOperator.EQUALS },
        ],
      };
      const pagination: PaginationOption<ProjectObject> = { page: 1, limit: 1 };
      const { results, total } = await db.search(condition, pagination);
      const duration = Date.now() - start;

      expect(total).toBe(1);
      expect(results[0].name).toBe('Name999');
      // Performance: should finish quickly since it's mocked
      expect(duration).toBeLessThan(100);
    });
  });
});