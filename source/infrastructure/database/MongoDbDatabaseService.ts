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
import { MongoClient, Db, Collection, Filter, Document } from 'mongodb';

export class MongoDbDatabaseService<T extends ProjectObject = ProjectObject> implements IDatabaseService<T> {
  private client: MongoClient;
  private db: Db;
  private collection: Collection<T>;
  private connectionString: string;
  private databaseName: string;
  private collectionName: string;
  private static instances: Map<string, MongoDbDatabaseService<any>> = new Map();

  constructor(
    connectionString = 'mongodb://localhost:27017',
    databaseName = 'thoth',
    collectionName = 'objects'
  ) {
    this.connectionString = connectionString;
    this.databaseName = databaseName;
    this.collectionName = collectionName;
    this.client = new MongoClient(connectionString);
    this.db = this.client.db(databaseName);
    this.collection = this.db.collection<T>(collectionName);
  }

  static getInstance<T extends ProjectObject = ProjectObject>(): MongoDbDatabaseService<T> {
    const key = 'default';
    if (!this.instances.has(key)) {
      this.instances.set(key, new MongoDbDatabaseService());
    }
    return this.instances.get(key) as MongoDbDatabaseService<T>;
  }

  static getInstanceByTenantId<T extends ProjectObject = ProjectObject>(tenantId: string): MongoDbDatabaseService<T> {
    const key = `tenant_${tenantId}`;
    if (!this.instances.has(key)) {
      this.instances.set(key, new MongoDbDatabaseService(
        'mongodb://localhost:27017',
        'thoth',
        `objects_${tenantId}`
      ));
    }
    return this.instances.get(key) as MongoDbDatabaseService<T>;
  }

  private generateKey(tenantId: string, resourceType: string, resourceId: string, version: number): string {
    return `${tenantId}#${resourceType}#${resourceId}#${version}`;
  }

  async create(obj: T): Promise<T> {
    const _id = this.generateKey(obj.tenantId, obj.resourceType, obj.resourceId, obj.version);
    
    const document = {
      ...obj,
      _id
    };

    await this.collection.insertOne(document as any);
    return obj;
  }

  async update(obj: T): Promise<T> {
    const _id = this.generateKey(obj.tenantId, obj.resourceType, obj.resourceId, obj.version);
    
    // First check if the object exists
    const existing = await this.getByKey(obj.tenantId, obj.resourceType, obj.resourceId, obj.version);
    if (!existing) {
      throw new Error('Object not found');
    }

    const document = {
      ...obj,
      _id
    };

    await this.collection.replaceOne({ _id } as Filter<T>, document as any);
    return obj;
  }

  async delete(tenantId: string, resourceType: string, resourceId: string, version: number): Promise<boolean> {
    const _id = this.generateKey(tenantId, resourceType, resourceId, version);
    
    const result = await this.collection.deleteOne({ _id } as Filter<T>);
    return result.deletedCount > 0;
  }

  async getByKey(tenantId: string, resourceType: string, resourceId: string, version: number): Promise<T | null> {
    const _id = this.generateKey(tenantId, resourceType, resourceId, version);
    
    const result = await this.collection.findOne({ _id } as Filter<T>);
    if (!result) {
      return null;
    }

    // Remove MongoDB-specific _id field from the result
    const { _id: id, ...objectData } = result as any;
    return objectData as T;
  }

  async search(condition: SearchOption<T>, pagination: PaginationOption<T>): Promise<{ results: T[]; total: number }> {
    const filter = this.buildMongoFilter(condition);
    
    // Get total count
    const total = await this.collection.countDocuments(filter);
    
    // Build query with pagination
    const page = pagination.page ?? 1;
    const limit = pagination.limit ?? 20;
    const skip = (page - 1) * limit;
    
    let query = this.collection.find(filter).skip(skip).limit(limit);
    
    // Apply sorting if specified
    if (pagination.sortBy) {
      const sortDirection = pagination.sortDirection === 'DESC' ? -1 : 1;
      query = query.sort({ [pagination.sortBy as string]: sortDirection });
    }
    
    const documents = await query.toArray();
    
    // Remove MongoDB-specific _id field from results
    const results = documents.map(doc => {
      const { _id, ...objectData } = doc as any;
      return objectData as T;
    });

    return { results, total };
  }

  async exists(condition: SearchOption<T>): Promise<boolean> {
    const filter = this.buildMongoFilter(condition);
    const result = await this.collection.findOne(filter);
    return result !== null;
  }

  async count(condition: SearchOption<T>): Promise<number> {
    const filter = this.buildMongoFilter(condition);
    return await this.collection.countDocuments(filter);
  }

  private buildMongoFilter(condition: SearchOption<T>): Filter<T> {
    if (!condition.conditions.length) {
      return {};
    }

    const filters = condition.conditions.map(cond => {
      if ('key' in cond) {
        return this.buildConditionFilter(cond);
      } else {
        return this.buildMongoFilter(cond);
      }
    });

    if (condition.logic === SearchLogicalOperator.AND) {
      return { $and: filters } as Filter<T>;
    } else {
      return { $or: filters } as Filter<T>;
    }
  }

  private buildConditionFilter(param: SearchParameter<T>): Filter<T> {
    const key = param.key as string;
    const value = param.value;

    switch (param.operator) {
      case SearchConditionOperator.EQUALS:
        return { [key]: value } as Filter<T>;
      case SearchConditionOperator.NOT_EQUALS:
        return { [key]: { $ne: value } } as Filter<T>;
      case SearchConditionOperator.GREATER_THAN:
        return { [key]: { $gt: value } } as Filter<T>;
      case SearchConditionOperator.GREATER_THAN_OR_EQUAL:
        return { [key]: { $gte: value } } as Filter<T>;
      case SearchConditionOperator.LESS_THAN:
        return { [key]: { $lt: value } } as Filter<T>;
      case SearchConditionOperator.LESS_THAN_OR_EQUAL:
        return { [key]: { $lte: value } } as Filter<T>;
      case SearchConditionOperator.LIKE:
        return { [key]: { $regex: value, $options: 'i' } } as Filter<T>;
      case SearchConditionOperator.NOT_LIKE:
        return { [key]: { $not: { $regex: value, $options: 'i' } } } as Filter<T>;
      case SearchConditionOperator.IN:
        return { [key]: { $in: value } } as Filter<T>;
      case SearchConditionOperator.NOT_IN:
        return { [key]: { $nin: value } } as Filter<T>;
      case SearchConditionOperator.BETWEEN:
        if (Array.isArray(value) && value.length >= 2) {
          return { [key]: { $gte: value[0], $lte: value[1] } } as Filter<T>;
        }
        return {} as Filter<T>;
      default:
        return {} as Filter<T>;
    }
  }

  // Utility method to connect to MongoDB (for testing purposes)
  async connect(): Promise<void> {
    await this.client.connect();
  }

  // Utility method to disconnect from MongoDB (for testing cleanup)
  async disconnect(): Promise<void> {
    await this.client.close();
  }

  // Utility method to drop collection (for testing cleanup)
  async dropCollection(): Promise<void> {
    try {
      await this.collection.drop();
    } catch (error) {
      // Ignore errors if collection doesn't exist
    }
  }
}