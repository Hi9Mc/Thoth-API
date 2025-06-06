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
  private connectionString: string;
  private databaseName: string;
  private static instances: Map<string, MongoDbDatabaseService<any>> = new Map();

  constructor(
    connectionString = 'mongodb://localhost:27017',
    databaseName = 'thoth'
  ) {
    this.connectionString = connectionString;
    this.databaseName = databaseName;
    this.client = new MongoClient(connectionString);
    this.db = this.client.db(databaseName);
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
      const instance = new MongoDbDatabaseService(
        'mongodb://localhost:27017',
        tenantId
      );
      // Automatically ensure database connection is established (only in non-test environments)
      if (process.env.NODE_ENV !== 'test') {
        instance.ensureConnection().catch(error => {
          console.warn(`Failed to ensure connection for tenant ${tenantId}:`, error);
        });
      }
      this.instances.set(key, instance);
    }
    return this.instances.get(key) as MongoDbDatabaseService<T>;
  }

  private generateKey(tenantId: string, resourceType: string, resourceId: string): string {
    return `${tenantId}#${resourceType}#${resourceId}`;
  }

  private getCollection(resourceType: string): Collection<T> {
    return this.db.collection<T>(resourceType);
  }

  async create(obj: T): Promise<T> {
    // Only ensure connection in non-test environments
    if (process.env.NODE_ENV !== 'test') {
      await this.ensureConnection();
    }
    
    const _id = this.generateKey(obj.tenantId, obj.resourceType, obj.resourceId);
    const collection = this.getCollection(obj.resourceType);
    
    // Check if object already exists
    const existing = await collection.findOne({ _id } as Filter<T>);
    if (existing) {
      throw new Error('Object already exists');
    }
    
    // Set version to 1 for new objects
    const newObj = { ...obj, version: 1 } as T;
    
    const document = {
      ...newObj,
      _id
    };

    await collection.insertOne(document as any);
    return newObj;
  }

  async update(obj: T): Promise<T> {
    const _id = this.generateKey(obj.tenantId, obj.resourceType, obj.resourceId);
    const collection = this.getCollection(obj.resourceType);
    
    // First check if the object exists and get current version
    const existing = await collection.findOne({ _id } as Filter<T>);
    if (!existing) {
      throw new Error('Object not found');
    }

    // Extract current version
    const currentVersion = (existing as any).version;
    
    // Optimistic locking: check version
    if (obj.version !== currentVersion + 1) {
      throw new Error(`Version mismatch. Expected ${currentVersion + 1}, got ${obj.version}`);
    }

    const document = {
      ...obj,
      _id
    };

    await collection.replaceOne({ _id } as Filter<T>, document as any);
    return obj;
  }

  async delete(tenantId: string, resourceType: string, resourceId: string): Promise<boolean> {
    const _id = this.generateKey(tenantId, resourceType, resourceId);
    const collection = this.getCollection(resourceType);
    
    const result = await collection.deleteOne({ _id } as Filter<T>);
    return result.deletedCount > 0;
  }

  async getByKey(tenantId: string, resourceType: string, resourceId: string): Promise<T | null> {
    const _id = this.generateKey(tenantId, resourceType, resourceId);
    const collection = this.getCollection(resourceType);
    
    const result = await collection.findOne({ _id } as Filter<T>);
    if (!result) {
      return null;
    }

    // Remove MongoDB-specific _id field from the result
    const { _id: id, ...objectData } = result as any;
    return objectData as T;
  }

  async search(condition: SearchOption<T>, pagination: PaginationOption<T>): Promise<{ results: T[]; total: number }> {
    const filter = this.buildMongoFilter(condition);
    
    // Check if resourceType is specified in the search conditions
    const resourceType = this.extractResourceTypeFromCondition(condition);
    
    if (resourceType) {
      // Search in specific collection
      return this.searchInCollection(resourceType, filter, pagination);
    } else {
      // Search across all collections in the database
      return this.searchAcrossCollections(filter, pagination);
    }
  }

  private extractResourceTypeFromCondition(condition: SearchOption<T>): string | null {
    for (const cond of condition.conditions) {
      if ('key' in cond && cond.key === 'resourceType' && cond.operator === SearchConditionOperator.EQUALS) {
        return cond.value as string;
      } else if ('conditions' in cond) {
        const resourceType = this.extractResourceTypeFromCondition(cond);
        if (resourceType) return resourceType;
      }
    }
    return null;
  }

  private async searchInCollection(resourceType: string, filter: Filter<T>, pagination: PaginationOption<T>): Promise<{ results: T[]; total: number }> {
    const collection = this.getCollection(resourceType);
    
    // Get total count
    const total = await collection.countDocuments(filter);
    
    // Build query with pagination
    const page = pagination.page ?? 1;
    const limit = pagination.limit ?? 20;
    const skip = (page - 1) * limit;
    
    let query = collection.find(filter).skip(skip).limit(limit);
    
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

  private async searchAcrossCollections(filter: Filter<T>, pagination: PaginationOption<T>): Promise<{ results: T[]; total: number }> {
    // Get all collections in the database
    const collections = await this.db.listCollections().toArray();
    const allResults: T[] = [];
    let totalCount = 0;

    // Search in each collection
    for (const collectionInfo of collections) {
      const collection = this.db.collection<T>(collectionInfo.name);
      
      // Get count from this collection
      const count = await collection.countDocuments(filter);
      totalCount += count;
      
      // Get documents from this collection
      const documents = await collection.find(filter).toArray();
      const cleanedDocuments = documents.map(doc => {
        const { _id, ...objectData } = doc as any;
        return objectData as T;
      });
      
      allResults.push(...cleanedDocuments);
    }

    // Apply sorting if specified
    if (pagination.sortBy) {
      allResults.sort((a, b) => {
        const aVal = a[pagination.sortBy!];
        const bVal = b[pagination.sortBy!];
        if (aVal < bVal) return pagination.sortDirection === 'DESC' ? 1 : -1;
        if (aVal > bVal) return pagination.sortDirection === 'DESC' ? -1 : 1;
        return 0;
      });
    }

    // Apply pagination
    const page = pagination.page ?? 1;
    const limit = pagination.limit ?? 20;
    const start = (page - 1) * limit;
    const results = allResults.slice(start, start + limit);

    return { results, total: totalCount };
  }

  async exists(condition: SearchOption<T>): Promise<boolean> {
    const filter = this.buildMongoFilter(condition);
    const resourceType = this.extractResourceTypeFromCondition(condition);
    
    if (resourceType) {
      const collection = this.getCollection(resourceType);
      const result = await collection.findOne(filter);
      return result !== null;
    } else {
      // Check across all collections
      const collections = await this.db.listCollections().toArray();
      for (const collectionInfo of collections) {
        const collection = this.db.collection<T>(collectionInfo.name);
        const result = await collection.findOne(filter);
        if (result) return true;
      }
      return false;
    }
  }

  async count(condition: SearchOption<T>): Promise<number> {
    const filter = this.buildMongoFilter(condition);
    const resourceType = this.extractResourceTypeFromCondition(condition);
    
    if (resourceType) {
      const collection = this.getCollection(resourceType);
      return await collection.countDocuments(filter);
    } else {
      // Count across all collections
      const collections = await this.db.listCollections().toArray();
      let totalCount = 0;
      for (const collectionInfo of collections) {
        const collection = this.db.collection<T>(collectionInfo.name);
        const count = await collection.countDocuments(filter);
        totalCount += count;
      }
      return totalCount;
    }
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

  // Utility method to ensure connection is established
  async ensureConnection(): Promise<void> {
    try {
      await this.client.connect();
      // Ping the database to ensure connection is working
      await this.client.db('admin').admin().ping();
    } catch (error) {
      console.warn('Failed to establish database connection:', error);
      throw error;
    }
  }

  // Utility method to disconnect from MongoDB (for testing cleanup)
  async disconnect(): Promise<void> {
    await this.client.close();
  }

  // Utility method to drop collection (for testing cleanup)
  async dropCollection(resourceType?: string): Promise<void> {
    try {
      if (resourceType) {
        const collection = this.getCollection(resourceType);
        await collection.drop();
      } else {
        // Drop all collections in the database
        const collections = await this.db.listCollections().toArray();
        for (const collectionInfo of collections) {
          await this.db.collection(collectionInfo.name).drop();
        }
      }
    } catch (error) {
      // Ignore errors if collection doesn't exist
    }
  }

  // Utility method to drop entire database (for testing cleanup)
  async dropDatabase(): Promise<void> {
    try {
      await this.db.dropDatabase();
    } catch (error) {
      // Ignore errors if database doesn't exist
    }
  }
}