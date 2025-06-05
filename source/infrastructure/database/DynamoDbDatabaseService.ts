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
import {
  DynamoDBClient,
  CreateTableCommand,
  DescribeTableCommand,
  DeleteTableCommand,
  ResourceNotFoundException
} from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  DeleteCommand,
  ScanCommand,
  QueryCommand,
  UpdateCommand
} from '@aws-sdk/lib-dynamodb';

export class DynamoDbDatabaseService<T extends ProjectObject = ProjectObject> implements IDatabaseService<T> {
  private client: DynamoDBClient;
  private docClient: DynamoDBDocumentClient;
  private tableName: string;
  private static instances: Map<string, DynamoDbDatabaseService> = new Map();

  constructor(tableName = 'ThothObjects', region = 'us-east-1') {
    this.tableName = tableName;
    this.client = new DynamoDBClient({ region });
    this.docClient = DynamoDBDocumentClient.from(this.client);
  }

  static getInstance<T extends ProjectObject = ProjectObject>(): DynamoDbDatabaseService<T> {
    const key = 'default';
    if (!this.instances.has(key)) {
      this.instances.set(key, new DynamoDbDatabaseService<T>());
    }
    return this.instances.get(key) as DynamoDbDatabaseService<T>;
  }

  static getInstanceByProjectId<T extends ProjectObject = ProjectObject>(projectId: string): DynamoDbDatabaseService<T> {
    const key = `project_${projectId}`;
    if (!this.instances.has(key)) {
      this.instances.set(key, new DynamoDbDatabaseService<T>(`ThothObjects_${projectId}`));
    }
    return this.instances.get(key) as DynamoDbDatabaseService<T>;
  }

  private generateKey(projectId: string, contentType: string, contentId: string, version: number): { pk: string; sk: string } {
    return {
      pk: projectId,
      sk: `${contentType}#${contentId}#${version}`
    };
  }

  async create(obj: T): Promise<T> {
    const { pk, sk } = this.generateKey(obj.projectId, obj.contentType, obj.contentId, obj.version);
    
    const item = {
      ...obj,
      pk,
      sk
    };

    const command = new PutCommand({
      TableName: this.tableName,
      Item: item
    });

    await this.docClient.send(command);
    return obj;
  }

  async update(obj: T): Promise<T> {
    const { pk, sk } = this.generateKey(obj.projectId, obj.contentType, obj.contentId, obj.version);
    
    // First check if the item exists
    const existing = await this.getByKey(obj.projectId, obj.contentType, obj.contentId, obj.version);
    if (!existing) {
      throw new Error('Object not found');
    }

    const item = {
      ...obj,
      pk,
      sk
    };

    const command = new PutCommand({
      TableName: this.tableName,
      Item: item
    });

    await this.docClient.send(command);
    return obj;
  }

  async delete(projectId: string, contentType: string, contentId: string, version: number): Promise<boolean> {
    const { pk, sk } = this.generateKey(projectId, contentType, contentId, version);

    const command = new DeleteCommand({
      TableName: this.tableName,
      Key: { pk, sk },
      ReturnValues: 'ALL_OLD'
    });

    const result = await this.docClient.send(command);
    return !!result.Attributes;
  }

  async getByKey(projectId: string, contentType: string, contentId: string, version: number): Promise<T | null> {
    const { pk, sk } = this.generateKey(projectId, contentType, contentId, version);

    const command = new GetCommand({
      TableName: this.tableName,
      Key: { pk, sk }
    });

    const result = await this.docClient.send(command);
    if (!result.Item) {
      return null;
    }

    const { pk: _, sk: __, ...item } = result.Item;
    return item as T;
  }

  async search(condition: SearchOption<T>, pagination: PaginationOption<T>): Promise<{ results: T[]; total: number }> {
    // For complex searches, we'll use scan operation
    // This could be optimized with better table design for specific query patterns
    
    const command = new ScanCommand({
      TableName: this.tableName,
      FilterExpression: this.buildFilterExpression(condition),
      ExpressionAttributeNames: this.buildExpressionAttributeNames(condition),
      ExpressionAttributeValues: this.buildExpressionAttributeValues(condition)
    });

    const result = await this.docClient.send(command);
    let items = (result.Items || []).map(item => {
      const { pk, sk, ...cleanItem } = item;
      return cleanItem as T;
    });

    // Apply sorting
    if (pagination.sortBy) {
      items = items.sort((a, b) => {
        const aVal = a[pagination.sortBy!];
        const bVal = b[pagination.sortBy!];
        if (aVal < bVal) return pagination.sortDirection === 'DESC' ? 1 : -1;
        if (aVal > bVal) return pagination.sortDirection === 'DESC' ? -1 : 1;
        return 0;
      });
    }

    const total = items.length;
    
    // Apply pagination
    const page = pagination.page ?? 1;
    const limit = pagination.limit ?? 20;
    const start = (page - 1) * limit;
    const results = items.slice(start, start + limit);

    return { results, total };
  }

  async exists(condition: SearchOption<T>): Promise<boolean> {
    const command = new ScanCommand({
      TableName: this.tableName,
      FilterExpression: this.buildFilterExpression(condition),
      ExpressionAttributeNames: this.buildExpressionAttributeNames(condition),
      ExpressionAttributeValues: this.buildExpressionAttributeValues(condition),
      Limit: 1
    });

    const result = await this.docClient.send(command);
    return (result.Items?.length || 0) > 0;
  }

