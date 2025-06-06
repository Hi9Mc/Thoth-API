/**
 * @jest-environment node
 */
import { MongoDbDatabaseService } from './MongoDbDatabaseService';
import { ProjectObject, SearchConditionOperator, SearchLogicalOperator, SearchOption, PaginationOption, SortDirection } from './IDatabaseService';
import { MongoClient, Db, Collection } from 'mongodb';
import '@jest/globals';
import 'jest';

// Mock MongoDB
jest.mock('mongodb', () => {
  const mockCollection = {
    insertOne: jest.fn(),
    replaceOne: jest.fn(),
    deleteOne: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    countDocuments: jest.fn(),
    drop: jest.fn()
  };

  const mockFind = {
    skip: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    sort: jest.fn().mockReturnThis(),
    toArray: jest.fn()
  };

  mockCollection.find.mockReturnValue(mockFind);

  const mockListCollections = {
    toArray: jest.fn().mockResolvedValue([
      { name: 'typeA' },
      { name: 'typeB' }
    ])
  };

  const mockDb = {
    collection: jest.fn().mockReturnValue(mockCollection),
    listCollections: jest.fn().mockReturnValue(mockListCollections),
    dropDatabase: jest.fn()
  };

  const mockClient = {
    db: jest.fn().mockReturnValue(mockDb),
    connect: jest.fn(),
    close: jest.fn()
  };

  return {
    MongoClient: jest.fn().mockImplementation(() => mockClient),
    Filter: {}
  };
});