  async count(condition: SearchOption<T>): Promise<number> {
    const command = new ScanCommand({
      TableName: this.tableName,
      FilterExpression: this.buildFilterExpression(condition),
      ExpressionAttributeNames: this.buildExpressionAttributeNames(condition),
      ExpressionAttributeValues: this.buildExpressionAttributeValues(condition),
      Select: 'COUNT'
    });

    const result = await this.docClient.send(command);
    return result.Count || 0;
  }

  private buildFilterExpression(condition: SearchOption<T>): string {
    if (!condition.conditions.length) return '';
    
    const expressions = condition.conditions.map((cond, index) => {
      if ('key' in cond) {
        return this.buildConditionExpression(cond, index);
      } else {
        return `(${this.buildFilterExpression(cond)})`;
      }
    });

    const operator = condition.logic === SearchLogicalOperator.AND ? ' AND ' : ' OR ';
    return expressions.join(operator);
  }

  private buildConditionExpression(param: SearchParameter<T>, index: number): string {
    const attrName = `#attr${index}`;
    const attrValue = `:val${index}`;
    
    switch (param.operator) {
      case SearchConditionOperator.EQUALS:
        return `${attrName} = ${attrValue}`;
      case SearchConditionOperator.NOT_EQUALS:
        return `${attrName} <> ${attrValue}`;
      case SearchConditionOperator.GREATER_THAN:
        return `${attrName} > ${attrValue}`;
      case SearchConditionOperator.GREATER_THAN_OR_EQUAL:
        return `${attrName} >= ${attrValue}`;
      case SearchConditionOperator.LESS_THAN:
        return `${attrName} < ${attrValue}`;
      case SearchConditionOperator.LESS_THAN_OR_EQUAL:
        return `${attrName} <= ${attrValue}`;
      case SearchConditionOperator.LIKE:
        return `contains(${attrName}, ${attrValue})`;
      case SearchConditionOperator.NOT_LIKE:
        return `NOT contains(${attrName}, ${attrValue})`;
      case SearchConditionOperator.IN:
        if (Array.isArray(param.value)) {
          const valueList = param.value.map((_, i) => `${attrValue}_${i}`).join(', ');
          return `${attrName} IN (${valueList})`;
        }
        return `${attrName} = ${attrValue}`;
      case SearchConditionOperator.NOT_IN:
        if (Array.isArray(param.value)) {
          const valueList = param.value.map((_, i) => `${attrValue}_${i}`).join(', ');
          return `NOT ${attrName} IN (${valueList})`;
        }
        return `${attrName} <> ${attrValue}`;
      case SearchConditionOperator.BETWEEN:
        return `${attrName} BETWEEN ${attrValue}_0 AND ${attrValue}_1`;
      default:
        return '';
    }
  }

  private buildExpressionAttributeNames(condition: SearchOption<T>): Record<string, string> {
    const names: Record<string, string> = {};
    this.collectAttributeNames(condition, names, 0);
    return names;
  }

  private collectAttributeNames(condition: SearchOption<T>, names: Record<string, string>, startIndex: number): number {
    let index = startIndex;
    for (const cond of condition.conditions) {
      if ('key' in cond) {
        names[`#attr${index}`] = String(cond.key);
        index++;
      } else {
        index = this.collectAttributeNames(cond, names, index);
      }
    }
    return index;
  }

  private buildExpressionAttributeValues(condition: SearchOption<T>): Record<string, any> {
    const values: Record<string, any> = {};
    this.collectAttributeValues(condition, values, 0);
    return values;
  }

  private collectAttributeValues(condition: SearchOption<T>, values: Record<string, any>, startIndex: number): number {
    let index = startIndex;
    for (const cond of condition.conditions) {
      if ('key' in cond) {
        if (cond.operator === SearchConditionOperator.IN || cond.operator === SearchConditionOperator.NOT_IN) {
          if (Array.isArray(cond.value)) {
            cond.value.forEach((val, i) => {
              values[`:val${index}_${i}`] = val;
            });
          } else {
            values[`:val${index}`] = cond.value;
          }
        } else if (cond.operator === SearchConditionOperator.BETWEEN) {
          if (Array.isArray(cond.value) && cond.value.length >= 2) {
            values[`:val${index}_0`] = cond.value[0];
            values[`:val${index}_1`] = cond.value[1];
          }
        } else {
          values[`:val${index}`] = cond.value;
        }
        index++;
      } else {
        index = this.collectAttributeValues(cond, values, index);
      }
    }
    return index;
  }

  // Utility method to create table if it doesn't exist (for testing purposes)
  async ensureTable(): Promise<void> {
    try {
      await this.client.send(new DescribeTableCommand({ TableName: this.tableName }));
    } catch (error) {
      if (error instanceof ResourceNotFoundException) {
        await this.createTable();
      } else {
        throw error;
      }
    }
  }

  private async createTable(): Promise<void> {
    const command = new CreateTableCommand({
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
      const describeResult = await this.client.send(new DescribeTableCommand({ TableName: this.tableName }));
      tableStatus = describeResult.Table?.TableStatus || '';
    }
  }

  // Utility method to delete table (for testing cleanup)
  async deleteTable(): Promise<void> {
    try {
      await this.client.send(new DeleteTableCommand({ TableName: this.tableName }));
    } catch (error) {
      if (!(error instanceof ResourceNotFoundException)) {
        throw error;
      }
    }
  }
}