describe('MongoDbDatabaseService', () => {
  let db: MongoDbDatabaseService<ProjectObject>;
  let mockCollection: any;
  let mockFind: any;
  let mockDb: any;
  
  const obj1: ProjectObject = { tenantId: 'p1', resourceType: 'typeA', resourceId: 'c1', version: 1, name: 'Alpha' };
  const obj2: ProjectObject = { tenantId: 'p1', resourceType: 'typeA', resourceId: 'c2', version: 1, name: 'Beta' };
  const obj3: ProjectObject = { tenantId: 'p2', resourceType: 'typeB', resourceId: 'c3', version: 2, name: 'Gamma' };

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();
    
    db = new MongoDbDatabaseService<ProjectObject>('mongodb://test', 'test-db');
    
    // Get mock instances
    const MockMongoClient = require('mongodb').MongoClient;
    const clientInstance = new MockMongoClient();
    mockDb = clientInstance.db();
    mockCollection = mockDb.collection();
    mockFind = mockCollection.find();
  });

  describe('create', () => {
    it('should create an object successfully', async () => {
      mockCollection.insertOne.mockResolvedValue({ insertedId: 'p1#typeA#c1#1' });

      const result = await db.create(obj1);

      expect(result).toEqual(obj1);
      expect(mockCollection.insertOne).toHaveBeenCalledWith({
        ...obj1,
        _id: 'p1#typeA#c1#1'
      });
    });

    it('should handle duplicate creation', async () => {
      mockCollection.insertOne.mockRejectedValue(new Error('Duplicate key error'));

      await expect(db.create(obj1)).rejects.toThrow('Duplicate key error');
    });
  });

  describe('getByKey', () => {
    it('should retrieve an object by key', async () => {
      mockCollection.findOne.mockResolvedValue({
        _id: 'p1#typeA#c1#1',
        ...obj1
      });

      const found = await db.getByKey('p1', 'typeA', 'c1', 1);
      expect(found).toEqual(obj1);
      expect(mockCollection.findOne).toHaveBeenCalledWith({ _id: 'p1#typeA#c1#1' });
    });

    it('should return null for non-existent object', async () => {
      mockCollection.findOne.mockResolvedValue(null);

      const result = await db.getByKey('p999', 'typeX', 'c999', 1);
      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    it('should update an existing object', async () => {
      // Mock getByKey call (internal call)
      mockCollection.findOne.mockResolvedValue({
        _id: 'p1#typeA#c1#1',
        ...obj1
      });
      
      mockCollection.replaceOne.mockResolvedValue({ modifiedCount: 1 });

      const updatedObj = { ...obj1, name: 'AlphaX' };
      const result = await db.update(updatedObj);

      expect(result).toEqual(updatedObj);
      expect(mockCollection.replaceOne).toHaveBeenCalledWith(
        { _id: 'p1#typeA#c1#1' },
        { ...updatedObj, _id: 'p1#typeA#c1#1' }
      );
    });

    it('should throw error when object not found', async () => {
      mockCollection.findOne.mockResolvedValue(null);

      const nonExistentObj: ProjectObject = { tenantId: 'p999', resourceType: 'typeX', resourceId: 'c999', version: 1, name: 'NonExistent' };
      
      await expect(db.update(nonExistentObj)).rejects.toThrow('Object not found');
    });
  });

  describe('delete', () => {
    it('should delete an existing object', async () => {
      mockCollection.deleteOne.mockResolvedValue({ deletedCount: 1 });

      const result = await db.delete('p1', 'typeA', 'c1', 1);
      expect(result).toBe(true);
      expect(mockCollection.deleteOne).toHaveBeenCalledWith({ _id: 'p1#typeA#c1#1' });
    });

    it('should return false when deleting non-existent object', async () => {
      mockCollection.deleteOne.mockResolvedValue({ deletedCount: 0 });

      const result = await db.delete('p999', 'typeX', 'c999', 1);
      expect(result).toBe(false);
    });
  });

  describe('search', () => {
    it('should search with AND condition', async () => {
      const mockDocuments = [
        { _id: 'p1#typeA#c1#1', ...obj1 },
        { _id: 'p1#typeA#c2#1', ...obj2 }
      ];
      
      mockCollection.countDocuments.mockResolvedValue(2);
      mockFind.toArray.mockResolvedValue(mockDocuments);

      const condition: SearchOption<ProjectObject> = {
        logic: SearchLogicalOperator.AND,
        conditions: [
          { key: 'tenantId', value: 'p1', operator: SearchConditionOperator.EQUALS },
          { key: 'resourceType', value: 'typeA', operator: SearchConditionOperator.EQUALS },
        ],
      };
      const pagination: PaginationOption<ProjectObject> = { page: 1, limit: 10 };
      const { results, total } = await db.search(condition, pagination);

      expect(total).toBe(2);
      expect(results).toEqual([obj1, obj2]);
      expect(mockCollection.find).toHaveBeenCalledWith({
        $and: [
          { tenantId: 'p1' },
          { resourceType: 'typeA' }
        ]
      });
    });

    it('should search with OR condition', async () => {
      const mockDocuments = [
        { _id: 'p1#typeA#c1#1', ...obj1 },
        { _id: 'p1#typeA#c2#1', ...obj2 }
      ];
      
      mockCollection.countDocuments.mockResolvedValue(2);
      mockFind.toArray.mockResolvedValue(mockDocuments);

      const condition: SearchOption<ProjectObject> = {
        logic: SearchLogicalOperator.AND,
        conditions: [
          { key: 'resourceType', value: 'typeA', operator: SearchConditionOperator.EQUALS },
          {
            logic: SearchLogicalOperator.OR,
            conditions: [
              { key: 'tenantId', value: 'p1', operator: SearchConditionOperator.EQUALS },
              { key: 'tenantId', value: 'p2', operator: SearchConditionOperator.EQUALS },
            ]
          }
        ],
      };
      const pagination: PaginationOption<ProjectObject> = { page: 1, limit: 10 };
      const { results, total } = await db.search(condition, pagination);
      
      expect(total).toBe(2);
      expect(results).toEqual([obj1, obj2]);
      expect(mockCollection.find).toHaveBeenCalledWith({
        $and: [
          { resourceType: 'typeA' },
          {
            $or: [
              { tenantId: 'p1' },
              { tenantId: 'p2' }
            ]
          }
        ]
      });
    });

    it('should handle pagination and sorting', async () => {
      const sortedDocs = [
        { _id: 'p1#typeA#c1#1', ...obj1 },
        { _id: 'p1#typeA#c2#1', ...obj2 }
      ];
      
      mockCollection.countDocuments.mockResolvedValue(2);
      mockFind.toArray.mockResolvedValue(sortedDocs);

      const condition: SearchOption<ProjectObject> = {
        logic: SearchLogicalOperator.AND,
        conditions: [
          { key: 'resourceType', value: 'typeA', operator: SearchConditionOperator.EQUALS },
          { key: 'tenantId', value: 'p1', operator: SearchConditionOperator.EQUALS },
        ],
      };
      const pagination: PaginationOption<ProjectObject> = { 
        page: 1, 
        limit: 2, 
        sortBy: 'name', 
        sortDirection: SortDirection.ASC 
      };
      const { results, total } = await db.search(condition, pagination);

      expect(total).toBe(2);
      expect(results.length).toBe(2);
      expect(mockFind.skip).toHaveBeenCalledWith(0);
      expect(mockFind.limit).toHaveBeenCalledWith(2);
      expect(mockFind.sort).toHaveBeenCalledWith({ name: 1 });
    });

    it('should handle default pagination values', async () => {
      mockCollection.countDocuments.mockResolvedValue(2);
      mockFind.toArray.mockResolvedValue([
        { _id: 'p1#typeA#c1#1', ...obj1 },
        { _id: 'p1#typeA#c2#1', ...obj2 }
      ]);

      const condition: SearchOption<ProjectObject> = {
        logic: SearchLogicalOperator.AND,
        conditions: [
          { key: 'tenantId', value: 'p1', operator: SearchConditionOperator.EQUALS },
        ]
      };
      const pagination: PaginationOption<ProjectObject> = {}; // No page/limit specified
      const { results, total } = await db.search(condition, pagination);

      expect(total).toBe(2);
      expect(results.length).toBe(2);
      expect(mockFind.skip).toHaveBeenCalledWith(0); // Default page 1
      expect(mockFind.limit).toHaveBeenCalledWith(20); // Default limit
    });

    it('should handle NOT_EQUALS operator', async () => {
      mockCollection.countDocuments.mockResolvedValue(2);
      mockFind.toArray.mockResolvedValue([
        { _id: 'p1#typeA#c2#1', ...obj2 },
        { _id: 'p2#typeB#c3#2', ...obj3 }
      ]);

      const condition: SearchOption<ProjectObject> = {
        logic: SearchLogicalOperator.AND,
        conditions: [
          { key: 'name', value: 'Alpha', operator: SearchConditionOperator.NOT_EQUALS },
        ],
      };
      const pagination: PaginationOption<ProjectObject> = { page: 1, limit: 10 };
      const { results, total } = await db.search(condition, pagination);

      expect(total).toBe(2);
      expect(results).toEqual([obj2, obj3]);
      expect(mockCollection.find).toHaveBeenCalledWith({
        $and: [{ name: { $ne: 'Alpha' } }]
      });
    });

    it('should handle LIKE operator', async () => {
      mockCollection.countDocuments.mockResolvedValue(1);
      mockFind.toArray.mockResolvedValue([{ _id: 'p1#typeA#c1#1', ...obj1 }]);

      const condition: SearchOption<ProjectObject> = {
        logic: SearchLogicalOperator.AND,
        conditions: [
          { key: 'name', value: 'lph', operator: SearchConditionOperator.LIKE },
        ],
      };
      const pagination: PaginationOption<ProjectObject> = { page: 1, limit: 10 };
      const { results, total } = await db.search(condition, pagination);

      expect(total).toBe(1);
      expect(results).toEqual([obj1]);
      expect(mockCollection.find).toHaveBeenCalledWith({
        $and: [{ name: { $regex: 'lph', $options: 'i' } }]
      });
    });

    it('should handle IN operator', async () => {
      mockCollection.countDocuments.mockResolvedValue(2);
      mockFind.toArray.mockResolvedValue([
        { _id: 'p1#typeA#c1#1', ...obj1 },
        { _id: 'p2#typeB#c3#2', ...obj3 }
      ]);

      const condition: SearchOption<ProjectObject> = {
        logic: SearchLogicalOperator.AND,
        conditions: [
          { key: 'name', value: ['Alpha', 'Gamma'], operator: SearchConditionOperator.IN },
        ],
      };
      const pagination: PaginationOption<ProjectObject> = { page: 1, limit: 10 };
      const { results, total } = await db.search(condition, pagination);

      expect(total).toBe(2);
      expect(results).toEqual([obj1, obj3]);
      expect(mockCollection.find).toHaveBeenCalledWith({
        $and: [{ name: { $in: ['Alpha', 'Gamma'] } }]
      });
    });

    it('should handle BETWEEN operator', async () => {
      mockCollection.countDocuments.mockResolvedValue(3);
      mockFind.toArray.mockResolvedValue([
        { _id: 'p1#typeA#c1#1', ...obj1 },
        { _id: 'p1#typeA#c2#1', ...obj2 },
        { _id: 'p2#typeB#c3#2', ...obj3 }
      ]);

      const condition: SearchOption<ProjectObject> = {
        logic: SearchLogicalOperator.AND,
        conditions: [
          { key: 'version', value: [1, 2], operator: SearchConditionOperator.BETWEEN },
        ],
      };
      const pagination: PaginationOption<ProjectObject> = { page: 1, limit: 10 };
      const { results, total } = await db.search(condition, pagination);

      expect(total).toBe(3);
      expect(results).toEqual([obj1, obj2, obj3]);
      expect(mockCollection.find).toHaveBeenCalledWith({
        $and: [{ version: { $gte: 1, $lte: 2 } }]
      });
    });

    it('should handle empty search conditions', async () => {
      mockCollection.countDocuments.mockResolvedValue(3);
      mockFind.toArray.mockResolvedValue([
        { _id: 'p1#typeA#c1#1', ...obj1 },
        { _id: 'p1#typeA#c2#1', ...obj2 },
        { _id: 'p2#typeB#c3#2', ...obj3 }
      ]);

      const condition: SearchOption<ProjectObject> = {
        logic: SearchLogicalOperator.AND,
        conditions: []
      };
      const pagination: PaginationOption<ProjectObject> = { page: 1, limit: 10 };
      const { results, total } = await db.search(condition, pagination);

      expect(total).toBe(3);
      expect(results.length).toBe(3);
      expect(mockCollection.find).toHaveBeenCalledWith({});
    });
  });

  describe('exists', () => {
    it('should return true for existing items', async () => {
      mockCollection.findOne.mockResolvedValue({ _id: 'some-id', ...obj1 });

      const condition: SearchOption<ProjectObject> = {
        logic: SearchLogicalOperator.AND,
        conditions: [
          { key: 'tenantId', value: 'p1', operator: SearchConditionOperator.EQUALS },
        ],
      };

      const result = await db.exists(condition);

      expect(result).toBe(true);
    });

    it('should return false for non-existing items', async () => {
      mockCollection.findOne.mockResolvedValue(null);

      const condition: SearchOption<ProjectObject> = {
        logic: SearchLogicalOperator.AND,
        conditions: [
          { key: 'tenantId', value: 'nonexistent', operator: SearchConditionOperator.EQUALS },
        ],
      };

      const result = await db.exists(condition);

      expect(result).toBe(false);
    });
  });

  describe('count', () => {
    it('should return count of matching items', async () => {
      mockCollection.countDocuments.mockResolvedValue(2);

      const condition: SearchOption<ProjectObject> = {
        logic: SearchLogicalOperator.AND,
        conditions: [
          { key: 'tenantId', value: 'p1', operator: SearchConditionOperator.EQUALS },
        ],
      };

      const result = await db.count(condition);

      expect(result).toBe(2);
    });

    it('should return 0 for non-matching conditions', async () => {
      mockCollection.countDocuments.mockResolvedValue(0);

      const condition: SearchOption<ProjectObject> = {
        logic: SearchLogicalOperator.AND,
        conditions: [
          { key: 'tenantId', value: 'nonexistent', operator: SearchConditionOperator.EQUALS },
        ],
      };

      const result = await db.count(condition);

      expect(result).toBe(0);
    });
  });

  describe('singleton pattern', () => {
    it('should return same instance for getInstance', () => {
      const instance1 = MongoDbDatabaseService.getInstance();
      const instance2 = MongoDbDatabaseService.getInstance();

      expect(instance1).toBe(instance2);
    });

    it('should return project-specific instances for getInstanceByTenantId', () => {
      const instance1 = MongoDbDatabaseService.getInstanceByTenantId('project1');
      const instance2 = MongoDbDatabaseService.getInstanceByTenantId('project1');
      const instance3 = MongoDbDatabaseService.getInstanceByTenantId('project2');

      expect(instance1).toBe(instance2);
      expect(instance1).not.toBe(instance3);
    });
  });
});